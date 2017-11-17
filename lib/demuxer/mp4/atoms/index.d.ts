import { Atom } from './atom';
export declare const boxesParsers: {
    [type: string]: (data: Uint8Array) => Atom;
};
