import PayloadReader from './payload-reader';
export default class MpegReader extends PayloadReader {
    private static STATE_FIND_SYNC;
    private static STATE_READ_HEADER;
    private static STATE_READ_FRAME;
    private static HEADER_SIZE;
    private static SAMPLING_RATE_V1;
    private static BITRATE_V1_L1;
    private static BITRATE_V2_L1;
    private static BITRATE_V1_L2;
    private static BITRATE_V1_L3;
    private static BITRATE_V2;
    private static MIME_TYPE_BY_LAYER;
    channels: number;
    bitrate: number;
    sampleRate: number;
    samplesPerFrame: number;
    currentFrameSize: number;
    frameDuration: number;
    mimeType: string;
    private state;
    constructor();
    getMimeType(): string;
    consumeData(pts: number): void;
    private findHeader();
    private readHeader();
    private parseHeader(header);
    private readFrame();
}
