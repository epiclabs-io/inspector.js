import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom, ContainerAtom } from './atom';

export class HvcC extends Atom {
    public version: number;
    public profileSpace: number;
    public tierFlag: number;
    public profileIdc: number;
    public profileCompatibility: number;
    public constraintIndicator: Uint8Array;
    public levelIdc: number;
    public spatialSegmentationIdc: number;
    public parallelismType: number;
    public chromaFormat: number;
    public bitDepthLumaMinus8: number;
    public bitDepthChromaMinus8: number;
    public avgFrameRate: number;
    public constantFrameRate: number;
    public numTemporalLayers: number;
    public temporalIdNested: number;
    public lengthSizeMinusOne: number;

    public static parse(data: Uint8Array): Atom {
        const hvcC: HvcC = new HvcC(Atom.hvcC, data.byteLength);
        let aux: number;

        hvcC.version = data[0];

        aux = data[1];
        hvcC.profileSpace = aux >> 6;
        hvcC.tierFlag = (aux & 0x20) >> 5;
        hvcC.profileIdc = (aux & 0x1F);

        hvcC.profileCompatibility = ByteParserUtils.parseUint32(data, 2);
        hvcC.constraintIndicator = data.subarray(6, 12);
        hvcC.levelIdc = data[12];
        hvcC.spatialSegmentationIdc = ByteParserUtils.parseUint16(data, 13) & 0xFFF;
        hvcC.parallelismType = (data[15] & 0x3);
        hvcC.chromaFormat = (data[16] & 0x3);
        hvcC.bitDepthLumaMinus8 = (data[17] & 0x7);
        hvcC.bitDepthChromaMinus8 = (data[18] & 0x7);
        hvcC.avgFrameRate = ByteParserUtils.parseUint16(data, 19);

        aux = data[21];
        hvcC.constantFrameRate = (aux >> 6);
        hvcC.numTemporalLayers = (aux & 0XD) >> 3;
        hvcC.temporalIdNested = (aux & 0X4) >> 2;
        hvcC.lengthSizeMinusOne = (aux & 0X3);

        // TODO: read H265 nalus

        return hvcC;
    }
}
