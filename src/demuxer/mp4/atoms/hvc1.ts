import {Atom} from './atom';
import {VideoAtom} from './helpers/video-atom';

export class Hvc1 extends VideoAtom {
    public static parse(data: Uint8Array): Atom {
        const atom: Hvc1 = new Hvc1(Atom.hvc1, data.byteLength);
        VideoAtom.fillVideoAtom(atom, data);
        return atom;
    }
}
