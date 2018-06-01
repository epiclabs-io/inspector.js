import { Track } from '../track';
import { Atom } from './atoms/atom';
import { Frame, MICROSECOND_TIMESCALE } from '../frame';

import { Sidx } from './atoms/sidx';
import { Trun } from './atoms/trun';
import { Tfhd } from './atoms/tfhd';

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
    private baseDataOffset: number = 0;

    constructor(id: number, type: string, mimeType: string, public referenceAtom: Atom, public dataOffset: number) {
        super(id, type, mimeType);
        this.lastPts = 0;
        this.duration = 0;

        if (this.dataOffset < 0) {
          throw new Error('Invalid file, no sample-data base-offset can be determined');
        }
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

    /**
     * @param offset value from `tfhd` box
     */
    public setBaseDataOffset(offset: number) {
        this.baseDataOffset = offset || 0;
    }

    /**
     * @param dataOffset absolute bytes offset inside file to resolve actual sample data
     *
     * As we are adding different `trun`s that are not contiguous boxes (say in multiple fragments)
     * this needs to be called in order to update the internal base offset.
     *
     * Not to be confused with the base offset which maybe be present for each track fragment inside the `tfhd`.
     * That value will be shared for each `trun`.
     */
    public updateSampleDataOffset(dataOffset: number) {
        this.dataOffset = dataOffset;
    }

    /**
     * Returns the total offset for where to find samples (track-fragment base + file context bytes).
     * Note that this will only lead to the current movie fragment parent box most likely (or to the moov box if unfragmented).
     *
     * Each trun box has it's own offset, which refers to this offset here in order to resolve the absolute position
     * of sample runs.
     */
    public getSampleDataOffset(): number {
        return this.baseDataOffset + this.dataOffset;
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

        const sampleRunDataOffset: number = trun.dataOffset + this.getSampleDataOffset();

        let bytesOffset: number = sampleRunDataOffset;

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

            const cto: number =  MICROSECOND_TIMESCALE * (sample.compositionTimeOffset || 0) / timescale;

            this.frames.push(new Frame(
              sample.flags.isSyncFrame ? Frame.IDR_FRAME : Frame.P_FRAME,
              this.lastPts,
              sample.size,
              duration,
              bytesOffset,
              cto
            ));

            bytesOffset += sample.size;
        }
    }
}
