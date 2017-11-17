export declare class Mp4SampleFlags {
    isLeading: number;
    dependsOn: number;
    isDependedOn: number;
    hasRedundancy: number;
    paddingValue: number;
    isNonSyncSample: number;
    degradationPriority: number;
}
export default class ByteParserUtils {
    static parseStringWithLength(buffer: Uint8Array, offset: number, end: number): string;
    static parseNullTerminatedString(buffer: Uint8Array, offset: number, end: number): string;
    static parseUint32(buffer: Uint8Array, offset: number): number;
    static parseLong64(buffer: Uint8Array, offset: number): number;
    static parseUint16(buffer: Uint8Array, offset: number): number;
    static parseIsoBoxType(buffer: Uint8Array, offset: number): string;
    static parseIsoBoxDate(seconds: number): Date;
    static parseIsoBoxSampleFlags(flags: number): Mp4SampleFlags;
}
