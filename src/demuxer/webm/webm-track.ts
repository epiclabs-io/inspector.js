import { Track } from '../track';
import { Frame } from '../frame';
import { ITrackInfo } from './elements/track-info';

export class WebMTrack extends Track {
    private lastPts: number;
    private nsPerFrame: number;
    private timecodeScale: number;
    private codec: string;
    private metadata: any;

    constructor(info: ITrackInfo, metadata: any) {
        const type: string = WebMTrack.getType(info.TrackType);
        const codec: string = info.CodecName || WebMTrack.getCodecNameFromID(info.CodecID);
        super(info.TrackNumber, type, type + '/' + codec);

        this.type = type;
        this.codec = codec;
        this.metadata = metadata;
        this.lastPts = 0;
        this.nsPerFrame = info.DefaultDuration;
        this.timecodeScale = info.TrackTimecodeScale;
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

    private static getCodecNameFromID(codecID: string): string {
        if (!codecID) {
            return null;
        }
        const pos: number = codecID.indexOf('_');
        if (pos < 0) {
            return codecID;
        }
        return codecID.substr(pos + 1);
    }

    public getFrames(): Frame[] {
        return this.frames;
    }

    public getMetadata(): any {
        if (!this.metadata) {
            return null;
        }
        if (this.type === Track.TYPE_VIDEO) {
            return {
                codecSize: {
                    height: this.metadata.PixelHeight,
                    width: this.metadata.PixelWidth
                },
                presentSize: {
                    height: this.metadata.DisplayHeight,
                    width: this.metadata.DisplayWidth,
                }
            };
        } else if (this.type === Track.TYPE_AUDIO) {
            return {
                sampleRate: this.metadata.SamplingFrequency
            };
        }
    }
}
