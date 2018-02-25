import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Styp extends Atom {
    public majorBrand: string;
    public minorVersion: number;
    public compatibleBrands: string [];

    public static parse(data: Uint8Array): Atom {
        const styp: Styp = new Styp(Atom.styp, data.byteLength);
        styp.majorBrand = ByteParserUtils.parseIsoBoxType(data, 0);
        styp.minorVersion = ByteParserUtils.parseUint32(data, 4);
        styp.compatibleBrands = [];

        let i: number = 8;
        while (i < data.byteLength) {
            styp.compatibleBrands.push(ByteParserUtils.parseIsoBoxType(data, i));
            i += 4;
        }

        return styp;
    }
}
