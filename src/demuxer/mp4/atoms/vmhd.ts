import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

export class Vmhd extends Atom {
    public version: number;
    public flags: Uint8Array;
    public graphichsMode: number;
    public opColor: Uint16Array;

    public static parse(data: Uint8Array): Atom {
        const vmhd: Vmhd = new Vmhd(Atom.vmhd, data.byteLength);
        vmhd.version = data[0];
        vmhd.flags = data.subarray(1, 4);
        vmhd.graphichsMode = Mp4ParserUtils.parseUint16(data, 4);
        vmhd.opColor = new Uint16Array([
            Mp4ParserUtils.parseUint16(data, 6),
            Mp4ParserUtils.parseUint16(data, 8),
            Mp4ParserUtils.parseUint16(data, 10)
        ]);
        return vmhd;
    }
}
