import { Atom } from './atom';
import { AudioAtom } from './helpers/audio-atom';
export declare class Mp4a extends AudioAtom {
    static parse(data: Uint8Array): Atom;
}
