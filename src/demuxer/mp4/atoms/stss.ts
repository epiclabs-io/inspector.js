import { Atom } from "./atom";
import ByteParserUtils from "../../../utils/byte-parser-utils";

export class Stss extends Atom {

    public version: number;
    public flags: Uint8Array;
    public syncSampleNumbers: number[] = [];

    public static parse(data: Uint8Array): Atom {
        const stss: Stss = new Stss(Atom.stts, data.byteLength);
        stss.version = data[0];
        stss.flags = data.subarray(1, 4);
        const entryCount: number = ByteParserUtils.parseUint32(data, 4);

        let offset: number = 8;
        for (let i: number = 0; i < entryCount; i++) {
            stss.syncSampleNumbers.push(ByteParserUtils.parseUint32(data, offset));
            offset += 8;
        }
        return stss;
    }
}
