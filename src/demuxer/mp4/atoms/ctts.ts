import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class CompositionOffsetEntry {
    constructor(public sampleCount: number, public compositionOffset: number) {
    }
}

export class Ctts extends Atom {
    public version: number;
    public flags: Uint8Array;
    public compositionOffsetTable: CompositionOffsetEntry[];

    public static parse(data: Uint8Array): Atom {
        const ctts: Ctts = new Ctts(Atom.ctts, data.byteLength);
        ctts.version = data[0];
        ctts.flags = data.subarray(1, 4);
        ctts.compositionOffsetTable = [];
        const entryCount: number = ByteParserUtils.parseUint32(data, 4);
        let offset: number = 8;
        for (let i: number = 0; i < entryCount; i++) {
            ctts.compositionOffsetTable.push(new CompositionOffsetEntry(
                ByteParserUtils.parseUint32(data, offset),
                ByteParserUtils.parseUint32(data, offset + 4)));
            offset += 8;
        }
        return ctts;
    }
}
