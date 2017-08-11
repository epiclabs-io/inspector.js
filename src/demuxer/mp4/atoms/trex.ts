import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

export class Trex extends Atom {
    public version: number;
    public flags: Uint8Array;
    public trackId: number;
    public defaultSampleDescriptionIndex: number;
    public defaultSampleDuration: number;
    public defaultSampleSize: number;
    public sampleDependsOn: number;
    public sampleIsDependedOn: number;
    public sampleHasRedundancy: number;
    public samplePaddingValue: number;
    public sampleIsDifferenceSample: boolean;
    public sampleDegradationPriority: number;

    public static parse(data: Uint8Array): Atom {
        const trex: Trex = new Trex(Atom.trex, data.byteLength);

        trex.version = data[0];
        trex.flags = new Uint8Array(data.subarray(1, 4)),
        trex.trackId = Mp4ParserUtils.parseUint32(data, 4),
        trex.defaultSampleDescriptionIndex = Mp4ParserUtils.parseUint32(data, 8);
        trex.defaultSampleDuration = Mp4ParserUtils.parseUint32(data, 12);
        trex.defaultSampleSize = Mp4ParserUtils.parseUint32(data, 16);
        trex.sampleDependsOn = data[20] & 0x03;
        trex.sampleIsDependedOn = (data[21] & 0xc0) >> 6;
        trex.sampleHasRedundancy = (data[21] & 0x30) >> 4;
        trex.samplePaddingValue = (data[21] & 0x0e) >> 1;
        trex.sampleIsDifferenceSample = !!(data[21] & 0x01);
        trex.sampleDegradationPriority = Mp4ParserUtils.parseUint32(data, 22);

        return trex;
    }
}
