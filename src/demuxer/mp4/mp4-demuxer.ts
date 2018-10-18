import ByteParserUtils from '../../utils/byte-parser-utils';

import { Track } from '../track';
import { Mp4Track } from './mp4-track';

import { IDemuxer, TracksHash } from '../demuxer';

import { AudioAtom } from './atoms/helpers/audio-atom';
import { VideoAtom } from './atoms/helpers/video-atom';

import { boxesParsers } from './atoms';
import { Atom, ContainerAtom } from './atoms/atom';

import { Tfhd } from './atoms/tfhd';
import { Tkhd } from './atoms/tkhd';
import { AvcC } from './atoms/avcC';
import { Hev1 } from './atoms/hev1';
import { Stts } from './atoms/stts';
import { Stsc } from './atoms/stsc';
import { Stsz } from './atoms/stsz';
import { Ctts } from './atoms/ctts';

import {getLogger} from '../../utils/logger';
import { Stss } from './atoms/stss';
import { Stco } from './atoms/stco';

const {log, warn} = getLogger('Mp4Demuxer');

export class Mp4DemuxerSampleTable {
    decodingTimestamps: Stts;
    syncSamples: Stss;
    compositionTimestampOffsets: Ctts;
    chunks: Stsc;
    sampleSizes: Stsz;
    chunkOffsets: Stco
};

export class Mp4Demuxer implements IDemuxer {
    public tracks: TracksHash = {};

    private atoms: Atom[] = [];

    // parsing stack
    private lastTrackId: number;
    private lastTrackDataOffset: number;
    private lastAudioVideoAtom: AudioAtom | VideoAtom = null;
    private lastCodecDataAtom: AvcC | Hev1 = null;
    private lastSampleTable: Mp4DemuxerSampleTable = null;

    constructor() {
        this.atoms = [];
        this.tracks = {};

        this.resetLastTrackInfos();
    }

    public getAtoms(): Atom[] {
      return this.atoms;
    }

    public append(data: Uint8Array): void {
        this.atoms = this.parseAtoms(data);
        this.updateTracks();
    }

    public end(): void {
        this.updateTracks();
    }

    private updateTracks(): void {
        for (const trackId in this.tracks) {
            if (this.tracks.hasOwnProperty(trackId)) {
                this.tracks[trackId].update();
            }
        }
    }

    private parseAtoms(data: Uint8Array, offset: number = 0): Atom[] {
        const atoms: Atom[] = [];

        let dataOffset: number = offset;
        while (dataOffset < data.byteLength) {
            const size: number = ByteParserUtils.parseUint32(data, dataOffset);
            const type: string = ByteParserUtils.parseIsoBoxType(data, dataOffset + 4);
            const end: number = size > 1 ? dataOffset + size : data.byteLength;
            const boxData: Uint8Array = data.subarray(dataOffset + 8, end);

            // parse
            let atom: Atom;
            if (boxesParsers[type]) {
                atom = boxesParsers[type](boxData);
            }

            if (!atom) {
                // don't know how to parse this box
                // so let's just add it without parsing its content
                if (Atom.isContainerBox(type)) {
                    atom = new ContainerAtom(type, boxData.byteLength);
                } else {
                    atom = new Atom(type, boxData.byteLength);
                }
            }

            atoms.push(atom);

            this.processAtom(atom, dataOffset);

            if (atom instanceof ContainerAtom) {
                (atom as ContainerAtom).atoms = this.parseAtoms(boxData, (atom as ContainerAtom).containerDataOffset);
            }

            dataOffset = end;
        }
        return atoms;
    }

