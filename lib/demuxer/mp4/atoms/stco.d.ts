import { Atom } from './atom';
export declare class Stco extends Atom {
    version: number;
    flags: Uint8Array;
    chunkOffsets: number[];
    static parse(data: Uint8Array): Atom;
}
