import { Frame } from './frame';

export enum TrackType {
    VIDEO,
    AUDIO,
    TEXT,
    COMPLEX,
    LOGO,
    BUTTONS,
    CONTROL,
    METADATA,
    UNKNOWN
}

export abstract class Track {

    public static MIME_TYPE_AAC: string = 'audio/mp4a-latm';
    public static MIME_TYPE_AVC: string = 'video/avc';
    public static MIME_TYPE_HEVC: string = 'video/hevc';
    public static MIME_TYPE_MPEG: string = 'audio/mpeg';
    public static MIME_TYPE_MPEG_L1: string = 'audio/mpeg-L1';
    public static MIME_TYPE_MPEG_l2: string = 'audio/mpeg-L2';
    public static MIME_TYPE_ID3: string = 'application/id3';
    public static MIME_TYPE_UNKNOWN: string = 'unknown';

    private _timeScale: number = NaN;

    constructor(public id: number,
        public type: TrackType,
        public mimeType: string) {}

    abstract readonly frames: Frame[];

    public isAv() {
        return this.type === TrackType.AUDIO || this.type === TrackType.VIDEO;
    }

    public flush() {
        this.frames.length = 0;
    }

    public getFrames(): Frame[] {
        return this.frames;
    }

    public hasTimescale() {
        return Number.isFinite(this.getTimescale());
    }

    public getTimescale() {
        return this._timeScale;
    }

    public setTimescale(timeScale: number) {
        if (timeScale <= 0 || !Number.isSafeInteger(timeScale)) {
            throw new Error(`Track timescale has to be strictly positive safe-integer value`);
        }
        this._timeScale = timeScale;
    }

    /**
     * @deprecated
     */
     public getMetadata() {
        return {}
    }

    public abstract getResolution(): [number, number];
}
