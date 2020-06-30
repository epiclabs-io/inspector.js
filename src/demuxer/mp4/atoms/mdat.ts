import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Mdat extends Atom {

    public data: Uint8Array = null;

    public static parse(data: Uint8Array): Atom {
        const mdat: Mdat = new Mdat(Atom.mdat, data.byteLength);
        mdat.data = data;
        //Mdat.parsePayload(data);
        return mdat;
    }

    /*
    private static parsePayload(data: Uint8Array): void {
        let length: number;
        for (let i: number = 0; i + 4 < data.byteLength; i += length) {
            length = ByteParserUtils.parseUint32(data, i);
            i += 4;

            if (length <= 0) {
                //console.log('is this an H264 stream?');
                //continue;

                // let's break here since otherwise this crashes on AAC data
                warn('aborted parsing mdat');
                break;
            }

            const nalType: number = data[i] & 0x1F;
            // TODO: do something
        }
    }
    */
}
