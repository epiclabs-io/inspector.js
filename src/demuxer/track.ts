import { Frame } from './frame';
import { toSecondsFromMicros } from '../utils/timescale';

export abstract class Track {

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

    private _timeScale: number = NaN;

    constructor(public id: number,
        public type: string /* fixme: make enum type */,
        public mimeType: string) {}

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

    public update(): void {
        this.frames = this.getFrames().sort((a: Frame, b: Frame): number => {
            return a.dts - b.dts;
        });
    }

    public flush() {
        this.frames.length = 0;
    }

    abstract getResolution(): [number, number];

    public getFrames(): Frame[] {
        return this.frames;
    }

    public getTimescale() {
        return this._timeScale;
    }

    public setTimescale(timeScale: number) {
        if (!Number.isSafeInteger(timeScale)) {
            throw new Error(`Track timescale has to be safe-integer value`);
        }
        this._timeScale = timeScale;
    }

    /**
     * @deprecated
     */
     public getMetadata() {
        return {}
    }
}
