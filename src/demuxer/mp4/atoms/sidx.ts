import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

export class Reference {
    constructor(public type: number, public size: number,
        public subsegmentDuration: number, public startsWithSap: boolean,
        public sapType: number, public sapDeltaTime: number) {
    }
}

export class Sidx extends Atom {
    public version: number;
    public flags: Uint8Array;
    public referenceId: number;
    public timescale: number;
    public earliestPresentationTime: number;
    public firstOffset: number;
    public references: Reference[];

    public static parse(data: Uint8Array): Atom {
        const sidx: Sidx = new Sidx(Atom.sidx, data.byteLength);
        sidx.version = data[0];
        sidx.flags = data.subarray(1, 4);
        sidx.referenceId = Mp4ParserUtils.parseUint32(data, 4);
        sidx.timescale = Mp4ParserUtils.parseUint32(data, 8);
        let offset: number;
        if (sidx.version === 0) {
            sidx.earliestPresentationTime = Mp4ParserUtils.parseUint32(data, 12);
            sidx.firstOffset = Mp4ParserUtils.parseUint32(data, 16);
            offset = 20;
        } else {
            sidx.earliestPresentationTime = Mp4ParserUtils.parseLong64(data, 12);
            sidx.firstOffset = Mp4ParserUtils.parseLong64(data, 20);
            offset = 28;
        }

        offset += 2;
        const referenceCount: number = Mp4ParserUtils.parseUint16(data, offset);
        sidx.references = [];
        offset += 2;

        for (let i: number = 0; i < referenceCount; i++) {
            sidx.references.push(new Reference(
                (data[offset] & 0x80) >>> 7,
                Mp4ParserUtils.parseUint32(data, offset) & 0x7FFFFFFF,
                Mp4ParserUtils.parseUint32(data, offset + 4),
                !!(data[offset + 8] & 0x80),
                (data[offset + 8] & 0x70) >>> 4,
                Mp4ParserUtils.parseUint32(data, offset + 8) & 0x0FFFFFFF));
            offset += 12;
        }
        return sidx;
    }
}
