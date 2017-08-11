import Mp4ParserUtils from '../../mp4-parser-utils';
import {Atom, ContainerAtom} from '../atom';

export class VideoAtom extends ContainerAtom {
    public dataReferenceIndex: number;
    public temporalQuality: number;
    public spatialQuality: number;
    public width: number;
    public height: number;
    public horizontalResolution: number;
    public verticalResolution: number;
    public compressorName: string;
    public frameCount: number;
    public depth: number;

    protected static fillVideoAtom(atom: VideoAtom, data: Uint8Array): Atom {
        atom.containerDataOffset = 78;
        atom.dataReferenceIndex = Mp4ParserUtils.parseUint16(data, 6);
        atom.temporalQuality = Mp4ParserUtils.parseUint32(data, 16);
        atom.spatialQuality = Mp4ParserUtils.parseUint32(data, 20);
        atom.width = Mp4ParserUtils.parseUint16(data, 24);
        atom.height = Mp4ParserUtils.parseUint16(data, 26);
        atom.horizontalResolution = Mp4ParserUtils.parseUint16(data, 28) +
            Mp4ParserUtils.parseUint16(data, 30) / 16;
        atom.verticalResolution = Mp4ParserUtils.parseUint16(data, 32) +
            Mp4ParserUtils.parseUint16(data, 34) / 16;
        atom.frameCount = Mp4ParserUtils.parseUint16(data, 40);
        atom.compressorName = Mp4ParserUtils.parseString(data, 42, 74);
        atom.depth = Mp4ParserUtils.parseUint16(data, 74);
        return atom;
    }
}
