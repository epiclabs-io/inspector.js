import MpegTSDemuxer from './demuxer/ts/mpegts-demuxer';
import Mp4Demuxer from './demuxer/mp4/mp4-demuxer';

export function createMpegTSDemuxer(data: Uint8Array): MpegTSDemuxer {
    return new MpegTSDemuxer();
}

export function createMp4Demuxer(data: Uint8Array): Mp4Demuxer {
    return new Mp4Demuxer();
}
