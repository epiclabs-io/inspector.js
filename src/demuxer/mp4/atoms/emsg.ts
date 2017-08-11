import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

export class Emsg extends Atom {
    public version: number;
    public flags: Uint8Array;
    public schemeIdUri: string;
    public value: string;
    public timescale: number;
    public presentationTimeDelta: number;
    public eventDuration: number;
    public id: number;
    public data: Uint8Array;

    public static parse(data: Uint8Array): Atom {
        const emsg: Emsg = new Emsg(Atom.emsg, data.byteLength);
        emsg.version = data[0];
        emsg.flags = data.subarray(1, 4);

        let i: number = 4;
        emsg.schemeIdUri = Mp4ParserUtils.parseNullTerminatedString(data, i, data.byteLength);
        i += emsg.schemeIdUri.length + 1;
        emsg.value = Mp4ParserUtils.parseNullTerminatedString(data, i, data.byteLength);
        i += emsg.value.length + 1;
        emsg.timescale = Mp4ParserUtils.parseUint32(data, i);
        i += 4;
        emsg.presentationTimeDelta = Mp4ParserUtils.parseUint32(data, i);
        i += 4;
        emsg.eventDuration = Mp4ParserUtils.parseUint32(data, i);
        i += 4;
        emsg.id = Mp4ParserUtils.parseUint32(data, i);
        i += 4;
        if (i < data.byteLength - 1) {
            emsg.data = data.subarray(i);
        }
        return emsg;
    }
}
