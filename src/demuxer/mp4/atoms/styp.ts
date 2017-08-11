import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

export class Styp extends Atom {
    public majorBrand: string;
    public minorVersion: number;
    public compatibleBrands: string [];

    public static parse(data: Uint8Array): Atom {
        const styp: Styp = new Styp(Atom.ftyp, data.byteLength);
        styp.majorBrand = Mp4ParserUtils.parseType(data, 0);
        styp.minorVersion = Mp4ParserUtils.parseUint32(data, 4);
        styp.compatibleBrands = [];

        let i: number = 8;
        while (i < data.byteLength) {
            styp.compatibleBrands.push(Mp4ParserUtils.parseType(data, i));
            i += 4;
        }

        return styp;
    }
}
