import { Track } from './track';

export type TracksHash = { [id: number] : Track; };

export interface IDemuxer {
    tracks: TracksHash;

    append(data: Uint8Array): void;
    end(): void;
}
