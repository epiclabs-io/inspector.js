import { Atom } from './atom';
export declare class Ftyp extends Atom {
    majorBrand: string;
    minorVersion: number;
    compatibleBrands: string[];
    static parse(data: Uint8Array): Atom;
}
