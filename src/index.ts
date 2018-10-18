import { MpegTSDemuxer } from './demuxer/ts/mpegts-demuxer';
import { Mp4Demuxer } from './demuxer/mp4/mp4-demuxer';
import { WebMDemuxer } from './demuxer/webm/webm-demuxer';

import { TSTrack } from './demuxer/ts/ts-track';

import { IDemuxer, TracksHash } from './demuxer/demuxer';
import { Track } from './demuxer/track';
import { Frame } from './demuxer/frame';

import { Atom, ContainerAtom } from './demuxer/mp4/atoms/atom';

import { FrameRate, Size } from './codecs/video-types';

import { WebWorker } from './utils/web-worker';

export type MpegTSDemuxer = MpegTSDemuxer;
export type TSTrack = TSTrack;
export type Mp4Demuxer = Mp4Demuxer;
export type WebMDemuxer = WebMDemuxer;
export type IDemuxer = IDemuxer;
export type TracksHash = TracksHash;
export type Track = Track;
export type Frame = Frame;
export type FrameRate = FrameRate;
export type Size = Size;

export type Atom = Atom;

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
