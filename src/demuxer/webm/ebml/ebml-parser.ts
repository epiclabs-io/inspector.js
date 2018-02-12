import { Vint } from './ebml-types';

export class EbmlParser {

    public static readVint(buffer: Uint8Array, start: number = 0): Vint {
        let len: number = 1;
        for (; len <= 8; len++) {
            if (buffer[start] >= Math.pow(2, 8 - len)) {
                break;
            }
        }

        if (len > 8 || start + len > buffer.length) {
            return null;
        }

        let value: number = buffer[start] & (1 << (8 - len)) - 1;
        for (let i: number = 1; i < len; i++) {
            if (i === 7) {
                if (value >= Math.pow(2, 53 - 8) && buffer[start + 7] > 0) {
                    return new Vint(-1, len);
                }
            }
            value *= Math.pow(2, 8);
            value += buffer[start + i];
        }

        return new Vint(value, len);
    }
}
