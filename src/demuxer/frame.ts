import { toSecondsFromMicros } from "../utils/timescale";

export class Frame {

    // fixme: should be an enum
    public static IDR_FRAME: string = 'I';
    public static P_FRAME: string = 'P';
    public static B_FRAME: string = 'B';
    public static UNFLAGGED_FRAME: string = '/';

    private presentationTimeUs: number = 0;

    // unscaled integer values
    public timescale: number = NaN;
    public timeUnscaled: number = NaN;
    public ptOffsetUnscaled: number = NaN;
    public durationUnscaled: number = NaN;

    constructor (
        public frameType: string,
        public timeUs: number,
        public size: number,
        public duration: number = NaN,
        public bytesOffset: number = NaN,
        presentationTimeOffsetUs: number = 0
    ) {
        this.setPresentationTimeOffsetUs(presentationTimeOffsetUs);
    }

    hasUnscaledIntegerTiming() {
        return Number.isFinite(this.timescale)
            && Number.isFinite(this.timeUnscaled)
            && Number.isFinite(this.ptOffsetUnscaled)
            && Number.isFinite(this.durationUnscaled);
    }

    getDecodingTimeUs() {
        return this.timeUs;
    }

    getPresentationTimeUs(): number {
        return this.presentationTimeUs;
    }

    setPresentationTimeOffsetUs(presentationTimeOffsetUs: number) {
        this.presentationTimeUs = this.timeUs + presentationTimeOffsetUs;
    }

    getPresentationTimestampInSeconds(): number {
        return toSecondsFromMicros(this.getPresentationTimeUs())
    }

    getDecodingTimestampInSeconds() {
        return toSecondsFromMicros(this.getDecodingTimeUs());
    }

    getDurationInSeconds() {
        return toSecondsFromMicros(this.duration);
    }
}
