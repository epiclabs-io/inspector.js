import { BitReader } from '../../utils/bit-reader';
import { PESReader } from './pes-reader';
import { TSTrack } from './ts-track';
import { Track } from '../track';
import { IDemuxer } from '../demuxer';

enum CONTAINER_TYPE {
    UNKNOWN = 1,
    MPEG_TS,
    RAW_AAC,
    RAW_MPEG_AUDIO
}

export class MpegTSDemuxer implements IDemuxer {
    private static MPEGTS_SYNC: number = 0x47;
    private static MPEGTS_PACKET_SIZE: number = 187;

    public tracks: { [id: number] : TSTrack; };

    private data: Uint8Array;
    private dataOffset: number;
    private containerType: number;
    private pmtParsed: boolean;
    private packetsCount: number;
    private pmtId: number;

    constructor () {
        this.containerType = CONTAINER_TYPE.UNKNOWN;
        this.pmtParsed = false;
        this.packetsCount = 0;
        this.pmtId = -1;
        this.tracks = {};
    }

    public append(data: Uint8Array): void {
        if (!this.data || this.data.byteLength === 0
            || this.dataOffset >= this.data.byteLength) {
            this.data = new Uint8Array(data);
            this.dataOffset = 0;
        } else {
            const newLen: number = this.data.byteLength + data.byteLength;
            const newBuffer: Uint8Array = new Uint8Array(newLen);
            newBuffer.set(this.data, 0);
            newBuffer.set(data, this.data.byteLength);
            this.data = newBuffer;
        }

        this.parse();

        if (this.dataOffset > 0) {
            this.data = this.data.subarray(this.dataOffset);
            this.dataOffset = 0;
        }

        this.updateTracks();
    }

    public end(): void {
        for (const trackId in this.tracks) {
            if (this.tracks.hasOwnProperty(trackId)) {
                (this.tracks[trackId] as TSTrack).pes.flush();
                this.tracks[trackId].update();
            }
        }
        this.data = null;
        this.dataOffset = 0;
    }

    private parse(): void {
        this.findContainerType();

        if (this.containerType === CONTAINER_TYPE.MPEG_TS) {
            this.readHeader();
            this.readSamples();
        } else { // FIXME: support raw mpeg audio
            const dataParser: BitReader = new BitReader(this.data);
            this.tracks[0] = new TSTrack(0, Track.TYPE_AUDIO, Track.MIME_TYPE_AAC,
                new PESReader(0, PESReader.TS_STREAM_TYPE_AAC));
            (this.tracks[0] as TSTrack).pes.appendData(false, dataParser);
        }
    }

    private updateTracks(): void {
        for (const trackId in this.tracks) {
            if (this.tracks.hasOwnProperty(trackId)) {
                this.tracks[trackId].update();
            }
        }
    }

    private resetTracks(): void {
        for (let id in this.tracks) {
            if (this.tracks.hasOwnProperty(id)) {
                (this.tracks[id] as TSTrack).pes.reset();
            }
        }
    }

    private findContainerType(): void {
        while (this.dataOffset < this.data.byteLength) {
            if (this.data[this.dataOffset] === MpegTSDemuxer.MPEGTS_SYNC) {
                this.containerType = CONTAINER_TYPE.MPEG_TS;
                break;
            } else if ((this.data.byteLength - this.dataOffset) >= 4) {
                const dataRead: number = (this.data[this.dataOffset] << 8) | (this.data[this.dataOffset + 1]);
                if (dataRead === 0x4944 || (dataRead & 0xfff6) === 0xfff0) {
                    this.containerType = CONTAINER_TYPE.RAW_AAC;
                    break;
                }
            }
            this.dataOffset++;
        }

        if (this.containerType === CONTAINER_TYPE.UNKNOWN) {
            throw new Error('Format not supported');
        }
    }

    private readHeader(): void {
        while (this.dataOffset < this.data.byteLength - 1) {
            const byteRead: number = this.data[this.dataOffset];
            this.dataOffset++;

            if (byteRead === MpegTSDemuxer.MPEGTS_SYNC
                && (this.data.byteLength - this.dataOffset) >= MpegTSDemuxer.MPEGTS_PACKET_SIZE) {

                const packet: Uint8Array = this.data.subarray(this.dataOffset,
                    this.dataOffset + MpegTSDemuxer.MPEGTS_PACKET_SIZE);
                this.dataOffset += MpegTSDemuxer.MPEGTS_PACKET_SIZE;

                this.processTSPacket(packet);

                if (this.pmtParsed) {
                    break;
                }
            }
        }
    }

