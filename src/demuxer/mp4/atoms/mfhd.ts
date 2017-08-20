import ByteParserUtils from '../../../utils/byte-parser-utils';
import {Atom} from './atom';

export class Mfhd extends Atom {
    public version: number;
    public flags: Uint8Array;
    public sequenceNumber: number;

    public static parse(data: Uint8Array): Atom {
        const mfhd: Mfhd = new Mfhd(Atom.mfhd, data.byteLength);
        mfhd.version = data[0];
        mfhd.flags = data.subarray(1, 4);
        mfhd.sequenceNumber = ByteParserUtils.parseUint32(data, 4);
        return mfhd;
    }
}
