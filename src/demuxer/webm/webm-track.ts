import { Track } from '../track';
import { Frame } from '../frame';

export class ITrackInfo {
    TrackNumber: number;
    TrackUID: number;
    TrackType: number;
    DefaultDuration: number;
    TrackTimecodeScale: number;
    CodecID: string;
    CodecName: string;
    Video?: any;
    Audio?: any;
}

export class WebMTrack extends Track {
    private lastPts: number;
    private defaultDuration: number;
    private timescale: number;

    constructor(info: ITrackInfo) {
        const type: string = WebMTrack.getType(info.TrackType);
        super(info.TrackNumber, 'video', type + '/' + info.CodecName);

        this.lastPts = 0;
        this.defaultDuration = info.DefaultDuration;
        this.timescale = info.TrackTimecodeScale;
    }

    private static getType(type: number): string {
        switch (type) {
            case 1:
            return Track.TYPE_VIDEO;

            case 2:
            return Track.TYPE_AUDIO;

            case 3:
            return Track.TYPE_COMPLEX;

            case 0x10:
            return Track.TYPE_LOGO;

            case 0x11:
            return Track.TYPE_TEXT;

            case 0x12:
            return Track.TYPE_BUTTONS;

            case 0x20:
            return Track.TYPE_CONTROL;

            default:
            return Track.TYPE_UNKNOWN;
        }
    }

    public getFrames(): Frame[] {
        return this.frames;
    }
}
