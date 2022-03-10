import { BitReader } from '../../utils/bit-reader';
import { MptsElementaryStreamType, PESReader } from './pes-reader';
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
    private static MPEGTS_PACKET_SIZE: number = 188;
    private static MPEGTS_PACKET_SIZE_MINUS_ONE: number = 187;

    public tracks: { [id: number] : TSTrack; } = {};

    private containerType: CONTAINER_TYPE = CONTAINER_TYPE.UNKNOWN;

    private data: Uint8Array;
    private dataOffset: number;

    private packetsCount: number = 0;
    private pmtId: number = -1;
    private pmtParsed: boolean = false;

    get currentBufferSize(): number {
        return this?.data.byteLength || 0;
    }

    get currentPacketCount(): number {
        return this.packetsCount;
    }

    get isPmtParsed(): boolean {
        return this.isPmtParsed;
    }

    public append(data: Uint8Array, pruneAfterParse: boolean = false): Uint8Array | null  {
        if (!this.data || this.data.byteLength === 0) {
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
        this.updateTracks();

        if (pruneAfterParse) {
            return this.prune();
        }
        return null;
    }

    public prune(): Uint8Array | null {
        let parsedBuf: Uint8Array = null;
        // prune off parsing remainder from buffer
        if (this.dataOffset > 0) {
            // we might have dropped the data already
            // through a parsing callback calling end() for example.
            if (this.data) {
                // the offset is expected to go +1 the buffer range
                // thus the > instead of >=
                if (this.dataOffset > this.data.byteLength) {
                    throw new Error('Reader offset is out of buffer range');
                }
                // second arg of .subarray is exclusive range
                parsedBuf = this.data.subarray(0, this.dataOffset);
                // the first argument yields to an empty array when out-of-range
                this.data = this.data.subarray(this.dataOffset);
            }
            this.dataOffset = 0;
        }
        return parsedBuf;
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

    public onPmtParsed() {};

    private parse(): void {

        this.findContainerType();

        if (this.containerType === CONTAINER_TYPE.MPEG_TS) {
            this.readPackets();
        } else {
            const streamReader: BitReader = new BitReader(this.data);
            this.tracks[0] = new TSTrack(0,
                Track.TYPE_AUDIO, Track.MIME_TYPE_AAC,
                new PESReader(0, MptsElementaryStreamType.TS_STREAM_TYPE_AAC));
            this.tracks[0].pes.appendData(false, streamReader);
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
        if (this.containerType !== CONTAINER_TYPE.UNKNOWN) return;

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

    private readPackets(): void {
        // run as long as there is at least a full packet in buffer
        while ((this.data.byteLength - this.dataOffset) >= MpegTSDemuxer.MPEGTS_PACKET_SIZE) {

            // check for sync-byte
            const currentByte: number = this.data[this.dataOffset];
            if (currentByte !== MpegTSDemuxer.MPEGTS_SYNC) {
                // keep looking if we are out of sync
                this.dataOffset++;
                continue;
            }
            const packet: Uint8Array = this.data.subarray(this.dataOffset + 1,
                this.dataOffset + MpegTSDemuxer.MPEGTS_PACKET_SIZE_MINUS_ONE);
            this.dataOffset += MpegTSDemuxer.MPEGTS_PACKET_SIZE;
            this.processTsPacket(packet);
        }
    }

    private processTsPacket(packet: Uint8Array): void {

        this.packetsCount++;

        const packetReader: BitReader = new BitReader(packet);
        packetReader.skipBits(1);

        const payloadUnitStartIndicator: boolean = (packetReader.readBits(1) !== 0);
        packetReader.skipBits(1);

        const pid: number = packetReader.readBits(13);
        const adaptationField: number = (packetReader.readByte() & 0x30) >> 4;
        if (adaptationField > 1) {
            const length: number = packetReader.readByte();
            if (length > 0) {
                packetReader.skipBytes(length);
            }
        }
        if (adaptationField === 1 || adaptationField === 3) {
            if (pid === 0) {
                this.parseProgramAllocationTable(payloadUnitStartIndicator, packetReader);
            } else if (pid === this.pmtId) {
                this.parseProgramMapTable(payloadUnitStartIndicator, packetReader);
            } else {
                const track: TSTrack = this.tracks[pid];
                if (track && track.pes) {
                    track.pes.appendData(payloadUnitStartIndicator, packetReader);
                }
            }
        }
    }

    private parseProgramAllocationTable(payloadUnitStartIndicator: boolean, packetParser: BitReader): void {
        if (payloadUnitStartIndicator) {
            packetParser.skipBytes(packetParser.readByte());
        }
        packetParser.skipBits(27 + 7 * 8);
        this.pmtId = packetParser.readBits(13);
    }

    private parseProgramMapTable(payloadUnitStartIndicator: boolean, packetParser: BitReader): void {
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
                if (streamType === MptsElementaryStreamType.TS_STREAM_TYPE_AAC) {
                    type = Track.TYPE_AUDIO;
                    mimeType = Track.MIME_TYPE_AAC;
                } else if (streamType === MptsElementaryStreamType.TS_STREAM_TYPE_H264) {
                    type = Track.TYPE_VIDEO;
                    mimeType = Track.MIME_TYPE_AVC;
                } else if (streamType === MptsElementaryStreamType.TS_STREAM_TYPE_ID3) {
                    type = Track.TYPE_TEXT;
                    mimeType = Track.MIME_TYPE_ID3;
                } else if (streamType === MptsElementaryStreamType.TS_STREAM_TYPE_MPA || streamType === MptsElementaryStreamType.TS_STREAM_TYPE_MPA_LSF) {
                    type = Track.TYPE_AUDIO;
                    mimeType = Track.MIME_TYPE_MPEG;
                } else if (streamType === MptsElementaryStreamType.TS_STREAM_TYPE_METADATA) {
                    // do nothing
                } else {
                    type = Track.TYPE_UNKNOWN;
                    mimeType = Track.MIME_TYPE_UNKNOWN;
                }
                this.tracks[elementaryPid] = new TSTrack(elementaryPid, type, mimeType, pes);
            }
        }
        this.pmtParsed = true;
        this.onPmtParsed();
    }
}
