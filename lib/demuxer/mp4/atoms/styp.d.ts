import { Atom } from './atom';
export declare class Styp extends Atom {
    majorBrand: string;
    minorVersion: number;
    compatibleBrands: string[];
    static parse(data: Uint8Array): Atom;
}
