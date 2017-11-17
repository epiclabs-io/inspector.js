import Frame from './frame';

export default interface ITrackInfo {
    id: number;
    mimeType: string;
    type: string;
    frames: Frame[];
    duration: number;
}
