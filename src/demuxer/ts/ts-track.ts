import Track from '../track';
import Frame from '../frame';
import PESReader from './pes-reader';

export default class TSTrack extends Track {
    constructor(id: number, type: string, mimeType: string, public pes: PESReader) {
        super(id, type, mimeType);
    }

    public getDuration(): number {
        if (this.pes && this.pes.payloadReader) {
            return this.pes.payloadReader.getDuration();
        }
        return 0;
    }

    public getFrames(): Frame[] {
        if (this.pes && this.pes.payloadReader) {
            return this.pes.payloadReader.frames;
        }
        return [];
    }
}
