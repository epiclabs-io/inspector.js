import { MICROSECOND_TIMESCALE } from '../../../utils/timescale';
import { BitReader } from '../../../utils/bit-reader';
import { PayloadReader } from './payload-reader';
import { Frame } from '../../frame';
import { Track } from '../../track';
import { FRAME_TYPE } from '../../../codecs/h264/nal-units';

enum AdtsReaderState {
    FIND_SYNC,
    READ_HEADER,
    READ_FRAME
}

export class AdtsReader extends PayloadReader {

    private static ADTS_HEADER_LEN = 7 as const;
    private static ADTS_CRC_SIZE: number = 2 as const;

    // TODO: use centralized table
    private static ADTS_SAMPLE_RATES: number[] = [
        96000,
        88200,
        64000,
        48000,
        44100,
        32000,
        24000,
        22050,
        16000,
        12000,
        11025,
        8000,
        7350
    ];

    public profile: number = NaN;
    public channels: number = NaN;
    public sampleRate: number = NaN;
    public frameDuration: number = NaN;
    public currentAdtsHeaderLen: number = NaN;
    public currentAccessUnitSize: number = NaN;

    private state: AdtsReaderState = AdtsReaderState.FIND_SYNC;

    constructor () {
        super();
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
                if (this.dataBuffer.byteLength - this.dataOffset < AdtsReader.ADTS_HEADER_LEN) {
                    needMoreData = true;
                    break;
                }
                try {
                    this.parseHeader();
                } catch (err) {
                    // data pointers will be nulled by reset call, so we need to make string first
                    const errMsg = `Error parsing header at ${this.dataOffset} / ${this.dataBuffer.byteLength}: ${(err as Error).message}`;
                    // console.debug(this); // only for debug !!
                    this.reset();
                    this.state = AdtsReaderState.FIND_SYNC;
                    throw new Error(errMsg);
                }
                break;

            case AdtsReaderState.READ_FRAME:
                if (this.dataBuffer.byteLength - this.dataOffset < this.currentAdtsHeaderLen + this.currentAccessUnitSize) {
                    needMoreData = true;
                    break;
                }

                this.frames.push(new Frame(
                    FRAME_TYPE.NONE,
                    this.timeUs,
                    this.currentAccessUnitSize,
                    this.frameDuration,
                    this.dataOffset));

                const frameDataStart = this.dataOffset + this.currentAdtsHeaderLen;
                const frameDataEnd = frameDataStart + this.currentAccessUnitSize;
                const frameData = this.dataBuffer.subarray(frameDataStart, frameDataEnd);

                this.dataOffset = frameDataEnd;
                this.timeUs = this.timeUs + this.frameDuration;

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
        this.profile = audioCodecProfile;

        const sampleRateIndex: number = br.readBits(4);
        if (sampleRateIndex < 0 && sampleRateIndex >= AdtsReader.ADTS_SAMPLE_RATES.length) {
            throw new Error(`Invalid AAC sampling-frequency index: ${sampleRateIndex}`);
        }
        this.sampleRate = AdtsReader.ADTS_SAMPLE_RATES[sampleRateIndex];
        this.frameDuration = (MICROSECOND_TIMESCALE * 1024) / this.sampleRate;

        // private bit (unused by spec)
        br.skipBits(1);

        const channelsConf = br.readBits(3);
        if (channelsConf <= 0 || channelsConf >= 8) {
            throw new Error(`Channel configuration invalid value: ${channelsConf}`);
        }
        this.channels = channelsConf;

        // originality/home/copyright bits (ignoring)
        br.skipBits(4);

        const adtsFrameLen = br.readBits(13); // always including the header itself (w/ opt CRC 2 bytes)
        if (adtsFrameLen <= 0) {
            throw new Error(`Invalid ADTS-frame byte-length: ${adtsFrameLen}`);
        }

        this.currentAdtsHeaderLen = hasCrc ?
            AdtsReader.ADTS_HEADER_LEN + AdtsReader.ADTS_CRC_SIZE
            : AdtsReader.ADTS_HEADER_LEN;
        this.currentAccessUnitSize = adtsFrameLen - this.currentAdtsHeaderLen;

        // buffer fullness (ignoring so far, spec not clear about what it is really yet)
        br.skipBits(11);

        // 1 ADTS frame can contain up to 4 AAC frames
        const nbOfAacFrames = br.readBits(2) + 1;
        if (nbOfAacFrames <= 0) {
            throw new Error(`Invalid AAC frame-number in ADTS header: ${nbOfAacFrames}`);
        }

        // FIXME: semantically our Frame info parsed represents potentially several AAC ones,
        // with the same container PTS value however (precision could be inferred from
        // sampling freq however).
        /*
        if (nbOfAacFrames !== 1) {
            throw new Error(`Can not have AAC frame-number in ADTS header: ${nbOfAacFrames} (only 1 is supported in this compatibility mode)`);
        }
        //*/

        this.state = AdtsReaderState.READ_FRAME;
    }
}
