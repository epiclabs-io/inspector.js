import { Atom } from './atom';
export declare class Vmhd extends Atom {
    version: number;
    flags: Uint8Array;
    graphichsMode: number;
    opColor: Uint16Array;
    static parse(data: Uint8Array): Atom;
}
