export const MICROSECOND_TIMESCALE = 1000000;

export class Frame {

    // fixme: should be an enum
    public static IDR_FRAME: string = 'I';
    public static P_FRAME: string = 'P';
    public static B_FRAME: string = 'B';

    private presentationTimeUs: number = 0;

    constructor (
        public frameType: string,
        public timeUs: number,
        public size: number,
        public duration: number = NaN,
        public bytesOffset: number = -1,
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
        return this.getPresentationTimeUs() / MICROSECOND_TIMESCALE;
    }

    getDecodingTimestampInSeconds() {
        return this.timeUs / MICROSECOND_TIMESCALE;
    }
}
