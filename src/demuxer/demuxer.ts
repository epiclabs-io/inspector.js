import { Track } from './track';

export interface IDemuxer {
    tracks: { [id: number] : Track; };

    append(data: Uint8Array): void;
    end(): void;
}
