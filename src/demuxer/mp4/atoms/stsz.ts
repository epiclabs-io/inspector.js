import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Stsz extends Atom {
    public version: number;
    public flags: Uint8Array;
    public sampleSize: number;
    public entries: number[];

    public static parse(data: Uint8Array): Atom {
        const stsz: Stsz = new Stsz(Atom.stsz, data.byteLength);
        stsz.version = data[0];
        stsz.flags = data.subarray(1, 4);
        stsz.sampleSize = ByteParserUtils.parseUint32(data, 4);
        stsz.entries = [];

        for (let i: number = 12; i < data.byteLength; i += 4) {
            stsz.entries.push(
                ByteParserUtils.parseUint32(data, i));
        }
        return stsz;
    }
}
