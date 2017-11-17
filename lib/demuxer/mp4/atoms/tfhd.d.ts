import { Atom } from './atom';
export declare class Tfhd extends Atom {
    version: number;
    flags: Uint8Array;
    trackId: number;
    baseDataOffset: number;
    sampleDescriptionIndex: number;
    defaultSampleDuration: number;
    defaultSampleSize: number;
    defaultSampleFlags: number;
    static parse(data: Uint8Array): Atom;
}
