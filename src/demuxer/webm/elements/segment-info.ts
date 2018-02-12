export interface ISegmentInfo {
    SegmentUID: Uint8Array;
    TimecodeScale: number;
    Duration: number;
    DateUTC: Date;
    MuxingApp: string;
    WritingApp: string;
}
