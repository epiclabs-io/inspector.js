import Track from '../track';
import { Atom } from './atoms/atom';

export default class Mp4Track extends Track {
    constructor(id: number, type: string, mimeType: string, public referenceAtom: Atom) {
        super(id, type, mimeType);
    }
}
