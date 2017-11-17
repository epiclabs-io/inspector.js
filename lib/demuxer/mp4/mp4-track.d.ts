import Track from '../track';
import { Atom } from './atoms/atom';
import Frame from '../frame';
export default class Mp4Track extends Track {
    referenceAtom: Atom;
    private sidx;
    private trun;
    private lastPts;
    constructor(id: number, type: string, mimeType: string, referenceAtom: Atom);
    getFrames(): Frame[];
    setSidxAtom(atom: Atom): void;
    setTrunAtom(atom: Atom): void;
}
