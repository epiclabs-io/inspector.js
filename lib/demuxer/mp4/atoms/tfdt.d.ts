import { Atom } from './atom';
export declare class Tfdt extends Atom {
    version: number;
    flags: Uint8Array;
    baseMediaDecodeTime: number;
    static parse(data: Uint8Array): Atom;
}
