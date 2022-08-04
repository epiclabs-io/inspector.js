import { PayloadReader } from './payload-reader';
import { Track } from '../../track';
import { Frame } from '../../frame';

import { BitReader } from '../../../utils/bit-reader';
import { MPEG_CLOCK_HZ } from '../../../utils/timescale';

import {
    AAC_FRAME_SAMPLES_NUM,
    ADTS_CRC_SIZE,
    ADTS_HEADER_LEN,
    ADTS_SAMPLE_RATES
} from './adts-consts';

import { FRAME_TYPE } from '../../../codecs/h264/nal-units';

enum AdtsReaderState {
    FIND_SYNC,
    READ_HEADER,
    READ_FRAME
}

const ADTS_HEADER_LEN_WITH_CRC = ADTS_HEADER_LEN + ADTS_CRC_SIZE;

export interface AdtsFrameInfo {
    aacObjectType: number;
    channels: number;
    sampleRate: number;
    headerLen: number;
    accessUnitSize: number;
    numFrames: number
}

export class AdtsReader extends PayloadReader {

    private _state: AdtsReaderState = AdtsReaderState.FIND_SYNC;

    private _currentFrame: AdtsFrameInfo | null = null;

    private _frameDtsOffset: number = 0;

    get currentFrameInfo(): AdtsFrameInfo | null {
        return this._currentFrame;
    }

    get currentSampleRate(): number {
        return this.currentFrameInfo?.sampleRate;
    }

    public getMimeType(): string {
        return Track.MIME_TYPE_AAC;
    }

    public read(dts: number): void {
        // it is expected after this check a dataBuffer exists
        if (!this.dataBuffer) {
            return;
            //throw new Error('read() should not be called without priorly data appended');
        }

        let needMoreData = false;
        while (!needMoreData && this.dataOffset < this.dataBuffer.byteLength) {

            // only update our clock upon next sync-word,
            // as we may get fed PUSI packets
            // with partially read prior timed frames in buffer.
            if (this._state === AdtsReaderState.FIND_SYNC) {
                // reset offset when PES timing updated
                if (this.dts !== dts) {
                    this._frameDtsOffset = 0;
                }
                this.setCurrentTime(dts, 0);
            }

            switch (this._state) {
            case AdtsReaderState.FIND_SYNC:
                // true when sync when
                if (this._findNextSync()) {
                    this._state = AdtsReaderState.READ_HEADER;
                } else {
                    needMoreData = true;
                }
                break;

            case AdtsReaderState.READ_HEADER:
                if (this.dataBuffer.byteLength - this.dataOffset
                    < ADTS_HEADER_LEN_WITH_CRC) { // assume longest possible header
                    needMoreData = true;
                    break;
                }
                try {
                    this._parseHeader();
                } catch (err) {
                    // data pointers will be nulled by reset call, so we need to make err string first
                    const errMsg = `Error parsing header at ${this.dataOffset}/${this.dataBuffer.byteLength} [B]; t=${JSON.stringify(this.getCurrentTime())} [s]; \nException: ${(err as Error).message}`;

                    this.reset();
                    this._state = AdtsReaderState.FIND_SYNC;
                    throw new Error(errMsg);
                }
                this._state = AdtsReaderState.READ_FRAME;
                break;

            case AdtsReaderState.READ_FRAME:
                const {
                    headerLen,
                    accessUnitSize,
                    sampleRate,
                    numFrames // AAC frames in ADTS payload
                } = this._currentFrame;

                if (this.dataBuffer.byteLength - this.dataOffset
                    < headerLen + accessUnitSize) {
                    needMoreData = true;
                    break;
                }

                let frameDtsAudioRate
                    = Math.round(sampleRate * this.dts / MPEG_CLOCK_HZ);
                frameDtsAudioRate += this._frameDtsOffset;

                // effective frame duration results in amount of AAC frames
                // contained by the current ADTS header (up to 4).
                const frameDuration = numFrames * AAC_FRAME_SAMPLES_NUM;
                this._frameDtsOffset += frameDuration;

                // actually using sample-rate accurate timebase
                this.frames.push(new Frame(
                    FRAME_TYPE.NONE,
                    frameDtsAudioRate,
                    0, // CTO actually always 0 with AAC
                    frameDuration,
                    accessUnitSize,
                    this.dataOffset
                ));

                const frameDataStart = this.dataOffset + headerLen;
                const frameDataEnd = frameDataStart + accessUnitSize;
                const frameData = this.dataBuffer.subarray(frameDataStart, frameDataEnd);

                this.dataOffset = frameDataEnd;

                // note: intentionally setting state before invoke external callback
                // that may have any unspecified side-effects or recursion.
                this._state = AdtsReaderState.FIND_SYNC;

                this.onData(frameData, frameDtsAudioRate, 0);
                break;
            }
        }

        // prune buffer to remaining data
        this.dataBuffer = this.dataBuffer.subarray(this.dataOffset);
        this.dataOffset = 0;
    }

