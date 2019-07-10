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
import { Stss } from './atoms/stss';
import { Stco } from './atoms/stco';
import { Mdhd } from './atoms/mdhd';

import {getLogger, LoggerLevels} from '../../utils/logger';

import { Mp4SampleTable } from './mp4-sample-table';
import { Esds } from './atoms/esds';
import { Mvhd } from './atoms/mvhd';

const {log, warn} = getLogger('Mp4Demuxer', LoggerLevels.ON);

export class Mp4Demuxer implements IDemuxer {
    public tracks: TracksHash = {};

    private atoms: Atom[] = [];

    // track specific parsing stack
    private lastTrackId: number;
    private lastTrackDataOffset: number;
    private lastAudioVideoAtom: AudioAtom | VideoAtom = null;
    private lastCodecDataAtom: AvcC | Hev1 | Esds = null;
    private lastSampleTable: Mp4SampleTable = null;
    private lastTimescale: number = null;

    constructor() {
        this.atoms = [];
        this.tracks = {};

        this._resetLastTrackInfos();
    }

    public getAtoms(): Atom[] {
      return this.atoms;
    }

    public append(data: Uint8Array): void {
        this.atoms = this._parseAtoms(data);

        // "HACK" digest any last sample-table
        this._digestSampleTable();

        this._updateTracks();
    }

    public end(): void {
        this._updateTracks();
    }

    private _updateTracks(): void {
        for (const trackId in this.tracks) {
            if (this.tracks.hasOwnProperty(trackId)) {
                this.tracks[trackId].update();
            }
        }
    }

    private _parseAtoms(data: Uint8Array, offset: number = 0): Atom[] {
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

            this._processAtom(atom, dataOffset);

            if (atom instanceof ContainerAtom) {
                (atom as ContainerAtom).atoms = this._parseAtoms(boxData, (atom as ContainerAtom).containerDataOffset);
            }

            dataOffset = end;
        }

