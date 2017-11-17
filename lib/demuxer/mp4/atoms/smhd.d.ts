import { Atom } from './atom';
export declare class Smhd extends Atom {
    version: number;
    flags: Uint8Array;
    balance: number;
    static parse(data: Uint8Array): Atom;
}
