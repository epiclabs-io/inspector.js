import { Atom, ContainerAtom } from '../atom';
export declare class VideoAtom extends ContainerAtom {
    dataReferenceIndex: number;
    temporalQuality: number;
    spatialQuality: number;
    width: number;
    height: number;
    horizontalResolution: number;
    verticalResolution: number;
    compressorName: string;
    frameCount: number;
    depth: number;
    protected static fillVideoAtom(atom: VideoAtom, data: Uint8Array): Atom;
}
