import BitReader from '../../utils/bit-reader';
import Mp4ParserUtils from './mp4-parser-utils';
import { boxesParsers } from './atoms';
import { Atom, ContainerAtom } from './atoms/atom';
import { Mp4Track } from './mp4-track';
import { Tkhd } from './atoms/tkhd';

export default class Mp4Demuxer {
    public tracks: { [id: string]: Mp4Track; };

    private data: Uint8Array;
    private lastPts: number;
    private atoms: Atom[];
    private lastTrackId: number;

    constructor() {
        this.lastPts = 0;
        this.atoms = [];
        this.tracks = {};
    }

    public demux(data: Uint8Array): void {
        this.atoms = this.parseAtoms(data);
    }

    private parseAtoms(data: Uint8Array, offset: number = 0): Atom[] {
        const atoms: Atom[] = [];
        this.data = data;
        let dataOffset: number = offset;

        while (dataOffset < data.byteLength) {
            const size: number = Mp4ParserUtils.parseUint32(data, dataOffset);
            const type: string = Mp4ParserUtils.parseType(data, dataOffset + 4);
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

            if (atom instanceof ContainerAtom) {
                (atom as ContainerAtom).atoms = this.parseAtoms(boxData, (atom as ContainerAtom).containerDataOffset);
            }
            atoms.push(atom);

            this.processAtom(atom);

            dataOffset = end;
        }
        return atoms;
    }

    private processAtom(atom: Atom): void {
        switch (atom.type) {
            case Atom.tkhd:
                this.lastTrackId = (atom as Tkhd).trackId;
                break;

            case Atom.avcC:
                if (this.lastTrackId > 0) {
                    this.tracks[this.lastTrackId] = new Mp4Track(this.lastTrackId, Mp4Track.MP4_TRACK_H264, atom);
                }
                break;

            case Atom.hvcC:
                if (this.lastTrackId > 0) {
                    this.tracks[this.lastTrackId] = new Mp4Track(this.lastTrackId, Mp4Track.MP4_TRACK_H265, atom);
                }
                break;

            case Atom.mp4a:
                if (this.lastTrackId > 0) {
                    this.tracks[this.lastTrackId] = new Mp4Track(this.lastTrackId, Mp4Track.MP4_TRACK_AAC, atom);
                }
                break;
        }
    }
}
