import ByteParserUtils from '../../../utils/byte-parser-utils';
import {Atom, ContainerAtom} from './atom';

export class Stsd extends ContainerAtom {
    public version: number;
    public flags: Uint8Array;
    public entryCount: number;

    public static parse(data: Uint8Array): Atom {
        const stsd: Stsd = new Stsd(Atom.stsd, data.byteLength);
        stsd.containerDataOffset = 8;

        stsd.version = data[0];
        stsd.flags = data.subarray(1, 4);
        stsd.entryCount = ByteParserUtils.parseUint32(data, 4);

        return stsd;
    }
}
