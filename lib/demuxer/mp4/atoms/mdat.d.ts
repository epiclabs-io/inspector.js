import { Atom } from './atom';
export declare class Mdat extends Atom {
    static parse(data: Uint8Array): Atom;
    private static parsePayload(data);
}
