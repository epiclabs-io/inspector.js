import Mp4ParserUtils from '../mp4-parser-utils';
import {Atom} from './atom';

export class Url extends Atom {
    public version: number;
    public flags: Uint8Array;

    public static parse(data: Uint8Array): Atom {
        const url: Url = new Url(Atom.url, data.byteLength);
        url.version = data[0];
        url.flags = data.subarray(1, 4);

        return url;
    }
}
