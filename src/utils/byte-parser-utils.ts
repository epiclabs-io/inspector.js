import { Mp4SampleFlags } from "../demuxer/mp4/mp4-sample-flags";

declare function escape(s: string): string;

export default class ByteParserUtils {
    public static parseStringWithLength(buffer: Uint8Array, offset: number, end: number): string {
        let result: string = '';
        const strLength: number = buffer[offset];
        const maxOffset: number = Math.min(offset + strLength + 1, end);
        for (let i: number = offset + 1; i < maxOffset && buffer[i] !== 0; i++) {
            result += String.fromCharCode(buffer[i]);
        }
        return result;
    }

    public static parseString(buffer: Uint8Array, offset: number, end: number):  string {
        return String.fromCharCode.apply(null, buffer.subarray(offset, end));
    }

    public static parseUTF8String(buffer: Uint8Array, offset: number, end: number):  string {
        const str: string = String.fromCharCode.apply(null, buffer.subarray(offset, end));
        return decodeURIComponent(escape(str));
    }

    public static parseNullTerminatedString(buffer: Uint8Array, offset: number, end: number): string {
        let result: string = '';
        for (let i: number = offset + 1; i < end && buffer[i] !== 0; i++) {
            result += String.fromCharCode(buffer[i]);
        }
        return result;
    }

    public static parseFloat(buffer: Uint8Array, offset: number, len: number): number {
        const v: DataView = new DataView(buffer.buffer, buffer.byteOffset, len);
        if (len === 8) {
            return v.getFloat64(offset);
        }
        return v.getFloat32(offset);
    }

    public static parseInt(buffer: Uint8Array, offset: number, len: number): number {
        let value: number = 0;
        for (let i: number = 0; i < len; i++) {
            value |= (buffer[offset + i] << ((len - i - 1) * 8));
        }
        return value;
    }

    public static parseUint(buffer: Uint8Array, offset: number, len: number, allowOverflow: boolean = true): number {
        let value: number = 0;
        let safeValue: number = 0;
        // we need to walk-back instead of iterating up because otherwise the value-checking to prevent overflow will not work
        for (let i: number = len - 1; i >= 0; i--) {
            value |= (buffer[offset + i] << ((len - i - 1) * 8)) >>> 0;
            if (!allowOverflow) {
                /**
                 * NOTE: In JS engines, usually numbers are stored in 32-bit registers using signed types. That leaves 31 bits for the actual value.
                 * As we write into this variable and shift bits, it is to be expected that overflow will happen when we have a number exceeded 2^31 stored inside this buffer.
                 * We are detecting this via this method of storing the last "safe" value and detecting overflow by comparison (it will be either less in positive value or negative then).
                 * The only thing we can do atm is throw this error and bailing out from any use-cases needing actually large numbers as this.
                 * TODO: any solution to handle large 64 bits values
                 */
                if (value < safeValue) {
                    throw new Error(`Error parsing ${len} bytes-long unsigned integer from buffer: value overflow/wrap-around from previously ${safeValue} to falsely ${value} at byte-index ${i}`)
                }
                safeValue = value;
            }
        }
        return value;
    }

    public static parseUint16(buffer: Uint8Array, offset: number): number {
        return ByteParserUtils.parseUint(buffer, offset, 2);
    }

    public static parseUint32(buffer: Uint8Array, offset: number): number {
        return ByteParserUtils.parseUint(buffer, offset, 4);
    }

    public static parseUint64(buffer: Uint8Array, offset: number): number {
        return ByteParserUtils.parseUint(buffer, offset, 8, false); // do NOT allow internal value wrap-over on assumed 64-bit values
    }

    public static parseIsoBoxType(buffer: Uint8Array, offset: number): string {
        let result: string = '';
        result += String.fromCharCode(buffer[offset++]);
        result += String.fromCharCode(buffer[offset++]);
        result += String.fromCharCode(buffer[offset++]);
        result += String.fromCharCode(buffer[offset]);
        return result;
    }

    public static parseIsoBoxDate(seconds: number): Date {
        return new Date(seconds * 1000 - 2082844800000);
    }

    public static parseBufferToHex(buffer: Uint8Array, offset: number, end: number): string {
        let str: string = '';
        for (let i: number = offset; i < end; i++) {
            str += buffer[i].toString(16);
        }
        return str;
    }
}
