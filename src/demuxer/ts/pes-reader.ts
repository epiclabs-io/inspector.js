import { BitReader } from '../../utils/bit-reader';

import { PayloadReader } from './payload/payload-reader';
import { UnknownReader } from './payload/unknown-reader';
import { AdtsReader } from './payload/adts-reader';
import { H264Reader } from './payload/h264-reader';
import { ID3Reader } from './payload/id3-reader';
import { MpegReader } from './payload/mpeg-reader';
import { parsePesHeaderOptionalFields } from './payload/pes-header';
import { mpegClockTimeToSecs } from '../../utils/timescale';

export enum MptsElementaryStreamType {
    TS_STREAM_TYPE_AAC = 0x0F,
    TS_STREAM_TYPE_H264 = 0x1B,
    TS_STREAM_TYPE_ID3 = 0x15,
    TS_STREAM_TYPE_MPA = 0x03,
    TS_STREAM_TYPE_MPA_LSF = 0x04,
    TS_STREAM_TYPE_METADATA = 0x15,
    TS_STREAM_TYPE_PACKETIZED_DATA = 0x06
}

const MP4_BASE_MEDIA_DTS_32BIT_RANGE = Math.pow(2, 32) - 1;

export class PESReader {

    public payloadReader: PayloadReader;

    private currentDts: number = NaN;
    private currentCto: number = NaN;

    constructor(public pid: number, public type: MptsElementaryStreamType,
        private _timeWrapOver32BitMp4Range: boolean) {

        switch(type) {
        case MptsElementaryStreamType.TS_STREAM_TYPE_AAC:
            this.payloadReader = new AdtsReader();
            break;
        case MptsElementaryStreamType.TS_STREAM_TYPE_H264:
            this.payloadReader = new H264Reader();
            break;
        case MptsElementaryStreamType.TS_STREAM_TYPE_ID3:
            this.payloadReader = new ID3Reader();
            break;
        case MptsElementaryStreamType.TS_STREAM_TYPE_MPA:
        case MptsElementaryStreamType.TS_STREAM_TYPE_MPA_LSF:
            this.payloadReader = new MpegReader();
            break;
        case MptsElementaryStreamType.TS_STREAM_TYPE_METADATA:
        case MptsElementaryStreamType.TS_STREAM_TYPE_PACKETIZED_DATA:
            break;
        default:
            this.payloadReader = new UnknownReader();
            break;
        }

        this.payloadReader.onData = this._handlePayloadReadData.bind(this);
    }

    public getStreamTypeName(): string {
        return MptsElementaryStreamType[this.type];
    }

    public reset(): void {
        this.payloadReader.reset();
    }

    public flush(): void {
        this.payloadReader.flush(this.currentDts, this.currentCto);
    }

    /**
     * Can be overriden instance-wise in userland as in "cheap and fast" event-target.
     */
    public onPayloadData(data: Uint8Array, dts: number, cto: number, naluType: number) {}

    /**
     * Expects a TS packet-reader aligned on its respective payload section.
     */
    public appendPacket(payloadUnitStartIndicator: boolean, packet: BitReader): void {
        // a packet with PUSI flag starts with a PES header.
        // reading it will update our internal DTS/CTO timing state to the current
        // payload unit ie frame(s) contained within.
        if (payloadUnitStartIndicator) {
            // Q: call read before (if data buffer is filled)
            // to take out timing alignment concern from payloadReader ?

            // post: dts/cto updated, packet-reader aligned to payload data section
            this._readHeader(packet);
        }
        // append to payload buffer (super-class generic method)
        this.payloadReader.append(packet, payloadUnitStartIndicator);
        // call the reader impl
        this.payloadReader.read(this.currentDts, this.currentCto);
    }

    private _readHeader(packet: BitReader): void {

        const readStartCode = packet.readBits(24) === 1;
        if (!readStartCode) {
            throw new Error(`No start-code found parsing PES header`);
        }
        const streamId = packet.readByte();
        const pesPacketLen = ((packet.readByte() << 8) | packet.readByte());

        // parses the optional header section.
        // reads the packet up to the data section in every case.
        let [dts, pts] = parsePesHeaderOptionalFields(packet);

        const cto = pts - dts;
        if (cto < 0) {
            throw new Error(`Computed CTO < 0 with DTS = ${dts} (${mpegClockTimeToSecs(dts)} [s]) / PTS = ${pts} (${mpegClockTimeToSecs(pts)} [s])`);
        }

        this.currentDts = this._timeWrapOver32BitMp4Range ? dts % MP4_BASE_MEDIA_DTS_32BIT_RANGE : dts;
        this.currentCto = cto;
    }

    private _handlePayloadReadData(data: Uint8Array, dts: number, cto: number, naluType: number = NaN) {
        if (!this.payloadReader.frames.length) return;

        this.onPayloadData(data, dts, cto, naluType);
    }
}
