import ByteParserUtils from '../../../utils/byte-parser-utils';
import { PayloadReader } from './payload-reader';
import { Frame } from '../../frame';

enum State {
    FIND_SYNC = 1,
    READ_HEADER = 2,
    READ_FRAME = 3
}

export class MpegReader extends PayloadReader {
    private static HEADER_SIZE: number = 4;

    private static SAMPLING_RATE_V1: number[] = [44100, 48000, 32000];
    private static BITRATE_V1_L1: number[] =
      [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448];
    private static BITRATE_V2_L1: number[] =
      [32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256];
    private static BITRATE_V1_L2: number[] =
      [32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384];
    private static BITRATE_V1_L3: number[] =
      [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    private static BITRATE_V2: number[] =
      [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    private static MIME_TYPE_BY_LAYER: string[] =
        ['mpeg-L1', 'mpeg-L2', 'mpeg'];

    public channels: number;
    public bitrate: number;
    public sampleRate: number;
    public samplesPerFrame: number;
    public currentFrameSize: number;
    public frameDuration: number;
    public mimeType: string;

    private state: State;

    constructor () {
        super();
        this.channels = 0;
        this.sampleRate = 0;
        this.samplesPerFrame = 0;
        this.currentFrameSize = 0;
        this.frameDuration = 0;
        this.mimeType = MpegReader.MIME_TYPE_BY_LAYER[2];
        this.state = State.FIND_SYNC;
        this.dataOffset = 0;
    }

    public getMimeType(): string {
        return 'audio/' + this.mimeType;
    }

    public consumeData(pts: number): void {
        if (!this.dataBuffer) {
            return;
        }
        if (pts >= 0) {
            this.timeUs = pts;
        }
        if (this.firstTimestamp === -1) {
            this.firstTimestamp = this.timeUs;
        }
        while (this.dataOffset < this.dataBuffer.byteLength) {
            if (this.state ===  State.FIND_SYNC) {
                this.findHeader();
            } else if (this.state === State.READ_HEADER) {
                if (!this.readHeader()) {
                    break;
                }
            } else if (this.state === State.READ_FRAME) {
                const len: number = this.readFrame();
                if (len === 0) {
                    break;
                }
                this.dataOffset += len;
            }
        }
        this.dataBuffer = this.dataBuffer.subarray(this.dataOffset);
        this.dataOffset = 0;
    }

    private findHeader(): void {
        const limit: number = this.dataBuffer.byteLength - 1;
        let lastByteWasFF: boolean = false;
        for (let i: number = this.dataOffset; i < limit; i++) {
            const isFF: boolean = ((this.dataBuffer[i]) & 0xFF) === 0XFF;
            const found: boolean = lastByteWasFF && ((this.dataBuffer[i] & 0xE0) === 0xE0);
            lastByteWasFF = isFF;

            if (found) {
                lastByteWasFF = false;
                this.state = State.READ_HEADER;
                this.dataOffset = i - 1;
                return;
            }
        }

        this.dataOffset = this.dataBuffer.byteLength;
    }

    private readHeader(): boolean {
        if (this.dataBuffer.byteLength - this.dataOffset < MpegReader.HEADER_SIZE) {
            return false;
        }

        const header: number = ByteParserUtils.parseUint32(this.dataBuffer, this.dataOffset);
        if (!this.parseHeader(header)) {
            this.state = State.FIND_SYNC;
            this.dataOffset++;
        } else {
            this.state = State.READ_FRAME;
        }
        return true;
    }

    private parseHeader(header: number): boolean {
        if ((header & 0xFFE00000) >>> 0 !== 0xFFE00000) {
            return false;
        }

        const version: number = (header >>> 19) & 3;
        if (version === 1) {
            return false;
        }

        const layer: number = (header >>> 17) & 3;
        if (layer === 0) {
            return false;
        }

        const bitrateIndex: number = (header >>> 12) & 15;
        const sampleRateIndex: number = (header >>> 10) & 3;
        if (sampleRateIndex >= MpegReader.SAMPLING_RATE_V1.length) {
            return false;
        }

        const sampleRate: number = MpegReader.SAMPLING_RATE_V1[sampleRateIndex];
        if (version === 2) {
            this.sampleRate = sampleRate / 2;
        } else if (version === 0) {
            this.sampleRate = sampleRate / 4;
        } else {
            this.sampleRate = sampleRate;
        }

        const padding: number = (header >>> 9) & 1;
        this.channels = ((header >> 6) & 3) === 3 ? 1 : 2;
        this.mimeType = MpegReader.MIME_TYPE_BY_LAYER[3 - layer];
        if (layer === 3) {
            this.bitrate = (version === 3) ? MpegReader.BITRATE_V1_L1[bitrateIndex - 1] :
                MpegReader.BITRATE_V2_L1[bitrateIndex - 1];
            this.samplesPerFrame = 384;
            this.currentFrameSize = Math.floor(this.samplesPerFrame * (this.bitrate * 1000 / 8) / this.sampleRate) + padding;
        } else {
            if (version === 3) {
                this.bitrate = (layer === 2) ? MpegReader.BITRATE_V1_L2[bitrateIndex - 1] :
                    MpegReader.BITRATE_V1_L3[bitrateIndex - 1];
                this.samplesPerFrame = 1152;
                this.currentFrameSize = Math.floor(this.samplesPerFrame * (this.bitrate * 1000 / 8) / this.sampleRate) + padding;
            } else {
                // Version 2 or 2.5.
                this.bitrate = MpegReader.BITRATE_V2[bitrateIndex - 1];
                this.samplesPerFrame = (layer === 1) ? 576 : 1152;
                this.currentFrameSize = Math.floor(this.samplesPerFrame * (this.bitrate * 1000 / 8) / this.sampleRate) + padding;
            }
        }
        this.frameDuration = (1000000 * this.samplesPerFrame) / this.sampleRate;

        return true;
    }

    private readFrame(): number {
        if ((this.dataBuffer.byteLength - this.dataOffset) < (MpegReader.HEADER_SIZE + this.currentFrameSize)) {
            return 0;
        }
        this.state = State.FIND_SYNC;
        this.frames.push(new Frame(Frame.IDR_FRAME, this.timeUs, this.currentFrameSize));
        this.timeUs = this.timeUs + this.frameDuration;
        return MpegReader.HEADER_SIZE + this.currentFrameSize;
    }
}
