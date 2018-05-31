import { Track } from '../track';
import { Atom } from './atoms/atom';
import { Frame } from '../frame';

import { Sidx } from './atoms/sidx';
import { Trun } from './atoms/trun';
import { Tfhd } from './atoms/tfhd';

const MICROSECOND_TIMESCALE = 1000000;

export type Mp4TrackDefaults = {
  sampleDuration: number;
  sampleSize: number;
  sampleFlags: number;
}

export class Mp4Track extends Track {
    private sidx: Sidx = null;
    private trunInfo: Trun[] = [];
    private lastPts: number;
    private timescale: number;
    private defaults: Mp4TrackDefaults;

    constructor(id: number, type: string, mimeType: string, public referenceAtom: Atom) {
        super(id, type, mimeType);
        this.lastPts = 0;
        this.duration = 0;
    }

    public getSegmentIndex(): Sidx {
      return this.sidx;
    }

    public getTrackFragmentsRunInfo(): Trun[] {
      return this.trunInfo;
    }

    public getReferenceAtom(): Atom {
      return this.referenceAtom;
    }

    public getLastPts(): number {
      return this.lastPts;
    }

    public getTimescale(): number {
        return this.timescale;
    }

    public setDefaults(defaults: Mp4TrackDefaults) {
        this.defaults = defaults;
    }

    public getDefaults() {
        return this.defaults;
    }

    public setSidxAtom(atom: Atom): void {
        this.sidx = atom as Sidx;
        this.lastPts = 1000000 * this.sidx.earliestPresentationTime / this.sidx.timescale;
        this.timescale = this.sidx.timescale;
    }

    public addTrunAtom(atom: Atom): void {
        const trun = atom as Trun;

        this.trunInfo.push(trun);

        const timescale: number = this.sidx ? this.sidx.timescale : 1;
        for (const sample of trun.samples) {

            const sampleDuration = sample.duration || this.defaults.sampleDuration;
            if (!sampleDuration) {
                throw new Error('Invalid file, samples have no duration');
            }

            const duration: number = MICROSECOND_TIMESCALE * sampleDuration / timescale;

            this.lastPts += duration;
            this.duration += duration;

            const flags = sample.flags || this.defaults.sampleFlags;
            if (!flags) {
              throw new Error('Invalid file, sample has no flags');
            }

            this.frames.push(new Frame(
              sample.flags.isSyncFrame ? Frame.IDR_FRAME : Frame.P_FRAME,
              this.lastPts,
              sample.size
            ));
        }
    }
}
