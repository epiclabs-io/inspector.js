import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

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
            tfhd.baseDataOffset = Mp4ParserUtils.parseLong64(data, 12);
            offset += 8;
        }
        if (sampleDescriptionIndexPresent) {
            tfhd.sampleDescriptionIndex = Mp4ParserUtils.parseUint32(data, offset);
            offset += 4;
        }
        if (defaultSampleDurationPresent) {
            tfhd.defaultSampleDuration = Mp4ParserUtils.parseUint32(data, offset);
            offset += 4;
        }
        if (defaultSampleSizePresent) {
            tfhd.defaultSampleSize = Mp4ParserUtils.parseUint32(data, offset);
            offset += 4;
        }
        if (defaultSampleFlagsPresent) {
            tfhd.defaultSampleFlags = Mp4ParserUtils.parseUint32(data, offset);
        }

        return tfhd;
    }
}
