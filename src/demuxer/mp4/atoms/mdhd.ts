import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

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
            mdhd.creationTime = Mp4ParserUtils.parseMp4Date(Mp4ParserUtils.parseUint32(data, offset));
            offset += 8;
            mdhd.modificationTime = Mp4ParserUtils.parseMp4Date(Mp4ParserUtils.parseUint32(data, offset));
            offset += 4;
            mdhd.timescale = Mp4ParserUtils.parseUint32(data, offset);
            offset += 8;
            mdhd.duration = Mp4ParserUtils.parseUint32(data, offset);
        } else {
            mdhd.creationTime = Mp4ParserUtils.parseMp4Date(Mp4ParserUtils.parseUint32(data, offset));
            offset += 4;
            mdhd.modificationTime = Mp4ParserUtils.parseMp4Date(Mp4ParserUtils.parseUint32(data, offset));
            offset += 4;
            mdhd.timescale = Mp4ParserUtils.parseUint32(data, offset);
            offset += 4;
            mdhd.duration = Mp4ParserUtils.parseUint32(data, offset);
        }
        offset += 4;
        let langVal: number = Mp4ParserUtils.parseUint16(data, offset);
        mdhd.language = '';
        mdhd.language += String.fromCharCode((langVal >> 10) + 0x60);
        mdhd.language += String.fromCharCode(((langVal & 0x03c0) >> 5) + 0x60);
        mdhd.language += String.fromCharCode((langVal & 0x1f) + 0x60);

        return mdhd;
    }
}
