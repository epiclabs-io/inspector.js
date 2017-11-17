import Frame from './frame';
export default class Track {
    id: number;
    type: string;
    mimeType: string;
    static TYPE_VIDEO: string;
    static TYPE_AUDIO: string;
    static TYPE_TEXT: string;
    static TYPE_UNKNOWN: string;
    static MIME_TYPE_AAC: string;
    static MIME_TYPE_AVC: string;
    static MIME_TYPE_HEVC: string;
    static MIME_TYPE_MPEG: string;
    static MIME_TYPE_MPEG_L1: string;
    static MIME_TYPE_MPEG_l2: string;
    static MIME_TYPE_ID3: string;
    static MIME_TYPE_UNKNOWN: string;
    frames: Frame[];
    duration: number;
    constructor(id: number, type: string, mimeType: string);
    getFrames(): Frame[];
    getDuration(): number;
    update(): void;
}
