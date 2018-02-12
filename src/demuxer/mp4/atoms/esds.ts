import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class DecoderConfigDescriptor {
    constructor(public tag: number, public length: number,
        public audioObjectType: number, public samplingFrequencyIndex: number,
        public channelConfiguration: number) {
        }
}

export class DecoderConfig {
    constructor(public objectProfileIndication: number, public streamType: number,
        public bufferSize: number, public maxBitrate: number, public avgBitrate: number,
        public decoderConfigDescriptor: DecoderConfigDescriptor) {
        }
}

export class Esds extends Atom {
    public version: number;
    public flags: Uint8Array;
    public esId: number;
    public streamPriority: number;
    public decoderConfig: DecoderConfig;

    public static parse(data: Uint8Array): Atom {
        const esds: Esds = new Esds(Atom.esds, data.byteLength);

        esds.version = data[0];
        esds.flags = data.subarray(1, 4);
        esds.esId = ByteParserUtils.parseUint16(data, 6);
        esds.streamPriority = data[8] & 0x1f;
        esds.decoderConfig = new DecoderConfig(
            data[11],
            (data[12] >>> 2) & 0x3f,
            (data[13] << 16) | (data[14] << 8) | data[15],
            ByteParserUtils.parseUint32(data, 16),
            ByteParserUtils.parseUint32(data, 20),
            new DecoderConfigDescriptor(
                data[24],
                data[25],
                (data[26] >>> 3) & 0x1f,
                ((data[26] & 0x07) << 1) | ((data[27] >>> 7) & 0x01),
                (data[27] >>> 3) & 0x0f
            )
        );
        return esds;
    }
}