        return atoms;
    }

    private _processAtom(atom: Atom, dataOffset: number): void {
        switch (atom.type) {

            // FIXME !!! `trex` box can contain super based set of default sample-duration/flags/size ...
            // (those are often repeated inside the tfhd when it is a fragmented file however, but still ... :)

            case Atom.trak:

                this._digestSampleTable();
                this.lastTrackId = -1;
                this.lastTimescale = null;
                this.lastCodecDataAtom = null;
                this.lastAudioVideoAtom = null;

            case Atom.ftyp:
            case Atom.moov:
            case Atom.moof:
                // (only) needed for fragmented mode
                this.lastTrackDataOffset = dataOffset;

                break;

            // Moov box / "initialization"-data and SIDX

            case Atom.sidx:
                this._attemptCreateUnknownTrack();
                this._getLastTrackCreated().setSidxAtom(atom);
                break;

            case Atom.tkhd:
                this.lastTrackId = (atom as Tkhd).trackId;
                break;

            // Inside moov: Codec data -> create "known" tracks

            // stsd-boxed codec identifying atoms

            // AAC
            case Atom.mp4a:
                this.lastAudioVideoAtom = atom as AudioAtom | VideoAtom;
                break;

            // H264
            case Atom.avc1:
                this.lastAudioVideoAtom = atom as (AudioAtom | VideoAtom);
                break;

            // H265
            case Atom.hev1:
                this.lastAudioVideoAtom = atom as AudioAtom | VideoAtom;
                break;

            // AVC/HEVC -> H264/5
            case Atom.hvcC:
                this.lastCodecDataAtom = atom as Hev1;
                this._attemptCreateTrack(Track.TYPE_VIDEO, Track.MIME_TYPE_HEVC, atom);
                break;

            case Atom.avcC:
                this.lastCodecDataAtom = atom as AvcC;
                this._attemptCreateTrack(Track.TYPE_VIDEO, Track.MIME_TYPE_AVC, atom);
                break;

            case Atom.esds:
                this._attemptCreateTrack(Track.TYPE_AUDIO, Track.MIME_TYPE_AAC, atom);
                this.lastCodecDataAtom = atom as Esds;

            // Fragmented-mode ...

            case Atom.tfhd:
                // FIXME: should be handled differently by looking at other things inside fragments and mapping eventually to previously parsed moov
                this._attemptCreateUnknownTrack();
                const tfhd: Tfhd = atom as Tfhd;
                this._getLastTrackCreated().setBaseDataOffset(tfhd.baseDataOffset);
                this._getLastTrackCreated().setDefaults({
                  sampleDuration: tfhd.defaultSampleDuration,
                  sampleFlags: tfhd.defaultSampleFlags,
                  sampleSize: tfhd.defaultSampleSize
                });
                break;

            case Atom.trun:
                // FIXME: should be handled differently by looking at other things inside fragments and mapping eventually to previously parsed moov
                this._attemptCreateUnknownTrack();
                this._getLastTrackCreated().addTrunAtom(atom);
                break;

            case Atom.mvhd:
                this.lastTimescale = (atom as Mvhd).timescale;
                break;

            // Plain-old MOV ie unfragmented mode ...

            case Atom.mdhd:
                this.lastTimescale = (atom as Mdhd).timescale;
                break;

            case Atom.stbl:
                if (this.lastSampleTable !== null) {
                    throw new Error('Sample-table should not exist yet');
                }
                break;
            case Atom.stts:
                this._haveSampleTable();
                this.lastSampleTable.decodingTimestamps = atom as Stts;
                break;
            case Atom.stss:
                this._haveSampleTable();
                this.lastSampleTable.syncSamples = atom as Stss;
                break;
            case Atom.ctts:
                this._haveSampleTable();
                this.lastSampleTable.compositionTimestampOffsets = atom as Ctts;
                break;
            case Atom.stsc:
                this._haveSampleTable();
                this.lastSampleTable.samplesToChunkBox = atom as Stsc;
                break;
            case Atom.stsz:
                this._haveSampleTable();
                this.lastSampleTable.sampleSizes = atom as Stsz;
                break;
            case Atom.stco:
                this._haveSampleTable();
                this.lastSampleTable.chunkOffsetBox = atom as Stco;
                break;

            // Sample data ...

            case Atom.mdat:
                // in plain old MOV the moov may be at the end of the file (and mdat before)
                if (this._getLastTrackCreated()) {
                    log('updating sample-data offset:', this.lastTrackDataOffset)
                    this._getLastTrackCreated().updateInitialSampleDataOffset(this.lastTrackDataOffset);
                    log('processing current track-run');
                    this._getLastTrackCreated().processTrunAtoms();
                }
                break;
        }
    }

    private _haveSampleTable() {
        if (this.lastSampleTable) {
            return;
        }
        this.lastSampleTable = new Mp4SampleTable(this._getLastTrackCreated());
    }


    private _digestSampleTable() {
        if (this.lastSampleTable) {
            this.lastSampleTable.digest();
            this.lastSampleTable = null;
        }
    }

    private _attemptCreateTrack(type: string, mime: string, ref: Atom) {
        if (!this.lastTrackId) {
            throw new Error('No track-id set');
        }

        if (this.tracks[this.lastTrackId]) {
            log('adding ref-atom to existing track with id:', this.lastTrackId, 'mime:', mime, 'type:', type);
            (this.tracks[this.lastTrackId] as Mp4Track).addReferenceAtom(ref);
            return;
        }

        log('creating new track:', type, mime, 'id:', this.lastTrackId)
        const track = new Mp4Track(
            this.lastTrackId,
            type,
            mime,
            [ref],
            this.lastAudioVideoAtom,
            this.lastTrackDataOffset
            );
        if (this.lastTimescale !== null) {
            log('setting parent timescale on track:', this.lastTimescale);
            track.setTimescale(this.lastTimescale);
        }
        this.tracks[this.lastTrackId] = track;

    }

    /**
     * Creates a track in case we haven't found a codec box
     */
    private _attemptCreateUnknownTrack(): void {
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
     * Should be called everytime we create a track
     */
    private _resetLastTrackInfos() {
        this.lastTrackId = 0;
        this.lastTrackDataOffset = -1;
    }

    private _getLastTrackCreated(): Mp4Track {
      return (this.tracks[this.lastTrackId] as Mp4Track) || null;
    }
}
