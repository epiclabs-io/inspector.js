import { MpegTSDemuxer } from './demuxer/ts/mpegts-demuxer';
import { Mp4Demuxer } from './demuxer/mp4/mp4-demuxer';
import { WebMDemuxer } from './demuxer/webm/webm-demuxer';
import { WebWorker } from './utils/web-worker';

export { MpegTSDemuxer } from './demuxer/ts/mpegts-demuxer';
export { Mp4Demuxer } from './demuxer/mp4/mp4-demuxer';
export { WebMDemuxer } from './demuxer/webm/webm-demuxer';
export { FrameRate, Size } from './codecs/video-types';
export { IDemuxer, TracksHash } from './demuxer/demuxer';
export { Track } from './demuxer/track';
export { Frame } from './demuxer/frame';
export { Atom, ContainerAtom } from './demuxer/mp4/atoms/atom';
export { TSTrack } from './demuxer/ts/ts-track';

export function createMpegTSDemuxer(): MpegTSDemuxer { // Q: these methods should return IDemuxer to maintain abstraction solid?
    return new MpegTSDemuxer();
}

export function createMp4Demuxer(): Mp4Demuxer {
    return new Mp4Demuxer();
}

export function createWebMDemuxer(): WebMDemuxer {
    return new WebMDemuxer();
}

export enum InspectorActionType {
    CREATE_MP4_DEMUX_JOB = 'CREATE_MP4_DEMUX_JOB',
    CREATE_MP4_DEMUX_JOB_RESPONSE = 'CREATE_MP4_DEMUX_JOB_RESPONSE',
    CREATE_MPEGTS_DEMUX_JOB = 'CREATE_MPEGTS_DEMUX_JOB',
    CREATE_MPEGTS_DEMUX_JOB_RESPONSE = 'CREATE_MPEGTS_DEMUX_JOB_RESPONSE',
    CREATE_WEBM_DEMUX_JOB = 'CREATE_WEBM_DEMUX_JOB',
    CREATE_WEBM_DEMUX_JOB_RESPONSE = 'CREATE_WEBM_DEMUX_JOB_RESPONSE',
    EXECUTE_JOB_APPEND = 'EXECUTE_JOB_APPEND',
    EXECUTE_JOB_APPEND_RESPONSE = 'EXECUTE_JOB_APPEND_RESPONSE',
    END_JOB = 'END_JOB',
    END_JOB_RESPONSE = 'END_JOB_RESPONSE',
}

export interface InspectorAction {
    type: InspectorActionType;
    job: string;
    data: any;
}

declare var global: any;
global.onmessage = WebWorker.onMessage;
