import { FRAME_TYPE } from "../codecs/h264/nal-units";
import { toSecondsFromMicros } from "../utils/timescale";

export class Frame {

    constructor (
        public readonly frameType: FRAME_TYPE,
        public readonly dts: number,
        private _cto: number,
        public readonly duration: number,
        public readonly size: number,
        private _bytesOffset: number = NaN
    ) {
        if (dts < 0 || !Number.isSafeInteger(dts)) {
            throw new Error(`Frame: DTS has to be positive safe-integer value but is ${dts}`);
        }
        if (size < 0 || !Number.isSafeInteger(size)) {
            throw new Error(`Frame: Size has to be positive safe-integer value but is ${size}`);
        }
        if (duration < 0 || !Number.isSafeInteger(duration)) {
            throw new Error(`Frame: Duration has to be positive safe-integer value but is ${duration}`);
        }
        this.setPresentationTimeOffset(_cto);
    }

    get bytesOffset() {
        return this._bytesOffset;
    }

    get cto() {
        return this._cto;
    }

    /**
     * aka "CTO"
     * @param cto
     */
    setPresentationTimeOffset(cto: number) {
        if (cto < 0 || !Number.isSafeInteger(cto)) {
            throw new Error(`Frame: CTO has to be positive safe-integer value but is ${cto}`);
        }
        this._cto = cto;
    }

    setBytesOffset(bytesOffset: number) {
        if (bytesOffset < 0 || !Number.isSafeInteger(bytesOffset)) {
            throw new Error(`Frame: Bytes-offset has to be positive safe-integer value but is ${bytesOffset}`);
        }
        this._bytesOffset = bytesOffset;
    }
}
