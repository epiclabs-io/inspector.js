import { BitReader } from '../../utils/bit-reader';
import { PayloadReader } from './payload/payload-reader';
import { UnknownReader } from './payload/unknown-reader';
import { AdtsReader } from './payload/adts-reader';
import { H264Reader } from './payload/h264-reader';
import { ID3Reader } from './payload/id3-reader';
import { MpegReader } from './payload/mpeg-reader';

export class PESReader {
    public static TS_STREAM_TYPE_AAC: number = 0x0F;
    public static TS_STREAM_TYPE_H264: number = 0x1B;
    public static TS_STREAM_TYPE_ID3: number = 0x15;
    public static TS_STREAM_TYPE_MPA: number = 0x03;
    public static TS_STREAM_TYPE_MPA_LSF: number = 0x04;
    public static TS_STREAM_TYPE_METADATA: number = 0x06;

    public payloadReader: PayloadReader;

    private lastPtsUs: number;
    private pesLength: number;

    constructor(public pid: number, public type: number) {
        this.pid = pid;
        this.type = type;
        this.lastPtsUs = -1;
        this.pesLength = 0;

        if (type === PESReader.TS_STREAM_TYPE_AAC) {
            this.payloadReader = new AdtsReader();
        } else if (type === PESReader.TS_STREAM_TYPE_H264) {
            this.payloadReader = new H264Reader();
        } else if (type === PESReader.TS_STREAM_TYPE_ID3) {
            this.payloadReader = new ID3Reader();
        } else if (type === PESReader.TS_STREAM_TYPE_MPA || type === PESReader.TS_STREAM_TYPE_MPA_LSF) {
            this.payloadReader = new MpegReader();
        } else if (type === PESReader.TS_STREAM_TYPE_METADATA) {
            // do nothing
        } else {
            this.payloadReader = new UnknownReader();
        }
    }

    public static ptsToTimeUs(pts: number): number {
        return (pts * 1000000) / 90000;
    }

    public appendData(payloadUnitStartIndicator: boolean, packet: BitReader): void {
        if (payloadUnitStartIndicator) {
            if (this.payloadReader) {
                this.payloadReader.consumeData(this.lastPtsUs);
            }
            this.parsePESHeader(packet);
        }

        if (this.payloadReader) {
            this.payloadReader.append(packet);
        }
    }

    public parsePESHeader(packet: BitReader): void {
        packet.skipBytes(7);
        const timingFlags: number = packet.readByte();
        if (timingFlags & 0xC0) {
            packet.skipBytes(1);
            let pts: number;
            pts = (packet.readByte() & 0x0E) << 27 |
                (packet.readByte() & 0xFF) << 20 |
                (packet.readByte() & 0xFE) << 12 |
                (packet.readByte() & 0xFF) << 5;
            const val: number = packet.readByte();
            pts |= (val & 0xFE) >>> 3;
            pts = pts << 2;
            pts += (val & 0x06) >>> 1;
            this.lastPtsUs = PESReader.ptsToTimeUs(pts);
        }
    }

    public reset(): void {
        if (this.payloadReader) {
            this.payloadReader.reset();
        }
    }

    public flush(): void {
        if (this.payloadReader) {
            this.payloadReader.flush(this.lastPtsUs);
        }
    }
}
