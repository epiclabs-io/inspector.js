import { BitReader } from '../../utils/bit-reader';

import { PayloadReader } from './payload/payload-reader';
import { UnknownReader } from './payload/unknown-reader';
import { AdtsReader } from './payload/adts-reader';
import { H264Reader } from './payload/h264-reader';
import { ID3Reader } from './payload/id3-reader';
import { MpegReader } from './payload/mpeg-reader';
import { parsePesHeader } from './payload/pes-header';

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

    private currentDts: number = NaN;
    private currentCto: number = NaN;

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

    public getStreamTypeName(): string {
        return MptsElementaryStreamType[this.type];
    }

    public onPayloadData(data: Uint8Array, dts: number, cto: number, naluType: number) {}

    public appendData(payloadUnitStartIndicator: boolean, packet: BitReader): void {
        if (payloadUnitStartIndicator) {
            this.readHeader(packet);
        }
        this.payloadReader.append(packet, payloadUnitStartIndicator);
        this.payloadReader.read(this.currentDts, this.currentCto);
    }

    public reset(): void {
        this.payloadReader.reset();
    }

    public flush(): void {
        this.payloadReader.flush(this.currentDts, this.currentCto);
    }

    private readHeader(packet: BitReader): void {

        const readStartCode = packet.readBits(24) === 1;
        if (!readStartCode) {
            throw new Error(`No start-code found parsing PES header`);
        }
        const streamId = packet.readByte();
        const pesPacketLen = ((packet.readByte() << 8) | packet.readByte());

        const [dts, pts] = parsePesHeader(packet);

        this.currentDts = dts;
        this.currentCto = pts - dts;
    }

    private handlePayloadReadData(data: Uint8Array, dts: number, cto: number, naluType: number = NaN) {
        if (!this.payloadReader.frames.length) return;

        this.onPayloadData(data, dts, cto, naluType);
    }
}
