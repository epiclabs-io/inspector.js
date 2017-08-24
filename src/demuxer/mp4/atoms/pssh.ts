import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class Pssh extends Atom {
    public version: number;
    public flags: Uint8Array;
    public systemId: Uint8Array;
    public kId: Uint8Array[];
    public data: Uint8Array;

    public static parse(data: Uint8Array): Atom {
        const pssh: Pssh = new Pssh(Atom.pssh, data.byteLength);

        pssh.version = data[0];
        pssh.flags = data.subarray(1, 4);

        let offset: number = 4;
        pssh.systemId = data.subarray(offset, offset + 16);
        offset += 16;

        if (pssh.version > 0) {
            const count: number = ByteParserUtils.parseUint32(data, 4);
            offset += 4;
            pssh.kId = [];
            for (let i: number = 0; i < count; i++) {
                pssh.kId[i] = data.subarray(offset, offset + 16);
                offset += 16;
            }
        }

        const dataSize: number = ByteParserUtils.parseUint32(data, offset);
        offset += 4;
        if (dataSize > 0) {
            pssh.data = data.subarray(offset, offset + 16);
        }
        return pssh;
    }
}
