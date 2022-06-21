import { BitReader } from '../../utils/bit-reader';
import { mpegClockTimeToMicroSecs, MPEG_CLOCK_HZ, toSecondsFromMicros } from '../../utils/timescale';
import { PayloadReader } from './payload/payload-reader';
import { UnknownReader } from './payload/unknown-reader';
import { AdtsReader } from './payload/adts-reader';
import { H264Reader } from './payload/h264-reader';
import { ID3Reader } from './payload/id3-reader';
import { MpegReader } from './payload/mpeg-reader';
import { NAL_UNIT_TYPE } from '../../codecs/h264/nal-units';

function parsePesHeaderTimestamps(packet: BitReader): [number, number] {
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

export enum MptsElementaryStreamType {
    TS_STREAM_TYPE_AAC = 0x0F,
    TS_STREAM_TYPE_H264 = 0x1B,
    TS_STREAM_TYPE_ID3 = 0x15,
    TS_STREAM_TYPE_MPA = 0x03,
    TS_STREAM_TYPE_MPA_LSF = 0x04,
    TS_STREAM_TYPE_METADATA = 0x06
}

export class PESReader {

    public payloadReader: PayloadReader;

    // FIXME: use NaN instead of -1 !
    private lastDtsUs: number = -1; // TODO: migrate to integer/timescale values, causing FLOP-precision errors !!!
    private lastCtoUs: number = NaN;

    constructor(public pid: number, public type: MptsElementaryStreamType) {

        if (type === MptsElementaryStreamType.TS_STREAM_TYPE_AAC) {
            this.payloadReader = new AdtsReader();
        } else if (type === MptsElementaryStreamType.TS_STREAM_TYPE_H264) {
            this.payloadReader = new H264Reader();
        } else if (type === MptsElementaryStreamType.TS_STREAM_TYPE_ID3) {
            this.payloadReader = new ID3Reader();
        } else if (type === MptsElementaryStreamType.TS_STREAM_TYPE_MPA || type === MptsElementaryStreamType.TS_STREAM_TYPE_MPA_LSF) {
            this.payloadReader = new MpegReader();
        } else if (type === MptsElementaryStreamType.TS_STREAM_TYPE_METADATA) {
            this.payloadReader = new UnknownReader();
        } else {
            this.payloadReader = new UnknownReader();
        }

        this.payloadReader.onData = this.handlePayloadReadData.bind(this);
    }

    public onPayloadData(data: Uint8Array, timeUs: number, naluType: number) {}

    public appendData(payloadUnitStartIndicator: boolean, packet: BitReader): void {
        if (payloadUnitStartIndicator) {
            this.payloadReader.read(this.lastDtsUs);
            this.readHeader(packet);
        }
        this.payloadReader.append(packet, payloadUnitStartIndicator);
    }

    public reset(): void {
        this.payloadReader.reset();
    }

    public flush(): void {
        this.payloadReader.flush(this.lastDtsUs);
    }

    private readHeader(packet: BitReader): void {
        packet.skipBytes(7);

        const [dts, pts] = parsePesHeaderTimestamps(packet);


        // Note: Using DTS here, not PTS, to avoid ordering issues.
        this.lastDtsUs = mpegClockTimeToMicroSecs(dts);
        this.lastCtoUs = mpegClockTimeToMicroSecs(pts - dts);
    }

    private handlePayloadReadData(data: Uint8Array, timeUs: number, naluType: number = NaN) {
        if (!this.payloadReader.frames.length) return;
        const timeSecs = toSecondsFromMicros(timeUs);
        this.onPayloadData(data, timeUs, naluType);
    }
}
