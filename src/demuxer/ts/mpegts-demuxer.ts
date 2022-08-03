import { IDemuxer } from '../demuxer';
import { Track } from '../track';

import { MptsElementaryStreamType, PESReader } from './pes-reader';
import { TSTrack } from './ts-track';
import { BitReader } from '../../utils/bit-reader';

enum CONTAINER_TYPE {
    UNKNOWN = 1,
    MPEG_TS,
    RAW_AAC,
    RAW_MPEG_AUDIO
}

export class MpegTSDemuxer implements IDemuxer {

    private static MPEGTS_SYNC: number = 0x47;
    private static MPEGTS_PACKET_SIZE: number = 188;

    public tracks: { [id: number] : TSTrack; } = {};

    private _containerType: CONTAINER_TYPE = CONTAINER_TYPE.UNKNOWN;

    private _data: Uint8Array;
    private _dataOffset: number;

    private _packetsCount: number = 0;

    private _pmtId: number = NaN;
    private _pmtParsed: boolean = false;

    get currentBufferSize(): number {
        return this._data?.byteLength || 0;
    }

    get currentPacketCount(): number {
        return this._packetsCount;
    }

    get isProgramMapUpdated(): boolean {
        return this._pmtParsed;
    }

    public append(data: Uint8Array, pruneAfterParse: boolean = false): Uint8Array | null  {
        if (!this._data || this._data.byteLength === 0) {
            this._data = new Uint8Array(data);
            this._dataOffset = 0;
        } else {
            const newLen: number = this._data.byteLength + data.byteLength;
            const newBuffer: Uint8Array = new Uint8Array(newLen);
            newBuffer.set(this._data, 0);
            newBuffer.set(data, this._data.byteLength);
            this._data = newBuffer;
        }

        this._parse();
        this._updateTracks();

        if (pruneAfterParse) {
            return this.prune();
        }
        return null;
    }

    public prune(): Uint8Array | null {
        let parsedBuf: Uint8Array = null;
        // prune off parsing remainder from buffer
        if (this._dataOffset > 0) {
            // we might have dropped the data already
            // through a parsing callback calling end() for example.
            if (this._data) {
                // the offset is expected to go +1 the buffer range
                // thus the > instead of >=
                if (this._dataOffset > this._data.byteLength) {
                    throw new Error('Reader offset is out of buffer range');
                }
                // second arg of .subarray is exclusive range
                parsedBuf = this._data.subarray(0, this._dataOffset);
                // the first argument yields to an empty array when out-of-range
                this._data = this._data.subarray(this._dataOffset);
            }
            this._dataOffset = 0;
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
        this._data = null;
        this._dataOffset = 0;
    }

    public onProgramMapUpdate() {};

    private _parse(): void {

        this._findContainerType();

        if (this._containerType === CONTAINER_TYPE.MPEG_TS) {
            this._readPackets();
        } else {
            const streamReader: BitReader = new BitReader(this._data);
            this.tracks[0] = new TSTrack(0,
                Track.TYPE_AUDIO, Track.MIME_TYPE_AAC,
                new PESReader(0, MptsElementaryStreamType.TS_STREAM_TYPE_AAC));
            this.tracks[0].pes.appendPacket(false, streamReader);
        }
    }

    private _updateTracks(): void {
        for (const trackId in this.tracks) {
            if (this.tracks.hasOwnProperty(trackId)) {
                this.tracks[trackId].update();
            }
        }
    }

    private _findContainerType(): void {

        if (this._containerType !== CONTAINER_TYPE.UNKNOWN) return;

        while (this._dataOffset < this._data.byteLength) {
            if (this._data[this._dataOffset] === MpegTSDemuxer.MPEGTS_SYNC) {
                this._containerType = CONTAINER_TYPE.MPEG_TS;
                break;
            } else if ((this._data.byteLength - this._dataOffset) >= 4) {
                const dataRead: number = (this._data[this._dataOffset] << 8) | (this._data[this._dataOffset + 1]);
                if (dataRead === 0x4944 || (dataRead & 0xfff6) === 0xfff0) {
                    this._containerType = CONTAINER_TYPE.RAW_AAC;
                    break;
                }
            }
            this._dataOffset++;
        }

        if (this._containerType === CONTAINER_TYPE.UNKNOWN) {
            throw new Error('Format not supported');
        }
    }

    private _readPackets(): void {
        // run as long as there is at least a full packet in buffer
        while ((this._data.byteLength - this._dataOffset) >= MpegTSDemuxer.MPEGTS_PACKET_SIZE) {

            // check for sync-byte
            const currentByte: number = this._data[this._dataOffset];
            if (currentByte !== MpegTSDemuxer.MPEGTS_SYNC) {
                // keep looking if we are out of sync
                this._dataOffset++;
                continue;
            }
            const packet: Uint8Array = this._data.subarray(this._dataOffset + 1,
                this._dataOffset + MpegTSDemuxer.MPEGTS_PACKET_SIZE);
            this._dataOffset += MpegTSDemuxer.MPEGTS_PACKET_SIZE;
            this._processTsPacket(packet);
        }
    }

    private _processTsPacket(packet: Uint8Array): void {

        this._packetsCount++;

        const packetReader: BitReader = new BitReader(packet);
        packetReader.skipBits(1);

        const payloadUnitStartIndicator: boolean = (packetReader.readBits(1) !== 0);
        packetReader.skipBits(1);

        const pid: number = packetReader.readBits(13);

        // use unsigned right shift?
        const adaptationField: number = (packetReader.readByte() & 0x30) >>> 4;

        // todo: read continuity counter

        // Adaptation field present
        if (adaptationField > 1) {
            // adaptation field len
            const length: number = packetReader.readByte();
            if (length > 0) {
                packetReader.skipBytes(length);
            }
        }

        // Payload data present
        if (adaptationField === 1 || adaptationField === 3) {
            if (pid === 0) {
                this._parseProgramAllocationTable(payloadUnitStartIndicator, packetReader);
            } else if (pid === this._pmtId) {
                this._parseProgramMapTable(payloadUnitStartIndicator, packetReader);
            } else {
                const track: TSTrack = this.tracks[pid];
                // handle case where PID not found?
                if (track && track.pes) {
                    track.pes.appendPacket(payloadUnitStartIndicator, packetReader);
                }
            }
        }
    }

    private _parseProgramAllocationTable(payloadUnitStartIndicator: boolean, packetParser: BitReader): void {
        if (payloadUnitStartIndicator) {
            packetParser.skipBytes(packetParser.readByte());
        }
        packetParser.skipBits(27 + 7 * 8);
        this._pmtId = packetParser.readBits(13);
    }

    private _parseProgramMapTable(payloadUnitStartIndicator: boolean, packetParser: BitReader): void {
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
        this._pmtParsed = true;
        this.onProgramMapUpdate();
    }
}
