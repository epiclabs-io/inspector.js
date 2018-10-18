import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class TimeToSampleEntry {
    constructor(public sampleCount: number, public sampleDelta: number) {
    }
}

export class Stts extends Atom {
    public version: number;
    public flags: Uint8Array;
    public timeToSamples: TimeToSampleEntry[] = [];

    public static parse(data: Uint8Array): Atom {
        const stts: Stts = new Stts(Atom.stts, data.byteLength);
        stts.version = data[0];
        stts.flags = data.subarray(1, 4);
        stts.timeToSamples = [];
        const entryCount: number = ByteParserUtils.parseUint32(data, 4);
        let offset: number = 8;
        for (let i: number = 0; i < entryCount; i++) {
            stts.timeToSamples.push(new TimeToSampleEntry(
                ByteParserUtils.parseUint32(data, offset),
                ByteParserUtils.parseUint32(data, offset + 4)));
            offset += 8;
        }
        return stts;
    }
}
