import ByteParserUtils from '../../utils/byte-parser-utils';
import { boxesParsers } from './atoms';
import { Atom, ContainerAtom } from './atoms/atom';
import { Tfhd } from './atoms/tfhd';
import { Track } from '../track';
import { Mp4Track } from './mp4-track';
import { Tkhd } from './atoms/tkhd';
import { IDemuxer } from '../demuxer';
import { Frame } from '../frame';

export class Mp4Demuxer implements IDemuxer {
    public tracks: { [id: number] : Track; };

    private data: Uint8Array;
    private atoms: Atom[];
    private lastTrackId: number;
    private lastTrackDataOffset: number;

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
        this.data = data;
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
            atom.isCompleted = dataOffset + size < data.byteLength;

            if (atom instanceof ContainerAtom) {
                (atom as ContainerAtom).atoms = this.parseAtoms(boxData, (atom as ContainerAtom).containerDataOffset);
            }
            atoms.push(atom);
            this.processAtom(atom, dataOffset);
            dataOffset = end;
        }
        return atoms;
    }

    private processAtom(atom: Atom, dataOffset: number): void {
        switch (atom.type) {

            // FIXME !!! `trex` box can contain super based set of default sample-duration/flags/size ...
            // (those are often repeated inside the tfhd when it is a fragmented file however, but still ... :)

            // FIXME: much of this isn't going to work for plain old unfrag'd MP4 and MOV :)

            case Atom.ftyp:
            case Atom.moov:
            case Atom.moof:
                this.lastTrackDataOffset = dataOffset;
                break;

            case Atom.tkhd:
                this.lastTrackId = (atom as Tkhd).trackId;
                break;

            case Atom.avcC:
                if (this.lastTrackId > 0) {
                    this.tracks[this.lastTrackId] = new Mp4Track(
                        this.lastTrackId,
                        Track.TYPE_VIDEO,
                        Track.MIME_TYPE_AVC,
                        atom,
                        this.lastTrackDataOffset
                      );
                    //this.resetLastTrackInfos();
                }
                break;

            case Atom.hvcC:
                if (this.lastTrackId > 0) {
                    this.tracks[this.lastTrackId] = new Mp4Track(
                        this.lastTrackId,
                        Track.TYPE_VIDEO,
                        Track.MIME_TYPE_HEVC,
                        atom,
                        this.lastTrackDataOffset
                      );
                    //this.resetLastTrackInfos();
                }
                break;

            case Atom.mp4a:
                if (this.lastTrackId > 0) {
                    this.tracks[this.lastTrackId] = new Mp4Track(
                        this.lastTrackId,
                        Track.TYPE_AUDIO,
                        Track.MIME_TYPE_AAC,
                        atom,
                        this.lastTrackDataOffset
                      );
                    //this.resetLastTrackInfos();
                }
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
                this.getCurrentTrack().updateSampleDataOffset(this.lastTrackDataOffset);
                this.getCurrentTrack().addTrunAtom(atom);
                break;
        }
    }

    /**
     * Creates a track in case we haven't found a codec box
     */
    private ensureTrack(): void {
        if (!this.lastTrackId || !this.tracks[this.lastTrackId]) {
            this.lastTrackId = 1;
            this.tracks[this.lastTrackId] = new Mp4Track(
                this.lastTrackId,
                Track.TYPE_UNKNOWN,
                Track.MIME_TYPE_UNKNOWN,
                null,
                this.lastTrackDataOffset >= 0 ? this.lastTrackDataOffset  : 0
              );
              //this.resetLastTrackInfos();
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
