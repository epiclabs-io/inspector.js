import { Atom } from './atom';
export declare class Pssh extends Atom {
    version: number;
    flags: Uint8Array;
    systemId: Uint8Array;
    kId: Uint8Array[];
    data: Uint8Array;
    static parse(data: Uint8Array): Atom;
}
