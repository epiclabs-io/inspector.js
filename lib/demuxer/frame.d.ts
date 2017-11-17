export default class Frame {
    frameType: string;
    timeUs: number;
    static IDR_FRAME: string;
    static P_FRAME: string;
    static B_FRAME: string;
    constructor(frameType: string, timeUs: number);
}
