import BitReader from '../../utils/bit-reader';
import PayloadReader from './payload/payload-reader';
export default class PESReader {
    pid: number;
    type: number;
    static TS_STREAM_TYPE_AAC: number;
    static TS_STREAM_TYPE_H264: number;
    static TS_STREAM_TYPE_ID3: number;
    static TS_STREAM_TYPE_MPA: number;
    static TS_STREAM_TYPE_MPA_LSF: number;
    static TS_STREAM_TYPE_METADATA: number;
    payloadReader: PayloadReader;
    private lastPts;
    private pesLength;
    constructor(pid: number, type: number);
    static ptsToTimeUs(pts: number): number;
    appendData(payloadUnitStartIndicator: boolean, packet: BitReader): void;
    parsePESHeader(packet: BitReader): void;
    reset(): void;
    flush(): void;
}
