import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

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
        const entryCount: number = Mp4ParserUtils.parseUint32(data, 4);
        let offset: number = 8;
        for (let i: number = 0; i < entryCount; i++) {
            stsc.sampleToChunks.push(new SampleToChunkEntry(
                Mp4ParserUtils.parseUint32(data, offset),
                Mp4ParserUtils.parseUint32(data, offset + 4),
                Mp4ParserUtils.parseUint32(data, offset + 8)));
            offset += 12;
        }
        return stsc;
    }
}
