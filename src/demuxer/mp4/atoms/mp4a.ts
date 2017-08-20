import ByteParserUtils from '../../../utils/byte-parser-utils';
import {Atom, ContainerAtom} from './atom';
import {AudioAtom} from './helpers/audio-atom';

export class Mp4a extends AudioAtom {
    public static parse(data: Uint8Array): Atom {
        const atom: Mp4a = new Mp4a(Atom.mp4a, data.byteLength);
        AudioAtom.fillAudioAtom(atom, data);
        return atom;
    }
}
