export interface ITrackInfo {
    TrackNumber: number;
    TrackUID: number;
    TrackType: number;
    DefaultDuration: number;
    TrackTimecodeScale: number;
    CodecID: string;
    CodecName: string;
    Video?: any;
    Audio?: any;
}
