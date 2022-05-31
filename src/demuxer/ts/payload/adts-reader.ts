import { PayloadReader } from './payload-reader';
import { Track } from '../../track';
import { Frame } from '../../frame';
import { FRAME_TYPE } from '../../../codecs/h264/nal-units';

import { BitReader } from '../../../utils/bit-reader';
import { MICROSECOND_TIMESCALE, toSecondsFromMicros } from '../../../utils/timescale';
import { ADTS_CRC_SIZE, ADTS_HEADER_LEN, ADTS_SAMPLE_RATES } from './adts-consts';

enum AdtsReaderState {
    FIND_SYNC,
    READ_HEADER,
    READ_FRAME
}

export interface AdtsFrameInfo {
    profile: number;
    channels: number;
    sampleRate: number;
    headerLen: number;
    accessUnitSize: number;
    numFrames: number
}

export class AdtsReader extends PayloadReader {

    private state: AdtsReaderState = AdtsReaderState.FIND_SYNC;

    private currentFrame: AdtsFrameInfo | null = null;

    get currentFrameInfo(): AdtsFrameInfo | null {
        return this.currentFrame;
    }

    public getMimeType(): string {
        return Track.MIME_TYPE_AAC;
    }

    public read(pts: number): void {
        if (!this.dataBuffer) {
            return;
        }
        if (pts >= 0) {
            this.timeUs = pts;
        }

        if (this.firstTimestamp === -1) {
            this.firstTimestamp = this.timeUs;
        }

        let needMoreData = false;
        while (!needMoreData && this.dataOffset < this.dataBuffer.byteLength) {

            switch (this.state) {
            case AdtsReaderState.FIND_SYNC:
                needMoreData = ! this.findNextSync(); // returns true when sync found
                break;

            case AdtsReaderState.READ_HEADER:
                if (this.dataBuffer.byteLength - this.dataOffset < ADTS_HEADER_LEN) {
                    needMoreData = true;
                    break;
                }
                try {
                    this.parseHeader();
                } catch (err) {
                    // data pointers will be nulled by reset call, so we need to make string first
                    const errMsg = `Error parsing header at ${this.dataOffset}/${this.dataBuffer.byteLength} [B]; t=${toSecondsFromMicros(this.timeUs)} [s]; \nException: ${(err as Error).message}`;
                    // console.debug(this); // only for debug !!
                    this.reset();
                    this.state = AdtsReaderState.FIND_SYNC;
                    throw new Error(errMsg);
                }
                break;

            case AdtsReaderState.READ_FRAME:
                const { headerLen, accessUnitSize, sampleRate } = this.currentFrame;
                const frameDurationUs = (MICROSECOND_TIMESCALE * 1024) / sampleRate;
                if (this.dataBuffer.byteLength - this.dataOffset
                    < headerLen + accessUnitSize) {
                    needMoreData = true;
                    break;
                }

                this.frames.push(new Frame(
                    FRAME_TYPE.NONE,
                    this.timeUs,
                    accessUnitSize,
                    frameDurationUs,
                    this.dataOffset
                ));

                const frameDataStart = this.dataOffset + headerLen;
                const frameDataEnd = frameDataStart + accessUnitSize;
                const frameData = this.dataBuffer.subarray(frameDataStart, frameDataEnd);

                this.dataOffset = frameDataEnd;
                this.timeUs = this.timeUs + frameDurationUs;

                this.state = AdtsReaderState.FIND_SYNC;

                this.onData(frameData, this.timeUs);
                break;

            }
        }

        this.dataBuffer = this.dataBuffer.subarray(this.dataOffset);
        this.dataOffset = 0;
    }

