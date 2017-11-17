import { Atom } from './atom';
export declare class Mfhd extends Atom {
    version: number;
    flags: Uint8Array;
    sequenceNumber: number;
    static parse(data: Uint8Array): Atom;
}
