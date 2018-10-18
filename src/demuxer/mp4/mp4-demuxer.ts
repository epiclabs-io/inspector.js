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

    constructor(private _track: Mp4Track) {
        if (!_track) {
            throw new Error('Sample-table can not be created without a Track');
        }
    }

    digest() {

    }
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

        this._resetLastTrackInfos();
    }

    public getAtoms(): Atom[] {
      return this.atoms;
    }

    public append(data: Uint8Array): void {
        this.atoms = this._parseAtoms(data);
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
                this._attemptCreateUnknownTrack();
                this._getLastTrackCreated().setSidxAtom(atom);
                break;

            case Atom.tfhd:
                this._attemptCreateUnknownTrack();
                const tfhd: Tfhd = (<Tfhd> atom);
                this._getLastTrackCreated().setBaseDataOffset(tfhd.baseDataOffset);
                this._getLastTrackCreated().setDefaults({
                  sampleDuration: tfhd.defaultSampleDuration,
                  sampleFlags: tfhd.defaultSampleFlags,
                  sampleSize: tfhd.defaultSampleSize
                });
                break;

            case Atom.trun:
                this._attemptCreateUnknownTrack();
                this._getLastTrackCreated().addTrunAtom(atom);
                break;

            case Atom.mdat:
                // in plain old MOV the moov may be at the end of the file (and mdat before)
                if (this._getLastTrackCreated()) {
                    this._getLastTrackCreated().updateInitialSampleDataOffset(this.lastTrackDataOffset);
                    this._getLastTrackCreated().processTrunAtoms();
                }
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
                this.lastSampleTable.chunks = atom as Stsc;
                break;
            case Atom.stsz:
                this._haveSampleTable();
                this.lastSampleTable.sampleSizes = atom as Stsz;
                break;
            case Atom.stco:
                this._haveSampleTable();
                this.lastSampleTable.chunkOffsets = atom as Stco;
                break;
        }
    }

    private _haveSampleTable() {
        if (this.lastSampleTable) {
            return;
        }
        this.lastSampleTable = new Mp4DemuxerSampleTable(this._getLastTrackCreated());
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
     * should be called everytime we create a track
     */
    private _resetLastTrackInfos() {
        this.lastTrackId = 0;
        this.lastTrackDataOffset = -1;
    }

    private _getLastTrackCreated(): Mp4Track {
      return (this.tracks[this.lastTrackId] as Mp4Track) || null;
    }
}
