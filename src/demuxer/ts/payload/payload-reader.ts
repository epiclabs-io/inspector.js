import BitReader from '../../../utils/bit-reader';
import Frame from '../../frame';

export default class PayloadReader {
    public firstTimestamp: number = -1;
    public timeUs: number = -1;
    public frames: Frame[] = [];
    public dataBuffer: Uint8Array;

    public append(packet: BitReader): void {
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
    }

    public flush(): void {
        if (this.dataBuffer.byteLength > 0) {
            this.consumeData(-1);
            this.dataBuffer = null;
        }
    }

    public consumeData(pts: number): void {
        throw new Error('Should have implemented this');
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

    public getFormat(): string {
        return '';
    }
}
