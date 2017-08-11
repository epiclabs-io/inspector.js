import {Atom} from './atoms/atom';

export class Mp4Track {
    public static MP4_TRACK_H264: string = 'H264';
    public static MP4_TRACK_H265: string = 'H265';
    public static MP4_TRACK_AAC: string = 'AAC';

    constructor(public id: number, public type: string, public referenceAtom: Atom) {
    }
}
