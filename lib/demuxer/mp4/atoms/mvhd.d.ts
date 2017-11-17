import { Atom } from './atom';
export declare class Mvhd extends Atom {
    version: number;
    flags: Uint8Array;
    creationTime: Date;
    modificationTime: Date;
    timescale: number;
    duration: number;
    rate: number;
    volume: number;
    matrix: Uint32Array;
    previewtime: number;
    previewDuration: number;
    posterTime: number;
    selectionTime: number;
    selectionDuration: number;
    currentTime: number;
    nextTrackId: number;
    static parse(data: Uint8Array): Atom;
}
