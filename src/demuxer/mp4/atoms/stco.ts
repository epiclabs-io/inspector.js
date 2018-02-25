import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Stco extends Atom {
    public version: number;
    public flags: Uint8Array;
    public chunkOffsets: number[];

    public static parse(data: Uint8Array): Atom {
        const stco: Stco = new Stco(Atom.stco, data.byteLength);
        stco.version = data[0];
        stco.flags = data.subarray(1, 4);
        stco.chunkOffsets = [];
        const entryCount: number = ByteParserUtils.parseUint32(data, 4);
        let offset: number = 8;
        for (let i: number = 0; i < entryCount; i++) {
            stco.chunkOffsets.push(
                ByteParserUtils.parseUint32(data, offset));
            offset += 4;
        }
        return stco;
    }
}
