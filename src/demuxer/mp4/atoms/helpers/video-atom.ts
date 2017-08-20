import ByteParserUtils from '../../../../utils/byte-parser-utils';
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
        atom.dataReferenceIndex = ByteParserUtils.parseUint16(data, 6);
        atom.temporalQuality = ByteParserUtils.parseUint32(data, 16);
        atom.spatialQuality = ByteParserUtils.parseUint32(data, 20);
        atom.width = ByteParserUtils.parseUint16(data, 24);
        atom.height = ByteParserUtils.parseUint16(data, 26);
        atom.horizontalResolution = ByteParserUtils.parseUint16(data, 28) +
            ByteParserUtils.parseUint16(data, 30) / 16;
        atom.verticalResolution = ByteParserUtils.parseUint16(data, 32) +
            ByteParserUtils.parseUint16(data, 34) / 16;
        atom.frameCount = ByteParserUtils.parseUint16(data, 40);
        atom.compressorName = ByteParserUtils.parseStringWithLength(data, 42, 74);
        atom.depth = ByteParserUtils.parseUint16(data, 74);
        return atom;
    }
}
