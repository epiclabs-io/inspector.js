import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Stss extends Atom {
    public version: number;
    public flags: Uint8Array;
    public sampleNumbers: number[];

    public static parse(data: Uint8Array): Atom {
        const stss: Stss = new Stss(Atom.stco, data.byteLength);
        stss.version = data[0];
        stss.flags = data.subarray(1, 4);
        stss.sampleNumbers = [];
        const entryCount: number = ByteParserUtils.parseUint32(data, 4);
        let offset: number = 8;
        for (let i: number = 0; i < entryCount; i++) {
            stss.sampleNumbers.push(
                ByteParserUtils.parseUint32(data, offset));
            offset += 4;
        }
        return stss;
    }
}
