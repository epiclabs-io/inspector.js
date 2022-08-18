import { Track, TrackType } from '../track';
import { Frame } from '../frame';
import { PESReader } from './pes-reader';

export class TSTrack extends Track {

    constructor(id: number, type: TrackType, mimeType: string,
        public pes: PESReader) {

        super(id, type, mimeType);
    }

    getResolution(): [number, number] {
        return [0, 0];
    }

    getFrames(): Frame[] {
        return this?.pes?.payloadReader.frames || [];
    }

    popFrames(wholePayloadUnits: boolean = true): Frame[] {
        return this.pes?.payloadReader?.popFrames(wholePayloadUnits) || [];
    }
}
