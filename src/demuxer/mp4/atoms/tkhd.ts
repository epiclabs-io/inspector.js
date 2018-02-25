import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Tkhd extends Atom {
    public version: number;
    public flags: Uint8Array;
    public creationTime: Date;
    public modificationTime: Date;
    public trackId: number;
    public duration: number;
    public layer: number;
    public volume: number;
    public matrix: Uint32Array;
    public alternateGroup: number;
    public width: number;
    public height: number;

    public static parse(data: Uint8Array): Atom {
        const tkhd: Tkhd = new Tkhd(Atom.tkhd, data.byteLength);
        tkhd.version = data[0];
        tkhd.flags = data.subarray(1, 4);

        let offset: number = 4;
        if (tkhd.version === 1) {
            offset += 4;
            tkhd.creationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 8;
            tkhd.modificationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            tkhd.trackId = ByteParserUtils.parseUint32(data, offset);
            offset += 12;
            tkhd.duration = ByteParserUtils.parseUint32(data, offset);
        } else {
            tkhd.creationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            tkhd.modificationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            tkhd.trackId = ByteParserUtils.parseUint32(data, offset);
            offset += 8;
            tkhd.duration = ByteParserUtils.parseUint32(data, offset);
        }
        offset += 12;
        tkhd.layer = ByteParserUtils.parseUint16(data, offset);
        offset += 2;
        tkhd.alternateGroup = ByteParserUtils.parseUint16(data, offset);
        offset += 2;
        tkhd.volume = data[offset] + (data[offset + 1] / 8);
        offset += 4;
        tkhd.matrix = new Uint32Array(data.subarray(offset, offset + (9 * 4)));
        offset += 9 * 4;
        tkhd.width = ByteParserUtils.parseUint16(data, offset) +
            (ByteParserUtils.parseUint16(data, offset + 2) / 16);
        offset += 4;
        tkhd.height = ByteParserUtils.parseUint16(data, offset) +
            (ByteParserUtils.parseUint16(data, offset + 2) / 16);

        return tkhd;
    }
}
