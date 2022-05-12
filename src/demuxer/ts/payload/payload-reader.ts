import { BitReader } from '../../../utils/bit-reader';
import { Frame } from '../../frame';

export abstract class PayloadReader {

    public firstTimestamp: number = -1;
    public timeUs: number = -1; // FIXME: use NaN instead of -1 !
    public frames: Frame[] = [];
    public dataBuffer: Uint8Array;

    protected dataOffset: number = 0;

    private pusiCount: number = 0;
    private lastPusiFramesLen: number = 0;

    constructor() {
        this.reset();
    }

    public abstract read(time: number): void;

    public onData(data: Uint8Array, time: number, naluType?: number) {}

    public getMimeType(): string {
        return 'Unknown';
    }

    public getDuration(): number {
        return this.getLastPTS() - this.getFirstPTS();
    }

    public getFirstPTS(): number {
        return this.firstTimestamp;
    }

    public getLastPTS(): number {
        return this.timeUs;
    }

    public getPusiCount() {
        return this.pusiCount;
    }

    public append(packet: BitReader, payloadUnitStartIndicator: boolean): void {

        if (payloadUnitStartIndicator) {
            this.pusiCount++;
            this.lastPusiFramesLen = this.frames.length;
        }

        const packetReaderOffset = packet.bytesOffset();
        const dataToAppend: Uint8Array = packet.buffer.subarray(packetReaderOffset);

        if (!this.dataBuffer) {
            this.dataBuffer = dataToAppend;
        } else {
            const newLen: number = this.dataBuffer.byteLength + dataToAppend.byteLength;
            const temp: Uint8Array = new Uint8Array(newLen);
            temp.set(this.dataBuffer, 0);
            temp.set(dataToAppend, this.dataBuffer.byteLength);
            this.dataBuffer = temp;
        }
    }

    public reset(): void {
        this.frames.length = 0;
        this.pusiCount = 0;
        this.lastPusiFramesLen = 0;
        this.dataOffset = 0;
        this.dataBuffer = null;
        this.firstTimestamp = -1;
        this.timeUs = -1;
    }

    public flush(time: number): void {
        if (this.dataBuffer && this.dataBuffer.byteLength > 0) {
            this.read(time);
            this.dataBuffer = null;
        }
        this.dataOffset = 0;
    }

    public popFrames(wholePayloadUnits: boolean = true): Frame[] {
        let numFrames = wholePayloadUnits ? this.lastPusiFramesLen : this.frames.length;
        if (numFrames === 0) return [];
        // split-slice frame-list:
        // returns slice to pop, mutates list to remainder (deletes sliced items)
        const frames = this.frames.splice(0, numFrames);
        // set current payload-unit frame-count to remainder length
        this.lastPusiFramesLen = this.frames.length;
        this.pusiCount = 0;
        return frames;
    }
}
