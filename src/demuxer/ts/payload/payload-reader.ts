import { BitReader } from '../../../utils/bit-reader';
import { Frame } from '../../frame';

export abstract class PayloadReader {
    public firstTimestamp: number = -1;
    public timeUs: number = -1;
    public frames: Frame[] = [];
    public dataBuffer: Uint8Array;

    protected dataOffset: number;

    private firstPacketDataOffset: number;

    constructor() {
        this.reset();
    }

    public append(packet: BitReader): void {

        if (isNaN(this.firstPacketDataOffset)) {
            this.firstPacketDataOffset = packet.buffer.byteOffset + packet.bytesOffset();
        }

        const dataToAppend: Uint8Array = packet.buffer.subarray(packet.bytesOffset());

        if (!this.dataBuffer) {
            this.dataBuffer = dataToAppend;
        } else {
            const newLen: number = this.dataBuffer.byteLength + packet.remainingBytes();
            const temp: Uint8Array = new Uint8Array(newLen);
            temp.set(this.dataBuffer, 0);
            temp.set(dataToAppend, this.dataBuffer.byteLength);
            this.dataBuffer = temp;
        }
    }

    public reset(): void {
        this.frames = [];
        this.dataOffset = 0;
        this.firstTimestamp = -1;
        this.timeUs = -1;
    }

    public flush(pts: number): void {
        if (this.dataBuffer && this.dataBuffer.byteLength > 0) {
            this.consumeData(pts);
            this.dataBuffer = null;
        }
        this.dataOffset = 0;
    }

    public abstract consumeData(pts: number): void;

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

    public getFirstPacketDataOffset(): number {
        return this.firstPacketDataOffset;
    }
}
