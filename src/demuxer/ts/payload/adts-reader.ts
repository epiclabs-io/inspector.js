import { BitReader } from '../../../utils/bit-reader';
import { PayloadReader } from './payload-reader';
import { Frame } from '../../frame';
import { Track } from '../../track';

enum State {
    FIND_SYNC = 1,
    READ_HEADER = 2,
    READ_FRAME = 3
}

export class AdtsReader extends PayloadReader {
    private static ADTS_HEADER_SIZE: number = 5;
    private static ADTS_SYNC_SIZE: number = 2;
    private static ADTS_CRC_SIZE: number = 2;

    private static ADTS_SAMPLE_RATES: number[] = [96000, 88200, 64000, 48000,
        44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

    public channels: number;
    public sampleRate: number;
    public frameDuration: number;
    public currentFrameSize: number;

    private state: State;

    constructor () {
        super();
        this.channels = 0;
        this.sampleRate = 0;
        this.frameDuration = 0;
        this.currentFrameSize = 0;
        this.state = State.FIND_SYNC;
        this.dataOffset = 0;
    }

    public getMimeType(): string {
        return Track.MIME_TYPE_AAC;
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
            if (this.state === State.FIND_SYNC) {
                this.findNextSync();
            } else if (this.state === State.READ_HEADER) {
                if (this.dataBuffer.byteLength - this.dataOffset < (AdtsReader.ADTS_HEADER_SIZE +
                    AdtsReader.ADTS_SYNC_SIZE)) {
                    break;
                }
                this.parseAACHeader();
            } else if (this.state === State.READ_FRAME) {
                if ((this.dataBuffer.byteLength - this.dataOffset) < (AdtsReader.ADTS_SYNC_SIZE +
                    AdtsReader.ADTS_HEADER_SIZE + this.currentFrameSize)) {
                    break;
                }
                this.frames.push(new Frame(Frame.IDR_FRAME, this.timeUs, this.currentFrameSize));
                this.timeUs = this.timeUs + this.frameDuration;

                this.dataOffset += (AdtsReader.ADTS_SYNC_SIZE + AdtsReader.ADTS_HEADER_SIZE +
                    this.currentFrameSize);
                this.state = State.FIND_SYNC;
            }
        }

        this.dataBuffer = this.dataBuffer.subarray(this.dataOffset);
        this.dataOffset = 0;
    }

    private findNextSync(): void {
        const limit: number = this.dataBuffer.byteLength - 1;
        for (let i: number = this.dataOffset; i < limit; i++) {
            const dataRead: number = (((this.dataBuffer[i]) << 8) | (this.dataBuffer[i + 1]));
            if ((dataRead & 0xfff6) === 0xfff0) {
                this.dataOffset = i;
                if (this.dataOffset < this.dataBuffer.byteLength) {
                    this.state = State.READ_HEADER;
                }
                return;
            }
        }

        this.dataOffset = this.dataBuffer.byteLength;
    }

    private parseAACHeader(): void {
        const aacHeaderParser: BitReader = new BitReader(this.dataBuffer.subarray(this.dataOffset,
            this.dataOffset + AdtsReader.ADTS_SYNC_SIZE + AdtsReader.ADTS_HEADER_SIZE));

        aacHeaderParser.skipBits(15);
        const hasCrc: boolean = !aacHeaderParser.readBool();
        aacHeaderParser.skipBits(2);
        const sampleRateIndex: number = aacHeaderParser.readBits(4);
        if (sampleRateIndex < AdtsReader.ADTS_SAMPLE_RATES.length) {
            this.sampleRate = AdtsReader.ADTS_SAMPLE_RATES[sampleRateIndex];
        } else {
            this.sampleRate = sampleRateIndex;
        }

        this.frameDuration = (1000000 * 1024) / this.sampleRate;

        aacHeaderParser.skipBits(1);
        this.channels = aacHeaderParser.readBits(3);

        aacHeaderParser.skipBits(4);
        this.currentFrameSize = aacHeaderParser.readBits(13) - AdtsReader.ADTS_HEADER_SIZE
            - AdtsReader.ADTS_SYNC_SIZE;

        if (hasCrc) {
            this.currentFrameSize -= AdtsReader.ADTS_CRC_SIZE;
        }

        this.state = State.READ_FRAME;
    }
}
