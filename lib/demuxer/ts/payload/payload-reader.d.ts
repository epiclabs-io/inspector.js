import BitReader from '../../../utils/bit-reader';
import Frame from '../../frame';
export default class PayloadReader {
    firstTimestamp: number;
    timeUs: number;
    frames: Frame[];
    dataBuffer: Uint8Array;
    protected dataOffset: number;
    append(packet: BitReader): void;
    reset(): void;
    flush(pts: number): void;
    consumeData(pts: number): void;
    getMimeType(): string;
    getDuration(): number;
    getFirstPTS(): number;
    getLastPTS(): number;
}
