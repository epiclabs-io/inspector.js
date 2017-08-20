import ByteParserUtils from '../../../utils/byte-parser-utils';
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
        sidx.referenceId = ByteParserUtils.parseUint32(data, 4);
        sidx.timescale = ByteParserUtils.parseUint32(data, 8);
        let offset: number;
        if (sidx.version === 0) {
            sidx.earliestPresentationTime = ByteParserUtils.parseUint32(data, 12);
            sidx.firstOffset = ByteParserUtils.parseUint32(data, 16);
            offset = 20;
        } else {
            sidx.earliestPresentationTime = ByteParserUtils.parseLong64(data, 12);
            sidx.firstOffset = ByteParserUtils.parseLong64(data, 20);
            offset = 28;
        }

        offset += 2;
        const referenceCount: number = ByteParserUtils.parseUint16(data, offset);
        sidx.references = [];
        offset += 2;

        for (let i: number = 0; i < referenceCount; i++) {
            sidx.references.push(new Reference(
                (data[offset] & 0x80) >>> 7,
                ByteParserUtils.parseUint32(data, offset) & 0x7FFFFFFF,
                ByteParserUtils.parseUint32(data, offset + 4),
                !!(data[offset + 8] & 0x80),
                (data[offset + 8] & 0x70) >>> 4,
                ByteParserUtils.parseUint32(data, offset + 8) & 0x0FFFFFFF));
            offset += 12;
        }
        return sidx;
    }
}
