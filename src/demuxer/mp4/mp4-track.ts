import Track from '../track';
import { Atom } from './atoms/atom';
import Frame from '../frame';
import { Sidx } from './atoms/sidx';
import { Trun } from './atoms/trun';

export default class Mp4Track extends Track {
    public frames: Frame[];
    private sidx: Sidx;
    private trun: Trun;
    private lastPts: number;

    constructor(id: number, type: string, mimeType: string, public referenceAtom: Atom) {
        super(id, type, mimeType);
        this.frames = [];
        this.lastPts = 0;
    }

     public getFrames(): Frame[] {
         return this.frames;
     }

     public setSidxAtom(atom: Atom): void {
         this.sidx = atom as Sidx;
         this.lastPts = 1000000 * this.sidx.earliestPresentationTime / this.sidx.timescale;
     }

     public setTrunAtom(atom: Atom): void {
         this.trun = atom as Trun;
         for ( const sample of this.trun.samples) {
            if (sample.flags) {
                this.frames.push(new Frame(sample.flags.isSyncFrame ? Frame.IDR_FRAME : Frame.P_FRAME, this.lastPts));
            }
            if (sample.duration) {
                this.lastPts += sample.duration;
            }
         }
     }
}
