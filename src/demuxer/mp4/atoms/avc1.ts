import {Atom} from './atom';
import {VideoAtom} from './helpers/video-atom';

export class Avc1 extends VideoAtom {
    public static parse(data: Uint8Array): Atom {
        const atom: Avc1 = new Avc1(Atom.avc1, data.byteLength);
        VideoAtom.fillVideoAtom(atom, data);
        return atom;
    }
}
