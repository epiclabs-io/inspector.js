import MpegTSDemuxer from './demuxer/ts/mpegts-demuxer';
import Mp4Demuxer from './demuxer/mp4/mp4-demuxer';
import IDemuxer from './demuxer/demuxer';
import WebWorker from './utils/web-worker';

export function createMpegTSDemuxer(): MpegTSDemuxer {
    return new MpegTSDemuxer();
}

export function createMp4Demuxer(): Mp4Demuxer {
    return new Mp4Demuxer();
}

export enum InspectorActionType {
    CREATE_MP4_DEMUX_JOB = 'CREATE_MP4_DEMUX_JOB',
    CREATE_MP4_DEMUX_JOB_RESPONSE = 'CREATE_MP4_DEMUX_JOB_RESPONSE',
    CREATE_MPEGTS_DEMUX_JOB = 'CREATE_MPEGTS_DEMUX_JOB',
    CREATE_MPEGTS_DEMUX_JOB_RESPONSE = 'CREATE_MPEGTS_DEMUX_JOB_RESPONSE',
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

try {
    if (typeof window === 'undefined') {
        onmessage = WebWorker.onMessage;
    }
} catch (e) {
    // do nothing
}
