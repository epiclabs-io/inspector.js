import Track from '../track';
import ITrackInfo from '../track-info';
import IDemuxer from '../demuxer';
export default class MpegTSDemuxer implements IDemuxer {
    private static MPEGTS_SYNC;
    private static MPEGTS_PACKET_SIZE;
    tracks: {
        [id: number]: Track;
    };
    private data;
    private dataOffset;
    private containerType;
    private pmtParsed;
    private packetsCount;
    private pmtId;
    constructor();
    append(data: Uint8Array): ITrackInfo[];
    getTracksInfo(): ITrackInfo[];
    end(): void;
    private resetTracks();
    private findContainerType();
    private readHeader();
    private readSamples();
    private processTSPacket(packet);
    private parseProgramId(payloadUnitStartIndicator, packetParser);
    private parseProgramTable(payloadUnitStartIndicator, packetParser);
}
