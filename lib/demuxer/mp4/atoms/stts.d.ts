import { Atom } from './atom';
export declare class TimeToSampleEntry {
    sampleCount: number;
    sampleDelta: number;
    constructor(sampleCount: number, sampleDelta: number);
}
export declare class Stts extends Atom {
    version: number;
    flags: Uint8Array;
    timeToSamples: TimeToSampleEntry[];
    static parse(data: Uint8Array): Atom;
}
