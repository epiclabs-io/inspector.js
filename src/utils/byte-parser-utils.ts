export class Mp4SampleFlags {
    public isLeading: number;
    public dependsOn: number;
    public isDependedOn: number;
    public hasRedundancy: number;
    public paddingValue: number;
    public isNonSyncSample: number;
    public degradationPriority: number;
}

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

    public static parseNullTerminatedString(buffer: Uint8Array, offset: number, end: number): string {
        let result: string = '';
        for (let i: number = offset + 1; i < end && buffer[i] !== 0; i++) {
            result += String.fromCharCode(buffer[i]);
        }
        return result;
    }

    public static parseUint32(buffer: Uint8Array, offset: number): number {
        // Js tric: The only JavaScript operator that works using unsigned 32-bit integers is >>>
        // it can be used to convert a signed integer to an unsigned one
        return (buffer[offset++] << 24 |
            buffer[offset++] << 16 |
            buffer[offset++] << 8  |
            buffer[offset]) >>> 0;
    }

    public static parseLong64(buffer: Uint8Array, offset: number): number {
        // Js tric: The only JavaScript operator that works using unsigned 32-bit integers is >>>
        // it can be used to convert a signed integer to an unsigned one
        return (buffer[offset++] << 56 |
            buffer[offset++] << 48 |
            buffer[offset++] << 40 |
            buffer[offset++] << 32 |
            buffer[offset++] << 24 |
            buffer[offset++] << 16 |
            buffer[offset++] << 8  |
            buffer[offset]) >>> 0;
    }

    public static parseUint16(buffer: Uint8Array, offset: number): number {
        return (buffer[offset++] << 8  |
            buffer[offset]) >>> 0;
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

    public static parseIsoBoxSampleFlags(flags: number): Mp4SampleFlags {
        return {
            isLeading: (flags[0] & 0x0c) >>> 2,
            dependsOn: flags[0] & 0x03,
            isDependedOn: (flags[1] & 0xc0) >>> 6,
            hasRedundancy: (flags[1] & 0x30) >>> 4,
            paddingValue: (flags[1] & 0x0e) >>> 1,
            isNonSyncSample: flags[1] & 0x01,
            degradationPriority: (flags[2] << 8) | flags[3]
        };
    }
}
