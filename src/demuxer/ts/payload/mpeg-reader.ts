import BitReader from '../../../utils/bit-reader';
import PayloadReader from './payload-reader';
import Frame from '../../frame';

export default class MpegReader extends PayloadReader {
    private static STATE_FIND_SYNC: number = 1;
    private static STATE_READ_HEADER: number = 2;
    private static STATE_READ_FRAME: number = 3;

    private state: number;

    constructor () {
        super();
        this.state = MpegReader.STATE_FIND_SYNC;
    }

    public getMimeType(): string {
        return 'audio/mpeg';
    }

    public getFormat(): string {
        return 'MPEG Audio (MP3)';
    }

    public getFirstPTS(): number {
        return this.firstTimestamp;
    }

    public getLastPTS(): number {
        return this.timeUs;
    }

    public consumeData(pts: number): void {
        // do nothing
    }

    private findHeader(index: number): number {
        const limit: number = this.dataBuffer.byteLength - 1;

        let lastByteWasFF: boolean = false;
        for (let i: number = 0; i < limit; i++) {
            const isFF: boolean = ((this.dataBuffer[i]) & 0xFF) === 0XFF;
            const found: boolean = lastByteWasFF && ((this.dataBuffer[i] & 0xE0) === 0xE0);
            lastByteWasFF = isFF;

            if (found) {
                lastByteWasFF = false;
                this.state = MpegReader.STATE_READ_HEADER;
                return i + 1;
            }
        }

        return this.dataBuffer.byteLength;
    }
}
