import ByteParserUtils from '../../../utils/byte-parser-utils';
import {Atom} from './atom';

export class Mvhd extends Atom {
    public version: number;
    public flags: Uint8Array;
    public creationTime: Date;
    public modificationTime: Date;
    public timescale: number;
    public duration: number;
    public rate: number;
    public volume: number;
    public matrix: Uint32Array;
    public previewtime: number;
    public previewDuration: number;
    public posterTime: number;
    public selectionTime: number;
    public selectionDuration: number;
    public currentTime: number;
    public nextTrackId: number;

    public static parse(data: Uint8Array): Atom {
        const mvhd: Mvhd = new Mvhd(Atom.mvhd, data.byteLength);
        mvhd.version = data[0];
        mvhd.flags = data.subarray(1, 4);

        let offset: number = 4;
        if (mvhd.version === 1) {
            offset += 4;
            mvhd.creationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 8;
            mvhd.modificationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            mvhd.timescale = ByteParserUtils.parseUint32(data, offset);
            offset += 8;
            mvhd.duration = ByteParserUtils.parseUint32(data, offset);
        } else {
            mvhd.creationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            mvhd.modificationTime = ByteParserUtils.parseIsoBoxDate(ByteParserUtils.parseUint32(data, offset));
            offset += 4;
            mvhd.timescale = ByteParserUtils.parseUint32(data, offset);
            offset += 4;
            mvhd.duration = ByteParserUtils.parseUint32(data, offset);
        }
        offset += 4;
        mvhd.rate = ByteParserUtils.parseUint16(data, offset) +
            ByteParserUtils.parseUint16(data, offset + 2) / 16;
        offset += 4;
        mvhd.volume = data[offset] + data[offset + 1] / 8;
        offset += 12;
        mvhd.matrix = new Uint32Array(data.subarray(offset, offset + (9 * 4)));
        offset += 9 * 4;
        mvhd.previewtime = ByteParserUtils.parseUint32(data, offset);
        offset += 4;
        mvhd.previewDuration = ByteParserUtils.parseUint32(data, offset);
        offset += 4;
        mvhd.posterTime = ByteParserUtils.parseUint32(data, offset);
        offset += 4;
        mvhd.selectionTime = ByteParserUtils.parseUint32(data, offset);
        offset += 4;
        mvhd.selectionDuration = ByteParserUtils.parseUint32(data, offset);
        offset += 4;
        mvhd.currentTime = ByteParserUtils.parseUint32(data, offset);
        offset += 4;
        mvhd.nextTrackId = ByteParserUtils.parseUint32(data, offset);
        return mvhd;
    }
}
