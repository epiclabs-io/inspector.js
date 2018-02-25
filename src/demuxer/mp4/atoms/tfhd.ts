import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Tfhd extends Atom {
    public version: number;
    public flags: Uint8Array;
    public trackId: number;
    public baseDataOffset: number;
    public sampleDescriptionIndex: number;
    public defaultSampleDuration: number;
    public defaultSampleSize: number;
    public defaultSampleFlags: number;

    public static parse(data: Uint8Array): Atom {
        const tfhd: Tfhd = new Tfhd(Atom.tfhd, data.byteLength);
        tfhd.version = data[0];
        tfhd.flags = data.subarray(1, 4);

        const baseDataOffsetPresent: boolean = !!(tfhd.flags[2] & 0x01);
        const sampleDescriptionIndexPresent: boolean = !!(tfhd.flags[2] & 0x02);
        const defaultSampleDurationPresent: boolean = !!(tfhd.flags[2] & 0x08);
        const defaultSampleSizePresent: boolean = !!(tfhd.flags[2] & 0x10);
        const defaultSampleFlagsPresent: boolean = !!(tfhd.flags[2] & 0x20);

        let offset: number = 8;
        if (baseDataOffsetPresent) {
            tfhd.baseDataOffset = ByteParserUtils.parseLong64(data, 12);
            offset += 8;
        }
        if (sampleDescriptionIndexPresent) {
            tfhd.sampleDescriptionIndex = ByteParserUtils.parseUint32(data, offset);
            offset += 4;
        }
        if (defaultSampleDurationPresent) {
            tfhd.defaultSampleDuration = ByteParserUtils.parseUint32(data, offset);
            offset += 4;
        }
        if (defaultSampleSizePresent) {
            tfhd.defaultSampleSize = ByteParserUtils.parseUint32(data, offset);
            offset += 4;
        }
        if (defaultSampleFlagsPresent) {
            tfhd.defaultSampleFlags = ByteParserUtils.parseUint32(data, offset);
        }

        return tfhd;
    }
}
