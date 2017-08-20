import ByteParserUtils from '../../../utils/byte-parser-utils';
import PayloadReader from './payload-reader';
import Frame from '../../frame';

export default class MpegReader extends PayloadReader {
    private static STATE_FIND_SYNC: number = 1;
    private static STATE_READ_HEADER: number = 2;
    private static STATE_READ_FRAME: number = 3;

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

    private state: number;

    constructor () {
        super();
        this.channels = 0;
        this.sampleRate = 0;
        this.samplesPerFrame = 0;
        this.currentFrameSize = 0;
        this.frameDuration = 0;
        this.mimeType = MpegReader.MIME_TYPE_BY_LAYER[2];
        this.state = MpegReader.STATE_FIND_SYNC;
    }

    public getMimeType(): string {
        return 'audio/' + this.mimeType;
    }

    public getFormat(): string {
        return 'MPEG Audio (MP3)';
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

        let offset: number = 0;
        while (offset < this.dataBuffer.byteLength) {
            if (this.state ===  MpegReader.STATE_FIND_SYNC) {
                offset = this.findHeader(offset);
            } else if (this.state === MpegReader.STATE_READ_HEADER) {
                if (!this.readHeader(offset)) {
                    break;
                }
            } else if (this.state === MpegReader.STATE_READ_FRAME) {
                const len: number = this.readFrame(offset);
                if (len === 0) {
                    break;
                }
                offset += len;
            }
        }
        this.dataBuffer = this.dataBuffer.subarray(offset);
    }

    private findHeader(index: number): number {
        const limit: number = this.dataBuffer.byteLength - 1;

        let lastByteWasFF: boolean = false;
        for (let i: number = 0; i < limit; i++) {
            const isFF: boolean = ((this.dataBuffer[i]) & 0xFF) === 0XFF;
            const found: boolean = lastByteWasFF && ((this.dataBuffer[i] & 0xE0) === 0xE0);
            lastByteWasFF = isFF;

            if (found) {
                lastByteWasFF = false;
                this.state = MpegReader.STATE_READ_HEADER;
                return i - 1;
            }
        }

        return this.dataBuffer.byteLength;
    }

    private readHeader(index: number): void {
        if (this.dataBuffer.byteLength - index < MpegReader.HEADER_SIZE) {
            return;
        }

        const header: number = ByteParserUtils.parseUint32(this.dataBuffer, index);
        if (!this.parseHeader(header)) {
            this.state = MpegReader.STATE_FIND_SYNC;
        } else {
            this.state = MpegReader.STATE_READ_FRAME;
        }
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
            this.currentFrameSize = (12000 * this.bitrate / this.sampleRate + padding) * 4;
        } else {
            if (version === 3) {
                this.bitrate = (layer === 2) ? MpegReader.BITRATE_V1_L2[bitrateIndex - 1] :
                    MpegReader.BITRATE_V1_L3[bitrateIndex - 1];
                this.samplesPerFrame = 1152;
                this.currentFrameSize = 144000 * this.bitrate / this.sampleRate + padding;
            } else {
                // Version 2 or 2.5.
                this.bitrate = MpegReader.BITRATE_V2[bitrateIndex - 1];
                this.samplesPerFrame = (layer === 1) ? 576 : 1152;
                this.currentFrameSize = (layer === 1 ? 72000 : 144000) * this.bitrate / this.sampleRate + padding;
            }
        }
        this.frameDuration = (1000000 * this.samplesPerFrame) / this.sampleRate;

        console.log('Bitrate: ' + this.bitrate);
        console.log('samplesPerFrame: ' + this.samplesPerFrame);
        console.log('currentFrameSize: ' + this.currentFrameSize);
        console.log('sampleRate: ' + this.sampleRate);
        console.log('channels: ' + this.channels);
        return true;
    }

    private readFrame(index: number): number {
        if ((this.dataBuffer.byteLength - index) < (MpegReader.HEADER_SIZE + this.currentFrameSize)) {
            return 0;
        }

        this.state = MpegReader.STATE_FIND_SYNC;
        this.timeUs = this.timeUs + this.frameDuration;
        this.frames.push(new Frame('I', this.timeUs));
        return MpegReader.HEADER_SIZE + this.currentFrameSize;
    }
}
