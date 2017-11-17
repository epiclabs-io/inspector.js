import { Atom } from './atom';
export declare class Emsg extends Atom {
    version: number;
    flags: Uint8Array;
    schemeIdUri: string;
    value: string;
    timescale: number;
    presentationTimeDelta: number;
    eventDuration: number;
    id: number;
    data: Uint8Array;
    static parse(data: Uint8Array): Atom;
}
