import { Atom } from './atom';
export declare class Reference {
    type: number;
    size: number;
    subsegmentDuration: number;
    startsWithSap: boolean;
    sapType: number;
    sapDeltaTime: number;
    constructor(type: number, size: number, subsegmentDuration: number, startsWithSap: boolean, sapType: number, sapDeltaTime: number);
}
export declare class Sidx extends Atom {
    version: number;
    flags: Uint8Array;
    referenceId: number;
    timescale: number;
    earliestPresentationTime: number;
    firstOffset: number;
    references: Reference[];
    static parse(data: Uint8Array): Atom;
}
