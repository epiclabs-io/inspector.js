import Mp4ParserUtils from '../../mp4-parser-utils';
import {Atom, ContainerAtom} from '../atom';

export class AudioAtom extends ContainerAtom {
    public dataReferenceIndex: number;
    public channelCount: number;
    public sampleSize: number;
    public sampleRate: number;

    public static fillAudioAtom(atom: AudioAtom, data: Uint8Array): Atom {
        atom.containerDataOffset = 28;

        atom.dataReferenceIndex = Mp4ParserUtils.parseUint16(data, 6);
        atom.channelCount = Mp4ParserUtils.parseUint16(data, 16);
        atom.sampleSize = Mp4ParserUtils.parseUint16(data, 18);
        atom.sampleRate = Mp4ParserUtils.parseUint16(data, 24) +
            (Mp4ParserUtils.parseUint16(data, 26) >>> 15);

        return atom;
    }
}
