import { toSecondsFromMicros } from "../utils/timescale";

export class Frame {

    // fixme: should be an enum
    public static IDR_FRAME: string = 'I';
    public static P_FRAME: string = 'P';
    public static B_FRAME: string = 'B';
    public static UNFLAGGED_FRAME: string = '/';

    // normalized micros value
    private presentationTimeUs: number = 0;

    // ideally have scaled integer values
    public timescale: number = NaN;
    public scaledDecodingTime: number = NaN;
    public scaledPresentationTimeOffset: number = NaN;
    public scaledDuration: number = NaN;

    constructor (
        public readonly frameType: string,
        public readonly timeUs: number,
        public readonly size: number,
        public readonly duration: number = NaN,
        public bytesOffset: number = NaN,
        public presentationTimeOffsetUs: number = 0
    ) {

        if (!Number.isFinite(size)) {
            throw new Error('Frame has to have sample size');
        }

        this.setPresentationTimeOffsetUs(presentationTimeOffsetUs);
    }

    hasUnnormalizedIntegerTiming() {
        return Number.isFinite(this.timescale)
            && Number.isFinite(this.scaledDecodingTime)
            && Number.isFinite(this.scaledPresentationTimeOffset)
            && Number.isFinite(this.scaledDuration);
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
