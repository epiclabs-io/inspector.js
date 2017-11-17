import { Atom, ContainerAtom } from './atom';
export declare class Dref extends ContainerAtom {
    version: number;
    flags: Uint8Array;
    static parse(data: Uint8Array): Atom;
}
