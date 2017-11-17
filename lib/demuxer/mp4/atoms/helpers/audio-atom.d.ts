import { Atom, ContainerAtom } from '../atom';
export declare class AudioAtom extends ContainerAtom {
    dataReferenceIndex: number;
    channelCount: number;
    sampleSize: number;
    sampleRate: number;
    static fillAudioAtom(atom: AudioAtom, data: Uint8Array): Atom;
}
