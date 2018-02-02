import Track from '../track';
import Frame from '../frame';

export default class WebMrack extends Track {
    private lastPts: number;

    constructor(id: number, type: string, mimeType: string) {
        super(id, type, mimeType);
        this.lastPts = 0;
    }

    public getFrames(): Frame[] {
        return this.frames;
    }
}