    /**
     *
     * @returns
     * - true when found (post: state = READ_HEADER)
     * - false when more data needed (post: dataOffset = first byte after inclusive end of scan window)
     */
    private _findNextSync(): boolean {

        // sync-word spans 2 bytes (12 bits)
        if (this.dataBuffer.byteLength - this.dataOffset <= 1) return false;

        // nextDataOffset should be be > 1, ensured by above check
        const nextDataOffset: number = this.dataBuffer.byteLength - 1;

        // we iterate until the second-last byte only, as we need to access i+1.
        // cond is false if buffer byteLength = 1 also (guarded from that case early
        // as it is expected further below nextDataOffset >= 0).
        for (let i: number = this.dataOffset; i < nextDataOffset; i++) {

            const wordData: number = ((this.dataBuffer[i]) << 8) | (this.dataBuffer[i + 1]);

            /**
             * A 	12 	syncword 0xFFF, all bits must be 1
             * B 	1 	MPEG Version: 0 for MPEG-4, 1 for MPEG-2
             * C 	2 	Layer: always 0
             * D 	1 	protection absent, Warning, set to 1 if there is no CRC and 0 if there is CRC
             */
            // 0b6 = 0110 mask to ignore the mpeg-version and CRC bit,
            // and assert check for layer bits to be zero
            // (additional assertion with regard to broken packet data or misc parser errors).
            if ((wordData & 0xfff6) === 0xfff0) {
                this.dataOffset = i;
                return true;
            }

            // handle/notify lost sync ? (should only happen on broken packet)
        }

        // start further read at current second-last
        // attention: this assignment assumes nextDataOffset was computed
        // via a non-zero byteLength of read buffer, which we assert at top.
        this.dataOffset = nextDataOffset;
        return false;
    }

    private _parseHeader(): void {

        // first, clear current frame state. in case of exception during header parse,
        // it will keep null state, as we only set the frame after success.
        this._currentFrame = null;

        const reader: BitReader = new BitReader(
            this.dataBuffer.subarray(this.dataOffset, this.dataBuffer.byteLength));

        // skip sync-word
        reader.skipBits(12);

        const mpegVersion: number = reader.readBool() ? 1 : 0; // MPEG Version: 0 for MPEG-4, 1 for MPEG-2
        if (mpegVersion !== 0) {
            throw new Error(`Expected in header-data MPEG-version flag = 0 (only MP4-audio supported), but signals MPEG-2!`);
        }

        reader.skipBits(2);

        const hasCrc: boolean = ! reader.readBool();
        const headerLen = hasCrc ? ADTS_HEADER_LEN_WITH_CRC : ADTS_HEADER_LEN;

        /**
         * 1: AAC Main
         * 2: AAC LC (Low Complexity)
         * 3: AAC SSR (Scalable Sample Rate)
         * 4: AAC LTP (Long Term Prediction)
         */
        // profile, the MPEG-4 Audio Object Type minus 1
        const aacObjectType = reader.readBits(2) + 1; // bits value range 0-3
        if (aacObjectType <= 0 || aacObjectType >= 5) {
            throw new Error(`Unsupported or likely invalid AAC profile (MPEG-4 Audio Object Type): ${aacObjectType}`);
        }

        const sampleRateIndex: number = reader.readBits(4);
        if (sampleRateIndex < 0 || sampleRateIndex >= ADTS_SAMPLE_RATES.length) {
            throw new Error(`Invalid AAC sampling-frequency index: ${sampleRateIndex}`);
        }
        const sampleRate = ADTS_SAMPLE_RATES[sampleRateIndex];

        // private bit (unused by spec)
        reader.skipBits(1);

        const channelsConf = reader.readBits(3);
        if (channelsConf <= 0 || channelsConf >= 8) {
            throw new Error(`Channel configuration invalid value: ${channelsConf}`);
        }
        const channels = channelsConf;

        // originality/home/copyright bits (ignoring)
        reader.skipBits(4);

        // ADTS frame len including the header itself (also opt CRC 2 bytes).
        const adtsFrameLen = reader.readBits(13);

        if (adtsFrameLen <= 0) {
            throw new Error(`Invalid ADTS-frame byte-length: ${adtsFrameLen}`);
        }

        const accessUnitSize = adtsFrameLen - headerLen;

        // Buffer fullness, states the bit-reservoir per frame.
        reader.skipBits(11);

        // Number of AAC frames (RDBs (Raw Data Blocks)) in ADTS frame minus 1.
        // 1 ADTS frame can contain up to 4 AAC frames
        const numFrames = reader.readBits(2) + 1;
        if (numFrames <= 0) {
            throw new Error(`Invalid number of AAC frames for ADTS header: ${numFrames}`);
        }

        this._currentFrame = {
            headerLen,
            accessUnitSize,
            channels,
            aacObjectType,
            sampleRate,
            numFrames
        };
    }
}
