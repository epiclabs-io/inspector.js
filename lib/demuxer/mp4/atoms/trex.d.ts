import { Atom } from './atom';
export declare class Trex extends Atom {
    version: number;
    flags: Uint8Array;
    trackId: number;
    defaultSampleDescriptionIndex: number;
    defaultSampleDuration: number;
    defaultSampleSize: number;
    sampleDependsOn: number;
    sampleIsDependedOn: number;
    sampleHasRedundancy: number;
    samplePaddingValue: number;
    sampleIsDifferenceSample: boolean;
    sampleDegradationPriority: number;
    static parse(data: Uint8Array): Atom;
}