    /**
     *
     * @returns
     * - true when found (post: state = READ_HEADER)
     * - false when more data needed (post: dataOffset = first byte after inclusive end of scan window)
     */
    private findNextSync(): boolean {
        const nextDataOffset: number = this.dataBuffer.byteLength - 1; // sync-word spans 2 bytes (12 bits)
        for (let i: number = this.dataOffset; i < nextDataOffset; i++) {
            const dataRead: number = ((this.dataBuffer[i]) << 8) | (this.dataBuffer[i + 1]);
            // 0b6 = 0110 mask to ignore the mpeg-version and CRC bit,
            // and assert check for layer bits to be zero
            /**
             * A 	12 	syncword 0xFFF, all bits must be 1
             * B 	1 	MPEG Version: 0 for MPEG-4, 1 for MPEG-2
             * C 	2 	Layer: always 0
             * D 	1 	protection absent, Warning, set to 1 if there is no CRC and 0 if there is CRC
             */
            if ((dataRead & 0xfff6) === 0xfff0) {
                this.dataOffset = i;
                if (this.dataOffset < this.dataBuffer.byteLength) {
                    this.state = AdtsReaderState.READ_HEADER;
                }
                return true;
            }
        }

        this.dataOffset = nextDataOffset;
        return false;
    }

    private parseHeader(): void {

        // first, clear current frame state. in case of exception during header parse,
        // it will keep null state, as we only set the frame after success.
        this.currentFrame = null;

        const br: BitReader = new BitReader(
            this.dataBuffer.subarray(this.dataOffset, this.dataBuffer.byteLength));

        br.skipBits(12);

        const mpegVersion: number = br.readBool() ? 1 : 0; // MPEG Version: 0 for MPEG-4, 1 for MPEG-2

        br.skipBits(2);

        const hasCrc: boolean = ! br.readBool();

        /**
         * 1: AAC Main
         * 2: AAC LC (Low Complexity)
         * 3: AAC SSR (Scalable Sample Rate)
         * 4: AAC LTP (Long Term Prediction)
         */
        // profile, the MPEG-4 Audio Object Type minus 1
        const audioCodecProfile = br.readBits(2) + 1;
        if (audioCodecProfile <= 0 || audioCodecProfile >= 5) {
            throw new Error(`Unsupported or likely invalid AAC profile (MPEG-4 Audio Object Type): ${audioCodecProfile}`);
        }
        const profile = audioCodecProfile;

        const sampleRateIndex: number = br.readBits(4);
        if (sampleRateIndex < 0 && sampleRateIndex >= ADTS_SAMPLE_RATES.length) {
            throw new Error(`Invalid AAC sampling-frequency index: ${sampleRateIndex}`);
        }
        const sampleRate = ADTS_SAMPLE_RATES[sampleRateIndex];

        // private bit (unused by spec)
        br.skipBits(1);

        const channelsConf = br.readBits(3);
        if (channelsConf <= 0 || channelsConf >= 8) {
            throw new Error(`Channel configuration invalid value: ${channelsConf}`);
        }
        const channels = channelsConf;

        // originality/home/copyright bits (ignoring)
        br.skipBits(4);

        const adtsFrameLen = br.readBits(13); // always including the header itself (w/ opt CRC 2 bytes)
        if (adtsFrameLen <= 0) {
            throw new Error(`Invalid ADTS-frame byte-length: ${adtsFrameLen}`);
        }

        const headerLen = hasCrc ? ADTS_HEADER_LEN + ADTS_CRC_SIZE : ADTS_HEADER_LEN;
        const accessUnitSize = adtsFrameLen - headerLen;

        // buffer fullness (ignoring so far, spec not clear about what it is really yet)
        br.skipBits(11);

        // 1 ADTS frame can contain up to 4 AAC frames
        const numFrames = br.readBits(2) + 1;
        if (numFrames <= 0) {
            throw new Error(`Invalid number of AAC frames for ADTS header: ${numFrames}`);
        }

        // FIXME: semantically our Frame info parsed represents potentially several AAC ones,
        // with the same container PTS value however (precision could be inferred from
        // sampling freq however).
        /*
        if (numFrames !== 1) {
            throw new Error(`Can not have AAC frame-number in ADTS header: ${numFrames} (only 1 is supported in this compatibility mode)`);
        }
        //*/

        this.currentFrame = {
            headerLen,
            accessUnitSize,
            channels,
            profile,
            sampleRate,
            numFrames
        };

        this.state = AdtsReaderState.READ_FRAME;
    }
}
