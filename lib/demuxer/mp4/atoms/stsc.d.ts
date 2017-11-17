import { Atom } from './atom';
export declare class SampleToChunkEntry {
    firstChunk: number;
    samplesPerChunk: number;
    sampleDescriptionIndex: number;
    constructor(firstChunk: number, samplesPerChunk: number, sampleDescriptionIndex: number);
}
export declare class Stsc extends Atom {
    version: number;
    flags: Uint8Array;
    sampleToChunks: SampleToChunkEntry[];
    static parse(data: Uint8Array): Atom;
}
