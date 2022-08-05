import { BitReader } from '../../utils/bit-reader';

import { PayloadReader } from './payload/payload-reader';
import { UnknownReader } from './payload/unknown-reader';
import { AdtsReader } from './payload/adts-reader';
import { H264Reader } from './payload/h264-reader';
import { ID3Reader } from './payload/id3-reader';
import { MpegReader } from './payload/mpeg-reader';
import { parsePesHeaderOptionalFields } from './payload/pes-header';

export enum MptsElementaryStreamType {
    TS_STREAM_TYPE_AAC = 0x0F,
    TS_STREAM_TYPE_H264 = 0x1B,
    TS_STREAM_TYPE_ID3 = 0x15,
    TS_STREAM_TYPE_MPA = 0x03,
    TS_STREAM_TYPE_MPA_LSF = 0x04,
    TS_STREAM_TYPE_METADATA = 0x15,
    TS_STREAM_TYPE_PACKETIZED_DATA = 0x06
}

export class PESReader {

    public payloadReader: PayloadReader;

    private currentDts: number = NaN;
    private currentCto: number = NaN;

    constructor(public pid: number, public type: MptsElementaryStreamType) {

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
        const [dts, pts] = parsePesHeaderOptionalFields(packet);

        this.currentDts = dts;
        this.currentCto = pts - dts;
    }

    private _handlePayloadReadData(data: Uint8Array, dts: number, cto: number, naluType: number = NaN) {
        if (!this.payloadReader.frames.length) return;

        this.onPayloadData(data, dts, cto, naluType);
    }
}
