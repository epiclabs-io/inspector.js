import Frame from './frame';

export default class Track {
    public static TYPE_VIDEO: string = 'video';
    public static TYPE_AUDIO: string = 'audio';
    public static TYPE_TEXT: string = 'text';
    public static TYPE_UNKNOWN: string = 'unknown';

    public static MIME_TYPE_AAC: string = 'audio/mp4a-latm';
    public static MIME_TYPE_AVC: string = 'video/avc';
    public static MIME_TYPE_HEVC: string = 'video/hevc';
    public static MIME_TYPE_MPEG: string = 'audio/mpeg';
    public static MIME_TYPE_MPEG_L1: string = 'audio/mpeg-L1';
    public static MIME_TYPE_MPEG_l2: string = 'audio/mpeg-L2';
    public static MIME_TYPE_ID3: string = 'application/id3';
    public static MIME_TYPE_UNKNOWN: string = 'unknown';

    public frames: Frame[];
    public duration: number;
    public metadata: { [id: number] : Object };

    constructor(public id: number, public type: string, public mimeType: string) {
        this.frames = [];
    }

    public getFrames(): Frame[] {
        return [];
    }

    public getDuration(): number {
        return this.duration;
    }

    public getMetadata(): {} {
        return {};
    }

    public update(): void {
        this.frames = this.getFrames().sort((a: Frame, b: Frame): number => {
            return a.timeUs - b.timeUs;
        });

        this.duration = this.getDuration();
        this.metadata = this.getMetadata();
    }
}
