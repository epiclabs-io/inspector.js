import { toSecondsFromMicros } from "../utils/timescale";

export class Frame {

    // fixme: should be an enum
    public static IDR_FRAME: string = 'I';
    public static P_FRAME: string = 'P';
    public static B_FRAME: string = 'B';
    public static UNFLAGGED_FRAME: string = '-';

    private presentationTimeUs: number = 0;

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
