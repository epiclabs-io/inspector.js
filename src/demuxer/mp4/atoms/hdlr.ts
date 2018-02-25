import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Hdlr extends Atom {
    public version: number;
    public flags: Uint8Array;
    public handlerType: string;
    public name: string;

    public static parse(data: Uint8Array): Atom {
        const hdlr: Hdlr = new Hdlr(Atom.hdlr, data.byteLength);
        hdlr.version = data[0];
        hdlr.flags = data.subarray(1, 4);
        hdlr.handlerType = ByteParserUtils.parseIsoBoxType(data, 8);

        // parse out the name field
        let name: string = '';
        for (let i: number = 24; i < data.byteLength; i++) {
            if (data[i] === 0x00) {
                i++;
                break;
            }
            name += String.fromCharCode(data[i]);
        }
        hdlr.name = decodeURIComponent(name);

        return hdlr;
    }
}