    private processAtom(atom: Atom, dataOffset: number): void {
        switch (atom.type) {

            // FIXME !!! `trex` box can contain super based set of default sample-duration/flags/size ...
            // (those are often repeated inside the tfhd when it is a fragmented file however, but still ... :)

            // FIXME: much of this isn't going to work for plain old unfrag'd MP4 and MOV :)

            case Atom.trak:
                this.lastSampleTable = null;
            case Atom.ftyp:
            case Atom.moov:
            case Atom.moof:
                this.lastTrackDataOffset = dataOffset;
                break;

            case Atom.tkhd:
                this.lastTrackId = (atom as Tkhd).trackId;
                break;

            case Atom.hvcC:
                this.lastCodecDataAtom = atom as Hev1;
                this._attemptCreateTrack(Track.TYPE_VIDEO, Track.MIME_TYPE_HEVC, atom);
                break;
            case Atom.avcC:
                this.lastCodecDataAtom = atom as AvcC;
                this._attemptCreateTrack(Track.TYPE_VIDEO, Track.MIME_TYPE_AVC, atom);
                break;

            // H264
            case Atom.avc1:
                this.lastAudioVideoAtom = atom as (AudioAtom | VideoAtom);
                break;

            // H265
            case Atom.hev1:
                this.lastAudioVideoAtom = atom as AudioAtom | VideoAtom;
                break;

            // AAC
            case Atom.mp4a:
                this.lastAudioVideoAtom = atom as AudioAtom | VideoAtom;
                this._attemptCreateTrack(Track.TYPE_AUDIO, Track.MIME_TYPE_AAC, atom);
                break;

            case Atom.sidx:
                this.ensureTrack();
                this.getCurrentTrack().setSidxAtom(atom);
                break;

            case Atom.tfhd:
                this.ensureTrack();
                const tfhd: Tfhd = (<Tfhd> atom);
                this.getCurrentTrack().setBaseDataOffset(tfhd.baseDataOffset);
                this.getCurrentTrack().setDefaults({
                  sampleDuration: tfhd.defaultSampleDuration,
                  sampleFlags: tfhd.defaultSampleFlags,
                  sampleSize: tfhd.defaultSampleSize
                });
                break;

            case Atom.trun:
                this.ensureTrack();
                this.getCurrentTrack().addTrunAtom(atom);
                break;

            case Atom.mdat:
                // in plain old MOV the moov may be at the end of the file (and mdat before)
                if (this.getCurrentTrack()) {
                    this.getCurrentTrack().updateInitialSampleDataOffset(this.lastTrackDataOffset);
                    this.getCurrentTrack().readTrunAtoms();
                }
                break;

            case Atom.stbl:
                if (this.lastSampleTable !== null) {
                    throw new Error('Sample-table already existing, but should be null');
                }
                this.lastSampleTable = new Mp4DemuxerSampleTable();
                break;
            case Atom.stts:
                this.lastSampleTable.decodingTimestamps = atom as Stts;
                break;
            case Atom.stss:
                break;
            case Atom.ctts:
                break;
            case Atom.stsc:
                break;
            case Atom.stsz:
                break;
            case Atom.stco:
                break;
        }

    }

    private _attemptCreateTrack(type: string, mime: string, ref: Atom) {
        if (this.lastTrackId > 0) {
            log('creating new track:', type, mime)
            this.tracks[this.lastTrackId] = new Mp4Track(
                this.lastTrackId,
                type,
                mime,
                ref,
                this.lastAudioVideoAtom,
                this.lastTrackDataOffset
              );
        }
    }

    /**
     * Creates a track in case we haven't found a codec box
     */
    private ensureTrack(): void {
        if (!this.lastTrackId || !this.tracks[this.lastTrackId]) {
            warn('creating unknown-typed track');
            this.lastTrackId = 1;
            this.tracks[this.lastTrackId] = new Mp4Track(
                this.lastTrackId,
                Track.TYPE_UNKNOWN,
                Track.MIME_TYPE_UNKNOWN,
                null,
                null,
                this.lastTrackDataOffset > 0 ? this.lastTrackDataOffset : 0
              );
        }
    }

    /**
     * should be called everytime we create a track
     */
    private resetLastTrackInfos() {
        this.lastTrackId = 0;
        this.lastTrackDataOffset = -1;
    }

    private getCurrentTrack(): Mp4Track {
      return (this.tracks[this.lastTrackId] as Mp4Track);
    }
}
