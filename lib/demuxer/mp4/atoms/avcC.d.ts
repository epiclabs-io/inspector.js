import { Atom } from './atom';
import { Sps } from '../../../codecs/h264/nal-units';
export declare class AvcC extends Atom {
    version: number;
    profile: number;
    profileCompatibility: number;
    level: number;
    lengthSizeMinusOne: number;
    numOfSequenceParameterSets: number;
    numOfPictureParameterSets: number;
    sps: Uint8Array[];
    spsParsed: Sps[];
    pps: Uint8Array[];
    static parse(data: Uint8Array): Atom;
}
