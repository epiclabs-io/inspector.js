import PayloadReader from './payload-reader';
export default class AdtsReader extends PayloadReader {
    private static ADTS_HEADER_SIZE;
    private static ADTS_SYNC_SIZE;
    private static ADTS_CRC_SIZE;
    private static STATE_FIND_SYNC;
    private static STATE_READ_HEADER;
    private static STATE_READ_FRAME;
    private static ADTS_SAMPLE_RATES;
    channels: number;
    sampleRate: number;
    frameDuration: number;
    currentFrameSize: number;
    private state;
    constructor();
    getMimeType(): string;
    consumeData(pts: number): void;
    private findNextSync();
    private parseAACHeader();
}
