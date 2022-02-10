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
    private static ADTS_HEADER_SIZE: number = 5;
    private static ADTS_SYNC_SIZE: number = 2;
    private static ADTS_SYNC_AND_HEADER_LEN = AdtsReader.ADTS_HEADER_SIZE + AdtsReader.ADTS_SYNC_SIZE;

    private static ADTS_CRC_SIZE: number = 2;

    private static ADTS_SAMPLE_RATES: number[] = [96000, 88200, 64000, 48000,
        44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

    public channels: number = 0;
    public sampleRate: number = 0;
    public frameDuration: number = 0;
    public currentPayloadUnitLen: number = 0;

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

        while (this.dataOffset < this.dataBuffer.byteLength) {
            if (this.state === AdtsReaderState.FIND_SYNC) {
                this.findNextSync();
            } else if (this.state === AdtsReaderState.READ_HEADER) {
                if (this.dataBuffer.byteLength - this.dataOffset
                    < AdtsReader.ADTS_SYNC_AND_HEADER_LEN) {
                    break;
                }
                this.parseAACHeader();
            } else if (this.state === AdtsReaderState.READ_FRAME) {
                if (this.dataBuffer.byteLength - this.dataOffset
                    < this.currentPayloadUnitLen) {
                    break;
                }

                this.frames.push(new Frame(
                    FRAME_TYPE.NONE,
                    this.timeUs,
                    this.currentPayloadUnitLen,
                    this.frameDuration,
                    this.dataOffset));

                this.onData(this.dataBuffer.subarray(
                    this.dataOffset + AdtsReader.ADTS_SYNC_AND_HEADER_LEN,
                    this.dataOffset + this.currentPayloadUnitLen),
                    this.timeUs);

                this.dataOffset += this.currentPayloadUnitLen;

                this.timeUs = this.timeUs + this.frameDuration;
                this.state = AdtsReaderState.FIND_SYNC;
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
                    this.state = AdtsReaderState.READ_HEADER;
                }
                return;
            }
        }

        this.dataOffset = this.dataBuffer.byteLength;
    }

    private parseAACHeader(): void {
        const aacHeaderParser: BitReader = new BitReader(
            this.dataBuffer.subarray(
                this.dataOffset,
                this.dataOffset + AdtsReader.ADTS_SYNC_AND_HEADER_LEN));

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

        this.currentPayloadUnitLen = aacHeaderParser.readBits(13);

        if (hasCrc) {
            this.currentPayloadUnitLen -= AdtsReader.ADTS_CRC_SIZE;
        }

        this.state = AdtsReaderState.READ_FRAME;
    }
}
