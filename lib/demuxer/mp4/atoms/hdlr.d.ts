import { Atom } from './atom';
export declare class Hdlr extends Atom {
    version: number;
    flags: Uint8Array;
    handlerType: string;
    name: string;
    static parse(data: Uint8Array): Atom;
}
