import BitReader from '../../../utils/bit-reader';
import PayloadReader from './payload-reader';
import Frame from '../../frame';

export default class AdtsReader extends PayloadReader {
    private static ADTS_HEADER_SIZE: number = 5;
    private static ADTS_SYNC_SIZE: number = 2;
    private static ADTS_CRC_SIZE: number = 2;

    private static STATE_FIND_SYNC: number = 1;
    private static STATE_READ_HEADER: number = 2;
    private static STATE_READ_FRAME: number = 3;

    public channels: number;
    public sampleRate: number;
    public frameDuration: number;
    public currentFrameSize: number;

    private ADTS_SAMPLE_RATES: number[] = [96000, 88200, 64000, 48000,
        44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
    private state: number;

    constructor () {
        super();
        this.channels = 0;
        this.sampleRate = 0;
        this.frameDuration = 0;
        this.currentFrameSize = 0;
        this.state = AdtsReader.STATE_FIND_SYNC;
    }

    public getMimeType(): string {
        return 'audio/mp4a-latm';
    }

    public getFormat(): string {
        return `Audio (AAC) - Sample Rate: ${this.sampleRate}, Channels: ${this.channels}`;
    }

    public getFirstPTS(): number {
        return this.firstTimestamp;
    }

    public getLastPTS(): number {
        return this.timeUs;
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
            if (this.state === AdtsReader.STATE_FIND_SYNC) {
                offset = this.findNextSync(offset);
                if (offset < this.dataBuffer.byteLength) {
                    this.state = AdtsReader.STATE_READ_HEADER;
                }
            } else if (this.state === AdtsReader.STATE_READ_HEADER) {
                if (this.dataBuffer.byteLength - offset < (AdtsReader.ADTS_HEADER_SIZE +
                    AdtsReader.ADTS_SYNC_SIZE)) {
                    break;
                }
                this.parseAACHeader(offset);
                this.state = AdtsReader.STATE_READ_FRAME;
            } else if (this.state === AdtsReader.STATE_READ_FRAME) {
                if ((this.dataBuffer.byteLength - offset) < (AdtsReader.ADTS_SYNC_SIZE +
                    AdtsReader.ADTS_HEADER_SIZE + this.currentFrameSize)) {
                    break;
                }
                offset += (AdtsReader.ADTS_SYNC_SIZE + AdtsReader.ADTS_HEADER_SIZE +
                    this.currentFrameSize);
                this.state = AdtsReader.STATE_FIND_SYNC;

                this.timeUs = this.timeUs + this.frameDuration;
                this.frames.push(new Frame('I', this.timeUs));
            }
        }

        this.dataBuffer = this.dataBuffer.subarray(offset);
    }

    private findNextSync(index: number): number {
        const limit: number = this.dataBuffer.byteLength - 1;

        for (let i: number = index; i < limit; i++) {
            const dataRead: number = (((this.dataBuffer[i]) << 8) | (this.dataBuffer[i + 1]));
            if ((dataRead & 0xfff6) === 0xfff0) {
                return i;
            }
        }

        return this.dataBuffer.byteLength;
    }

    private parseAACHeader(start: number): void {
        const aacHeaderParser: BitReader = new BitReader(this.dataBuffer.subarray(start,
            start + AdtsReader.ADTS_SYNC_SIZE + AdtsReader.ADTS_HEADER_SIZE));

        aacHeaderParser.skipBits(15);
        const hasCrc: boolean = !aacHeaderParser.readBool();
        aacHeaderParser.skipBits(2);
        const sampleRateIndex: number = aacHeaderParser.readBits(4);
        if (sampleRateIndex < this.ADTS_SAMPLE_RATES.length) {
            this.sampleRate = this.ADTS_SAMPLE_RATES[sampleRateIndex];
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
    }
}
