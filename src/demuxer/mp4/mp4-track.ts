import { Track } from '../track';

import { Frame } from '../frame';

import { Atom } from './atoms/atom';

import { AudioAtom } from './atoms/helpers/audio-atom';
import { VideoAtom } from './atoms/helpers/video-atom';

import { Sidx } from './atoms/sidx';
import { Trun, SampleFlags } from './atoms/trun';
import { Avc1 } from './atoms/avc1';

import { toMicroseconds } from '../../utils/timescale';

export type Mp4TrackDefaults = {
  sampleDuration: number;
  sampleSize: number;
  sampleFlags: number;
}

export class Mp4Track extends Track {

    private sidx: Sidx = null;
    private trunInfo: Trun[] = [];
    private trunInfoReadIndex: number = 0;
    private lastPts: number = null;
    private lastPtsUnscaledUint: number = null;
    private timescale: number = null;
    private defaults: Mp4TrackDefaults = null;
    private defaultSampleFlagsParsed: SampleFlags = null;
    private baseDataOffset: number = 0;

    constructor(
        id: number,
        type: string,
        mimeType: string,
        public referenceAtoms: Atom[],
        public metadataAtom: AudioAtom | VideoAtom,
        public dataOffset: number
    ) {

        super(id, type, mimeType);
        this.lastPts = 0;
        this.lastPtsUnscaledUint = 0;
        this.duration = 0;

        if (this.dataOffset < 0) {
          throw new Error('Invalid file, no sample-data base-offset can be determined');
        }
    }

    // TODO: make this abstract on Track class
    public getResolution(): [number, number] {
        if (!this.isVideo()) {
            throw new Error('Can not get resolution of non-video track');
        }
        const avc1 = this.metadataAtom as Avc1;
        return [avc1.width, avc1.height];
    }

    public getSegmentIndex(): Sidx {
      return this.sidx;
    }

    public getTrackFragmentsRunInfo(): Trun[] {
      return this.trunInfo;
    }

    public getReferenceAtoms(): Atom[] {
      return this.referenceAtoms;
    }

    public addReferenceAtom(atom: Atom) {
        this.referenceAtoms.push(atom);
    }

    public getMetadataAtom(): VideoAtom | AudioAtom {
        return this.metadataAtom;
    }

    public getLastPts(): number {
      return this.lastPts;
    }

    public getTimescale(): number {
        return this.timescale;
    }

    public setTimescale(timescale: number) {
        this.timescale = timescale;
    }

    public setDefaults(defaults: Mp4TrackDefaults) {
        this.defaults = defaults;
        if (defaults.sampleFlags) {
            this.defaultSampleFlagsParsed = Trun.parseFlags(new Uint8Array([
                defaults.sampleFlags & 0xff000000,
                defaults.sampleFlags & 0x00ff0000,
                defaults.sampleFlags & 0x0000ff00,
                defaults.sampleFlags & 0x000000ff,
            ]));
        }
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
    public updateInitialSampleDataOffset(dataOffset: number) {
        this.dataOffset = dataOffset;
    }

    /**
     * Returns the total offset for where to find samples (track-fragment base + file context bytes).
     * Note that this will only lead to the current movie fragment parent box most likely (or to the moov box if unfragmented).
     *
     * Each trun box has it's own offset, which refers to this offset here in order to resolve the absolute position
     * of sample runs.
     */
    public getFinalSampleDataOffset(): number {
        return this.dataOffset + this.baseDataOffset;
    }

    public setSidxAtom(atom: Atom): void {
        this.sidx = atom as Sidx;
        this.lastPtsUnscaledUint = this.sidx.earliestPresentationTime;
        this.lastPts = 1000000 * this.sidx.earliestPresentationTime / this.sidx.timescale;
        this.timescale = this.sidx.timescale;
    }

    public appendFrame(frame: Frame) {
        if (!frame.hasUnnormalizedIntegerTiming()) {
            throw new Error('Frame must have unscaled-int sample timing');
        }
        this.lastPtsUnscaledUint += frame.scaledDuration;
        this.lastPts += frame.duration;
        this.duration += frame.duration;
        this.frames.push(frame);
    }

    // TODO: move the truns array and processTrunAtoms to a own container class (like sample-table)
    public addTrunAtom(atom: Atom): void {
        const trun = atom as Trun;

        this.trunInfo.push(trun);
    }

    public processTrunAtoms() {
        this.trunInfo.forEach((trun: Trun, index) => {

            if (index < this.trunInfoReadIndex) {
              return;
            }

            const timescale: number = this.sidx ? this.sidx.timescale : this.getTimescale();

            if (!this.sidx) {
                //warn('No sidx found, using parent timescale:', timescale);
            }

            const sampleRunDataOffset: number = trun.dataOffset + this.getFinalSampleDataOffset();

            let bytesOffset: number = sampleRunDataOffset;

            for (const sample of trun.samples) {
                const sampleDuration = sample.duration || this.defaults.sampleDuration;
                if (!sampleDuration) {
                    throw new Error('Invalid file, samples have no duration');
                }

                const duration: number = toMicroseconds(sampleDuration, timescale);

                const flags = sample.flags || this.defaultSampleFlagsParsed;
                if (!flags) {
                    //warn('no default sample flags in track sample-run');
                    // in fact the trun box parser should provide a fallback instance of flags in this case
                    //throw new Error('Invalid file, sample has no flags');
                }

                const cto: number = toMicroseconds((sample.compositionTimeOffset || 0), timescale);

                const timeUs = this.lastPts;

                const newFrame = new Frame(
                    flags ? (flags.isSyncFrame ? Frame.IDR_FRAME : Frame.P_FRAME) : Frame.UNFLAGGED_FRAME,
                    timeUs,
                    sample.size,
                    duration,
                    bytesOffset,
                    cto
                );

                newFrame.scaledDuration = sampleDuration;
                newFrame.scaledDecodingTime = this.lastPtsUnscaledUint;
                newFrame.scaledPresentationTimeOffset = sample.compositionTimeOffset || 0;
                newFrame.timescale = timescale;

                this.appendFrame(newFrame);

                //debug(`frame: @ ${newFrame.timeUs} [us] -> ${newFrame.bytesOffset} / ${newFrame.size}`)

                bytesOffset += sample.size;
            }
        })

        this.trunInfoReadIndex = this.trunInfo.length;
    }
}
