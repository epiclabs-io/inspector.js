import { BitReader } from '../../../utils/bit-reader';
import { Frame } from '../../frame';

export abstract class PayloadReader {

    public frames: Frame[] = [];
    public dataBuffer: Uint8Array;

    protected dataOffset: number = 0;

    private _currentTime: [number, number] = [NaN, NaN];
    private _firstDts: number = NaN;

    private _pusiCount: number = 0;
    private _lastPusiFramesLen: number = 0;

    constructor() {
        this.reset();
    }

    get dts() { return this._currentTime[0] }
    get cto() { return this._currentTime[1] }

    public abstract read(dts: number, cto: number): void;

    public onData(data: Uint8Array, dts: number, cto: number, naluType?: number) {}

    public getMimeType(): string {
        return 'Unknown';
    }

    public getPusiCount() {
        return this._pusiCount;
    }

    public setCurrentTime(dts: number, cto: number) {
        if (Number.isNaN(this._firstDts)) {
            this._firstDts = dts;
        }
        this._currentTime = [dts, cto];
    }

    public getCurrentTime() {
        return this._currentTime;
    }

    public append(packet: BitReader, payloadUnitStartIndicator: boolean): void {

        if (payloadUnitStartIndicator) {
            this._pusiCount++;
            this._lastPusiFramesLen = this.frames.length;
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
        this._pusiCount = 0;
        this._lastPusiFramesLen = 0;
        this.dataOffset = 0;
        this.dataBuffer = null;
    }

    public flush(dts: number, cto: number): void {
        if (this.dataBuffer && this.dataBuffer.byteLength > 0) {
            this.read(dts, cto);
            this.dataBuffer = null;
        }
        this.dataOffset = 0;
    }

    public popFrames(wholePayloadUnits: boolean = true): Frame[] {
        // determine number of frames to splice
        let numFrames = wholePayloadUnits ? this._lastPusiFramesLen : this.frames.length;
        // early return shortcut opti:
        if (numFrames === 0) return [];

        // split-slice frame-list:
        // returns slice to pop, mutates list to remainder (deletes sliced items)
        const frames = this.frames.splice(0, numFrames);

        // reset pusi related counters:
        //
        // note: prior bug would erraticaly set this to remainder length,
        // which would cause popFrames to return frames not yet completed in buffer,
        // thus bringing frame output and actual payload out of whack and
        // therefore making the assumptions upon PES packet segmentation made on parsing input
        // to fail in runtime assertions.
        this._lastPusiFramesLen = 0;
        this._pusiCount = 0;

        return frames;
    }
}
