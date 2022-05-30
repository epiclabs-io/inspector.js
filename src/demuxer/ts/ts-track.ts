import { Track } from '../track';
import { Frame } from '../frame';
import { PESReader } from './pes-reader';
import { H264Reader } from './payload/h264-reader';
import { AdtsReader } from './payload/adts-reader';
import { Sps } from '../../codecs/h264/nal-units';

export class TSTrack extends Track {
    constructor(id: number, type: string, mimeType: string,
        public pes: PESReader) {

        super(id, type, mimeType);
    }

    public getDuration(): number {
        return this?.pes?.payloadReader.getDuration() || 0;
    }

    public getFrames(): Frame[] {
        return this?.pes?.payloadReader.frames || [];
    }

    public popFrames(wholePayloadUnits: boolean = true): Frame[] {
        return this.pes?.payloadReader?.popFrames(wholePayloadUnits) || [];
    }
}
