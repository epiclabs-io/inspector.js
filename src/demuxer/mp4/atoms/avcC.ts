import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom, ContainerAtom } from './atom';
import { SPSParser } from '../../../codecs/h264/sps-parser';
import { Sps } from '../../../codecs/h264/nal-units';

export class AvcC extends Atom {
    public version: number;
    public profile: number;
    public profileCompatibility: number;
    public level: number;
    public lengthSizeMinusOne: number;
    public numOfSequenceParameterSets: number;
    public numOfPictureParameterSets: number;
    public sps: Uint8Array[];
    public spsParsed: Sps[];
    public pps: Uint8Array[];
    public data: Uint8Array;

    public static parse(data: Uint8Array): Atom {
        const avcC: AvcC = new AvcC(Atom.avcC, data.byteLength);

        avcC.data = data;
        avcC.version = data[0];
        avcC.profile = data[1];
        avcC.profileCompatibility = data[2];
        avcC.level = data[3];
        avcC.lengthSizeMinusOne = data[4] & 0x03;
        avcC.numOfSequenceParameterSets = data[5] & 0x1f;

        avcC.sps = [];
        avcC.spsParsed = [];
        let offset: number = 6;
        for (let i: number = 0; i < avcC.numOfSequenceParameterSets; i++) {
            const spsSize: number = ByteParserUtils.parseUint16(data, offset);
            offset += 2;
            const sps: Uint8Array = new Uint8Array(data.subarray(offset, offset + spsSize));
            avcC.sps.push(sps);
            offset += spsSize;

            avcC.spsParsed.push(SPSParser.parseSPS(sps.subarray(1, spsSize)));
        }

        avcC.numOfPictureParameterSets = data[offset] & 0x1f;
        avcC.pps = [];
        offset++;
        for (let i: number = 0; i < avcC.numOfPictureParameterSets; i++) {
            const ppsSize: number = ByteParserUtils.parseUint16(data, offset);
            offset += 2;
            avcC.pps.push(new Uint8Array(data.subarray(offset, offset + ppsSize)));
            offset += ppsSize;
        }

        return avcC;
    }
}
