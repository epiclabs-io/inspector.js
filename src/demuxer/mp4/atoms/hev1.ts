import {Atom} from './atom';
import {VideoAtom} from './helpers/video-atom';

export class Hev1 extends VideoAtom {
    public static parse(data: Uint8Array): Atom {
        const atom: Hev1 = new Hev1(Atom.hev1, data.byteLength);
        VideoAtom.fillVideoAtom(atom, data);
        return atom;
    }
}
