import { Atom } from './atom';
import { VideoAtom } from './helpers/video-atom';
export declare class Hev1 extends VideoAtom {
    static parse(data: Uint8Array): Atom;
}