    private readSamples(): void {
        while (this.dataOffset < this.data.byteLength - 1) {
            const byteRead: number = this.data[this.dataOffset++];

            if (byteRead === MpegTSDemuxer.MPEGTS_SYNC
                && (this.data.byteLength - this.dataOffset) >= MpegTSDemuxer.MPEGTS_PACKET_SIZE) {

                const packet: Uint8Array = this.data.subarray(this.dataOffset, this.dataOffset
                    + MpegTSDemuxer.MPEGTS_PACKET_SIZE);
                this.dataOffset += MpegTSDemuxer.MPEGTS_PACKET_SIZE;

                this.processTSPacket(packet);
            }
        }
    }

    private processTSPacket(packet: Uint8Array): void {

        this.packetsCount++;

        const packetParser: BitReader = new BitReader(packet);
        packetParser.skipBits(1);

        const payloadUnitStartIndicator: boolean = (packetParser.readBits(1) !== 0);
        packetParser.skipBits(1);

        const pid: number = packetParser.readBits(13);
        const adaptationField: number = (packetParser.readByte() & 0x30) >> 4;
        if (adaptationField > 1) {
            const length: number = packetParser.readByte();
            if (length > 0) {
                packetParser.skipBytes(length);
            }
        }
        if (adaptationField === 1 || adaptationField === 3) {
            if (pid === 0) {
                this.parseProgramId(payloadUnitStartIndicator, packetParser);
            } else if (pid === this.pmtId) {
                this.parseProgramTable(payloadUnitStartIndicator, packetParser);
            } else {
                const track: TSTrack = this.tracks[pid] as TSTrack;
                if (track && track.pes) {
                    track.pes.appendData(payloadUnitStartIndicator, packetParser);
                }
            }
        }
    }

    private parseProgramId(payloadUnitStartIndicator: boolean, packetParser: BitReader): void {
        if (payloadUnitStartIndicator) {
            packetParser.skipBytes(packetParser.readByte());
        }
        packetParser.skipBits(27 + 7 * 8);
        this.pmtId = packetParser.readBits(13);
    }

    private parseProgramTable(payloadUnitStartIndicator: boolean, packetParser: BitReader): void {
        if (payloadUnitStartIndicator) {
            packetParser.skipBytes(packetParser.readByte());
        }

        packetParser.skipBits(12);
        const sectionLength: number = packetParser.readBits(12);
        packetParser.skipBits(4 + 7 * 8);
        const programInfoLength: number = packetParser.readBits(12);
        packetParser.skipBytes(programInfoLength);
        let bytesRemaining: number = sectionLength - 9 - programInfoLength - 4;

        while (bytesRemaining > 0) {
            const streamType: number = packetParser.readBits(8);
            packetParser.skipBits(3);
            const elementaryPid: number = packetParser.readBits(13);
            packetParser.skipBits(4);
            const infoLength: number = packetParser.readBits(12);
            packetParser.skipBytes(infoLength);
            bytesRemaining -= infoLength + 5;
            if (!this.tracks[elementaryPid]) {
                const pes: PESReader = new PESReader(elementaryPid, streamType);
                let type: string;
                let mimeType: string;
                if (streamType === PESReader.TS_STREAM_TYPE_AAC) {
                    type = Track.TYPE_AUDIO;
                    mimeType = Track.MIME_TYPE_AAC;
                } else if (streamType === PESReader.TS_STREAM_TYPE_H264) {
                    type = Track.TYPE_VIDEO;
                    mimeType = Track.MIME_TYPE_AVC;
                } else if (streamType === PESReader.TS_STREAM_TYPE_ID3) {
                    type = Track.TYPE_TEXT;
                    mimeType = Track.MIME_TYPE_ID3;
                } else if (streamType === PESReader.TS_STREAM_TYPE_MPA || streamType === PESReader.TS_STREAM_TYPE_MPA_LSF) {
                    type = Track.TYPE_AUDIO;
                    mimeType = Track.MIME_TYPE_MPEG;
                } else if (streamType === PESReader.TS_STREAM_TYPE_METADATA) {
                    // do nothing
                } else {
                    type = Track.TYPE_UNKNOWN;
                    mimeType = Track.MIME_TYPE_UNKNOWN;
                }
                this.tracks[elementaryPid] = new TSTrack(elementaryPid, type, mimeType, pes);
            }
        }
        this.pmtParsed = true;
    }
}
