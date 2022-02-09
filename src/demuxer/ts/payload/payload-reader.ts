import { BitReader } from '../../../utils/bit-reader';
import { Frame } from '../../frame';

export abstract class PayloadReader {
    public firstTimestamp: number = -1;
    public timeUs: number = -1;
    public frames: Frame[] = [];
    public dataBuffer: Uint8Array;

    protected dataOffset: number = 0;

    constructor() {
        this.reset();
    }

    public abstract read(pts: number): void;

    public onData(data: Uint8Array) {}

    public append(packet: BitReader): void {

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
        this.dataOffset = 0;
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

    public popFrames(): Frame[] {
        if (this.frames.length === 0) {
            return [];
        }
        const frames = this.frames.slice(0);
        this.frames.length = 0;
        return frames;
    }

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
}
