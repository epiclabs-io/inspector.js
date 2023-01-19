import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom, ContainerAtom } from './atom';
import { NalUnit, NalUnitsArray } from '../../../codecs/h265/nal-unit';

export class HvcC extends Atom {
    public version: number;
    public generalProfileSpace: number;
    public generalTierFlag: number;
    public generalProfileIdc: number;
    public generalProfileCompatibility: number;
    public generalConstraintIndicator: Uint8Array;
    public generalLevelIdc: number;
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
    public nalUnitsArrays: NalUnitsArray[];

    public static parse(data: Uint8Array): Atom {
        const hvcC: HvcC = new HvcC(Atom.hvcC, data.byteLength);
        let aux: number;

        hvcC.version = data[0];

        aux = data[1];
        hvcC.generalProfileSpace = (aux >> 6) & 0x03;
        hvcC.generalTierFlag = (aux >> 5) & 0x01;
        hvcC.generalProfileIdc = aux & 0x1F;

        hvcC.generalProfileCompatibility = ByteParserUtils.parseUint32(data, 2);
        hvcC.generalConstraintIndicator = data.subarray(6, 12);
        hvcC.generalLevelIdc = data[12];
        hvcC.spatialSegmentationIdc = ByteParserUtils.parseUint16(data, 13) & 0xFFF;
        hvcC.parallelismType = (data[15] & 0x3);
        hvcC.chromaFormat = (data[16] & 0x3);
        hvcC.bitDepthLumaMinus8 = (data[17] & 0x7);
        hvcC.bitDepthChromaMinus8 = (data[18] & 0x7);
        hvcC.avgFrameRate = ByteParserUtils.parseUint16(data, 19);

        aux = data[21];
        hvcC.constantFrameRate = (aux >> 6) & 0x03;
        hvcC.numTemporalLayers = (aux >> 3) & 0x07;
        hvcC.temporalIdNested = (aux >> 2) & 0x01;
        hvcC.lengthSizeMinusOne = (aux & 0X3) + 1;

        hvcC.nalUnitsArrays = [];
        const naluArraysCount: number = data[22];
        let offset: number = 23;
        for (let i: number = 0; i < naluArraysCount; i++) {
            aux = data[offset++];
            const completeness: number = (aux & 0x80) >> 7;
            const naluType: number = (aux & 0x3f);
            const nalusCount: number = ByteParserUtils.parseUint16(data, offset);
            offset += 2;

            const naluArray: NalUnitsArray = new NalUnitsArray(!!completeness, naluType);
            hvcC.nalUnitsArrays.push(naluArray);
            for (let j: number = 0; j < nalusCount; j++) {
                const naluLen: number = ByteParserUtils.parseUint16(data, offset);
                offset += 2;

                const naluData: Uint8Array = data.subarray(offset, offset + naluLen);
                offset += naluLen;

                const nalu: NalUnit = new NalUnit(naluType, naluData);
                naluArray.nalUnits.push(nalu);
            }
        }

        return hvcC;
    }
}
