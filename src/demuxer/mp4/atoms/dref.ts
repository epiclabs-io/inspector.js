import ByteParserUtils from '../../../utils/byte-parser-utils';
import {Atom, ContainerAtom} from './atom';

export class Dref extends ContainerAtom {
    public version: number;
    public flags: Uint8Array;

    public static parse(data: Uint8Array): Atom {
        const dref: Dref = new Dref(Atom.dref, data.byteLength);
        dref.containerDataOffset = 8;

        dref.version = data[0];
        dref.flags = data.subarray(1, 4);
        return dref;
    }
}
