import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

export class Ftyp extends Atom {
    public majorBrand: string;
    public minorVersion: number;
    public compatibleBrands: string [];

    public static parse(data: Uint8Array): Atom {
        const ftyp: Ftyp = new Ftyp(Atom.ftyp, data.byteLength);
        ftyp.majorBrand = Mp4ParserUtils.parseType(data, 0);
        ftyp.minorVersion = Mp4ParserUtils.parseUint32(data, 4);
        ftyp.compatibleBrands = [];

        let i: number = 8;
        while (i < data.byteLength) {
            ftyp.compatibleBrands.push(Mp4ParserUtils.parseType(data, i));
            i += 4;
        }

        return ftyp;
    }
}
