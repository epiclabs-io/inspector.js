import ByteParserUtils from '../../../utils/byte-parser-utils';
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
        emsg.schemeIdUri = ByteParserUtils.parseNullTerminatedString(data, i, data.byteLength);
        i += emsg.schemeIdUri.length + 1;
        emsg.value = ByteParserUtils.parseNullTerminatedString(data, i, data.byteLength);
        i += emsg.value.length + 1;
        emsg.timescale = ByteParserUtils.parseUint32(data, i);
        i += 4;
        emsg.presentationTimeDelta = ByteParserUtils.parseUint32(data, i);
        i += 4;
        emsg.eventDuration = ByteParserUtils.parseUint32(data, i);
        i += 4;
        emsg.id = ByteParserUtils.parseUint32(data, i);
        i += 4;
        if (i < data.byteLength - 1) {
            emsg.data = data.subarray(i);
        }
        return emsg;
    }
}
