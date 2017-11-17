import Track from '../track';
import Frame from '../frame';
import PESReader from './pes-reader';
export default class TSTrack extends Track {
    pes: PESReader;
    constructor(id: number, type: string, mimeType: string, pes: PESReader);
    getDuration(): number;
    getFrames(): Frame[];
}
