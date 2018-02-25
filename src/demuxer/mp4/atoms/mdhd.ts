import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Mdhd extends Atom {
    public version: number;
    public flags: Uint8Array;
    public language: string;
    public creationTime: Date;
    public modificationTime: Date;
    public timescale: number;
    public duration: number;

    public static parse(data: Uint8Array): Atom {
        const mdhd: Mdhd = new Mdhd(Atom.mdhd, data.byteLength);
        mdhd.version = data[0];
        mdhd.flags = data.subarray(1, 4);

        let offset: number = 4;
        if (mdhd.version === 1) {
            offset += 4;
            mdhd.creationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 8;
            mdhd.modificationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            mdhd.timescale = ByteParserUtils.parseUint32(data, offset);
            offset += 8;
            mdhd.duration = ByteParserUtils.parseUint32(data, offset);
        } else {
            mdhd.creationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            mdhd.modificationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            mdhd.timescale = ByteParserUtils.parseUint32(data, offset);
            offset += 4;
            mdhd.duration = ByteParserUtils.parseUint32(data, offset);
        }
        offset += 4;
        let langVal: number = ByteParserUtils.parseUint16(data, offset);
        mdhd.language = '';
        mdhd.language += String.fromCharCode((langVal >> 10) + 0x60);
        mdhd.language += String.fromCharCode(((langVal & 0x03c0) >> 5) + 0x60);
        mdhd.language += String.fromCharCode((langVal & 0x1f) + 0x60);

        return mdhd;
    }
}
