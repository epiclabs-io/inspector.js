import { Atom, ContainerAtom } from './atom';
export declare class Stsd extends ContainerAtom {
    version: number;
    flags: Uint8Array;
    entryCount: number;
    static parse(data: Uint8Array): Atom;
}
