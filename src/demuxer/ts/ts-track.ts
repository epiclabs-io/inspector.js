import { Track, TrackType } from '../track';
import { Frame } from '../frame';
import { PESReader } from './pes-reader';

export class TSTrack extends Track {

    constructor(id: number, type: TrackType, mimeType: string,
        public pes: PESReader) {

        super(id, type, mimeType);
    }

    public toJSON(): string {
        const { id, type, mimeType } = this;
        return JSON.stringify({
            id,
            type,
            mimeType
        });
    }

    get frames() { return this?.pes?.payloadReader.frames || []; }

    getResolution(): [number, number] {
        return [0, 0];
    }

    popFrames(wholePayloadUnits: boolean = true): Frame[] {
        return this.pes?.payloadReader?.popFrames(wholePayloadUnits) || [];
    }
}
