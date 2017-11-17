import Track from '../track';
import IDemuxer from '../demuxer';
export default class Mp4Demuxer implements IDemuxer {
    tracks: {
        [id: number]: Track;
    };
    private data;
    private atoms;
    private lastTrackId;
    constructor();
    append(data: Uint8Array): void;
    end(): void;
    private parseAtoms(data, offset?);
    private processAtom(atom);
    private checkTrack();
}
