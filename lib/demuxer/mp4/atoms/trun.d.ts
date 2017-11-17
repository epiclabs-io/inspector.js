import { Atom } from './atom';
export declare class SampleFlags {
    isLeading: number;
    dependsOn: number;
    isDependedOn: number;
    hasRedundancy: number;
    paddingValue: number;
    isSyncFrame: boolean;
    degradationPriority: number;
    constructor(isLeading: number, dependsOn: number, isDependedOn: number, hasRedundancy: number, paddingValue: number, isSyncFrame: boolean, degradationPriority: number);
}
export declare class Sample {
    flags: SampleFlags;
    duration: number;
    size: number;
    compositionTimeOffset: number;
}
export declare class Trun extends Atom {
    version: number;
    flags: Uint8Array;
    trackId: number;
    dataOffset: number;
    samples: Sample[];
    static parse(data: Uint8Array): Atom;
    private static parseFlags(data);
}
