import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';
import {getLogger} from '../../../utils/logger';

const {log, warn} = getLogger('Mdat');

export class Mdat extends Atom {

    public static parse(data: Uint8Array): Atom {
        const mdat: Mdat = new Mdat(Atom.mdat, data.byteLength);
        Mdat.parsePayload(data);
        return mdat;
    }

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
}
