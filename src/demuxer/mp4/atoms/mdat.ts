import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

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
                console.log('is this an H264 stream?');
                continue;
            }

            const nalType: number = data[i] & 0x1F;
            switch (nalType) {
                case 0x01:
                    console.log('slice_layer_without_partitioning_rbsp');
                    break;
                case 0x05:
                    console.log('slice_layer_without_partitioning_rbsp_idr');
                    break;
                case 0x06:
                    console.log('sei_rbsp');
                    break;
                case 0x07:
                    console.log('seq_parameter_set_rbsp');
                    break;
                case 0x08:
                    console.log('pic_parameter_set_rbsp');
                    break;
                case 0x09:
                    console.log('access_unit_delimiter_rbsp');
                    break;
                default:
                    console.log('Unknown nal unit: ' + nalType);
                    break;
            }
        }
    }
}
