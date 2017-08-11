import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

export class Tfdt extends Atom {
    public version: number;
    public flags: Uint8Array;
    public baseMediaDecodeTime: number;

    public static parse(data: Uint8Array): Atom {
        const tfdt: Tfdt = new Tfdt(Atom.tfdt, data.byteLength);
        tfdt.version = data[0];
        tfdt.flags = data.subarray(1, 4);

        tfdt.baseMediaDecodeTime = Mp4ParserUtils.parseUint32(data, 4);
        if (tfdt.version === 1) {
            tfdt.baseMediaDecodeTime *= Math.pow(2, 32);
            tfdt.baseMediaDecodeTime += Mp4ParserUtils.parseUint32(data, 8);
        }

        return tfdt;
    }
}
