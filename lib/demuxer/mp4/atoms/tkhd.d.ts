import { Atom } from './atom';
export declare class Tkhd extends Atom {
    version: number;
    flags: Uint8Array;
    creationTime: Date;
    modificationTime: Date;
    trackId: number;
    duration: number;
    layer: number;
    volume: number;
    matrix: Uint32Array;
    alternateGroup: number;
    width: number;
    height: number;
    static parse(data: Uint8Array): Atom;
}
