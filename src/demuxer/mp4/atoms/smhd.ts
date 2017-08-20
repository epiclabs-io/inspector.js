import ByteParserUtils from '../../../utils/byte-parser-utils';
import {Atom} from './atom';

export class Smhd extends Atom {
    public version: number;
    public flags: Uint8Array;
    public balance: number;

    public static parse(data: Uint8Array): Atom {
        const smhd: Smhd = new Smhd(Atom.smhd, data.byteLength);
        smhd.version = data[0];
        smhd.flags = data.subarray(1, 4);
        smhd.balance = data[4] + data[5] / 256;

        return smhd;
    }
}
