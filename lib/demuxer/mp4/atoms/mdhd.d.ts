import { Atom } from './atom';
export declare class Mdhd extends Atom {
    version: number;
    flags: Uint8Array;
    language: string;
    creationTime: Date;
    modificationTime: Date;
    timescale: number;
    duration: number;
    static parse(data: Uint8Array): Atom;
}
