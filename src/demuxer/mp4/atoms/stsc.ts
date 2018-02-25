import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class SampleToChunkEntry {
    constructor(public firstChunk: number, public samplesPerChunk: number,
        public sampleDescriptionIndex: number) {
    }
}

export class Stsc extends Atom {
    public version: number;
    public flags: Uint8Array;
    public sampleToChunks: SampleToChunkEntry[];

    public static parse(data: Uint8Array): Atom {
        const stsc: Stsc = new Stsc(Atom.stsc, data.byteLength);
        stsc.version = data[0];
        stsc.flags = data.subarray(1, 4);
        stsc.sampleToChunks = [];
        const entryCount: number = ByteParserUtils.parseUint32(data, 4);
        let offset: number = 8;
        for (let i: number = 0; i < entryCount; i++) {
            stsc.sampleToChunks.push(new SampleToChunkEntry(
                ByteParserUtils.parseUint32(data, offset),
                ByteParserUtils.parseUint32(data, offset + 4),
                ByteParserUtils.parseUint32(data, offset + 8)));
            offset += 12;
        }
        return stsc;
    }
}
