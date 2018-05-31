export class Frame {

    // fixme: should be an enum
    public static IDR_FRAME: string = 'I';
    public static P_FRAME: string = 'P';
    public static B_FRAME: string = 'B';

    constructor (
        public frameType: string,
        public timeUs: number,
        public size: number,
        public duration: number = 0
    ) {
        // do nothing
    }
}
