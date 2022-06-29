import { toMicroseconds } from '../../utils/timescale';
import { FRAME_TYPE } from '../../codecs/h264/nal-units';

import { Track } from '../track';
import { Frame } from '../frame';

import { Atom } from './atoms/atom';
import { AudioAtom } from './atoms/helpers/audio-atom';
import { VideoAtom } from './atoms/helpers/video-atom';
import { Sidx } from './atoms/sidx';
import { Trun, SampleFlags } from './atoms/trun';
import { Avc1 } from './atoms/avc1';

export type Mp4TrackDefaults = {
  sampleDuration: number;
  sampleSize: number;
  sampleFlags: number;
}

export class Mp4Track extends Track {

    private baseDataOffset: number = 0;
    private baseMediaDecodeTime: number = 0;

    private endDts: number = 0;

    private defaults: Mp4TrackDefaults[] = [];
    private defaultSampleFlagsParsed: (SampleFlags | null)[] = [];
    private sidx: Sidx = null;
    private trunInfo: Trun[] = [];
    private trunInfoReadIndex: number = 0;

    constructor(
        id: number,
        type: string,
        mimeType: string,
        public referenceAtoms: Atom[],
        public metadataAtom: AudioAtom | VideoAtom,
        public dataOffset: number
    ) {
        super(id, type, mimeType);

        if (this.dataOffset < 0) {
          throw new Error('Invalid file, no sample-data base-offset can be determined');
        }
    }

    /**
     * post: endDts ie duration incremented by frame duration
     * @param frame
     *
     */
    public appendFrame(frame: Frame) {
        this.endDts += frame.duration;
        this.frames.push(frame);
    }

    public flush() {

        this.endDts = 0;

        this.trunInfo.length = 0;
        this.trunInfoReadIndex = 0;
        this.defaults.length = 0;
        this.defaultSampleFlagsParsed.length = 0;
        super.flush();
    }

    public getDuration() {
        return this.frames.length ?
            this.endDts - this.frames[0].dts : 0;
    }

    public getTimescale(): number {
        const timescale: number = this.sidx ?
            this.sidx.timescale : super.getTimescale();
        return timescale;
    }

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

    public setBaseMediaDecodeTime(baseDts: number) {
        this.baseMediaDecodeTime = baseDts;
        this.endDts = baseDts;
    }

    public getBaseMediaDecodeTime(): number {
        return this.baseMediaDecodeTime;
    }

    public addDefaults(defaults: Mp4TrackDefaults) {
        this.defaults.push(defaults);
        if (defaults.sampleFlags) {
            this.defaultSampleFlagsParsed.push(Trun.parseFlags(new Uint8Array([
                defaults.sampleFlags & 0xff000000,
                defaults.sampleFlags & 0x00ff0000,
                defaults.sampleFlags & 0x0000ff00,
                defaults.sampleFlags & 0x000000ff,
            ])));
        } else {
            this.defaultSampleFlagsParsed.push(null);
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
        this.endDts = this.sidx.earliestPresentationTime;
        this.setTimescale(this.sidx.timescale);
    }

    // TODO: move the truns array and processTrunAtoms to a own container class (like sample-table)
    public addTrunAtom(atom: Atom): void {
        const trun = atom as Trun;

        this.trunInfo.push(trun);
    }

    public processTrunAtoms() {
        this.trunInfo.forEach((trun: Trun, trunIndex) => {

            if (trunIndex < this.trunInfoReadIndex) {
              return;
            }

            const sampleRunDataOffset: number = trun.dataOffset + this.getFinalSampleDataOffset();

            let bytesOffset: number = sampleRunDataOffset;

            for (let i = 0; i < trun.samples.length; i++) {
                const sample = trun.samples[i];

                const flags = sample.flags || this.defaultSampleFlagsParsed[trunIndex];
                if (!flags) {
                    //warn('no default sample flags in track sample-run');
                    // in fact the trun box parser should provide a fallback instance of flags in this case
                }

                const sampleDuration = sample.duration || this.defaults[trunIndex]?.sampleDuration;
                if (!sampleDuration) {
                    throw new Error('Invalid file, samples have no duration');
                }

                const duration: number = sampleDuration;
                const dts = this.endDts;
                const cto: number = sample.compositionTimeOffset || 0;

                const frameSize = sample.size || this.defaults[trunIndex]?.sampleSize;
                if (!frameSize) throw new Error('Frame has to have either sample-size of trun-entry or track default');

                const frameType = flags ? (flags.isSyncFrame ? FRAME_TYPE.I : FRAME_TYPE.P) : FRAME_TYPE.NONE

                const newFrame = new Frame(
                    frameType,
                    dts,
                    cto,
                    duration,
                    frameSize,
                    bytesOffset
                );

                this.appendFrame(newFrame);

                bytesOffset += frameSize;
            }
        });

        this.trunInfoReadIndex = this.trunInfo.length;
    }
}
