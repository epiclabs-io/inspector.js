import { BitReader } from '../../utils/bit-reader';
import { mpegClockTimeToMicroSecs } from '../../utils/timescale';
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

    private lastDtsUs: number;

    constructor(public pid: number, public type: number) {
        this.pid = pid;
        this.type = type;
        this.lastDtsUs = -1;

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

        this.payloadReader.onData = this.onPayloadReaderData.bind(this);
    }

    public appendData(payloadUnitStartIndicator: boolean, packet: BitReader): void {
        if (payloadUnitStartIndicator) {
            if (this.payloadReader) {
                this.payloadReader.read(this.lastDtsUs);
            }
            this.parsePESHeader(packet);
        }

        if (this.payloadReader) {
            this.payloadReader.append(packet);
        }
    }

    public parsePESHeader(packet: BitReader): void {
        packet.skipBytes(7);


        const [dts, pts] = PESReader.readTimingInfo(packet);


        // Note: Using DTS here, not PTS, to avoid ordering issues.
        this.lastDtsUs = mpegClockTimeToMicroSecs(dts);
    }

    public reset(): void {
        if (this.payloadReader) {
            this.payloadReader.reset();
        }
    }

    public flush(): void {
        if (this.payloadReader) {
            this.payloadReader.flush(this.lastDtsUs);
        }
    }

    private onPayloadReaderData(data: Uint8Array) {

    }

    private static readTimingInfo(packet: BitReader): [number, number]  {
        /**
         * Thanks to Videojs/Muxjs for this bit, which does well the
         * trick around 32-bit unary bit-ops and 33 bit numbers :)
         * -> See https://github.com/videojs/mux.js/blob/87f777f718b264df69a063847fe0fb9b5e0aaa6c/lib/m2ts/m2ts.js#L333
         */
        // PTS and DTS are normally stored as a 33-bit number.  Javascript
        // performs all bitwise operations on 32-bit integers but javascript
        // supports a much greater range (52-bits) of integer using standard
        // mathematical operations.
        // We construct a 31-bit value using bitwise operators over the 31
        // most significant bits and then multiply by 4 (equal to a left-shift
        // of 2) before we add the final 2 least significant bits of the
        // timestamp (equal to an OR.)
        const ptsDtsFlags = packet.readByte();
        packet.skipBytes(1);
        let pts = NaN;
        let dts = NaN;
        if (ptsDtsFlags & 0xC0) {
            // the PTS and DTS are not written out directly. For information
            // on how they are encoded, see
            // http://dvd.sourceforge.net/dvdinfo/pes-hdr.html
            pts = (packet.readByte() & 0x0E) << 27 |
                (packet.readByte() & 0xFF) << 20 |
                (packet.readByte() & 0xFE) << 12 |
                (packet.readByte() & 0xFF) <<  5 |
                (packet.readByte() & 0xFE) >>>  3;
            pts *= 4; // Left shift by 2
            pts += (packet.readByte() & 0x06) >>> 1; // OR by the two LSBs
            dts = pts;
            if (ptsDtsFlags & 0x40) {
                let lastByte;
                dts = (packet.readByte() & 0x0E) << 27 |
                (packet.readByte() & 0xFF) << 20 |
                (packet.readByte() & 0xFE) << 12 |
                (packet.readByte() & 0xFF) << 5 |
                (lastByte = packet.readByte() & 0xFE) >>> 3;
                dts *= 4; // Left shift by 2
                dts += (lastByte & 0x06) >>> 1; // OR by the two LSBs
            }
        }
        return [dts, pts];
    }
}
