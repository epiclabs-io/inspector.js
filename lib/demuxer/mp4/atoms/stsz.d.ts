import { Atom } from './atom';
export declare class Stsz extends Atom {
    version: number;
    flags: Uint8Array;
    sampleSize: number;
    entries: number[];
    static parse(data: Uint8Array): Atom;
}
