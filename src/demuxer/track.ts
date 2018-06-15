import { Frame, MICROSECOND_TIMESCALE } from './frame';

export class Track {
    // FIXME: should be an enum type
    public static TYPE_VIDEO: string = 'video';
    public static TYPE_AUDIO: string = 'audio';
    public static TYPE_TEXT: string = 'text';
    public static TYPE_COMPLEX: string = 'complex';
    public static TYPE_LOGO: string = 'logo';
    public static TYPE_BUTTONS: string = 'buttons';
    public static TYPE_CONTROL: string = 'control';
    public static TYPE_UNKNOWN: string = 'unknown';

    // Here we don't need an enum
    public static MIME_TYPE_AAC: string = 'audio/mp4a-latm';
    public static MIME_TYPE_AVC: string = 'video/avc';
    public static MIME_TYPE_HEVC: string = 'video/hevc';
    public static MIME_TYPE_MPEG: string = 'audio/mpeg';
    public static MIME_TYPE_MPEG_L1: string = 'audio/mpeg-L1';
    public static MIME_TYPE_MPEG_l2: string = 'audio/mpeg-L2';
    public static MIME_TYPE_ID3: string = 'application/id3';
    public static MIME_TYPE_UNKNOWN: string = 'unknown';

    protected frames: Frame[] = [];
    protected duration: number = NaN;

    constructor(public id: number, public type: string /* fixme: make enum type */, public mimeType: string) {
        this.frames = [];
    }

    public isVideo() {
        return this.type === Track.TYPE_VIDEO;
    }

    public isAudio() {
        return this.type === Track.TYPE_AUDIO;
    }

    public isText() {
        return this.type === Track.TYPE_TEXT;
    }

    public isOther() {
        return this.type !== Track.TYPE_TEXT
            && this.type !== Track.TYPE_AUDIO
            && this.type !== Track.TYPE_VIDEO;
    }

    public getFrames(): Frame[] {
        return this.frames;
    }

    public getDuration(): number {
        return this.duration;
    }

    public getDurationInSeconds(): number {
        return this.getDuration() / MICROSECOND_TIMESCALE;
    }

    public getMetadata(): {} { // FIXME: Make this a string-to-any hash
        return {};
    }

    public update(): void {
        this.frames = this.getFrames().sort((a: Frame, b: Frame): number => {
            return a.timeUs - b.timeUs;
        });

        this.duration = this.getDuration();
    }
}
