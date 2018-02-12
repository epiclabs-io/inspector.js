import { Track } from '../track';
import { Frame } from '../frame';
import { PESReader } from './pes-reader';
import { H264Reader } from './payload/h264-reader';
import { AdtsReader } from './payload/adts-reader';
import { Sps } from '../../codecs/h264/nal-units';

export class TSTrack extends Track {
    constructor(id: number, type: string, mimeType: string, public pes: PESReader) {
        super(id, type, mimeType);
    }

    public getDuration(): number {
        if (this.pes && this.pes.payloadReader) {
            return this.pes.payloadReader.getDuration();
        }
        return 0;
    }

    public getFrames(): Frame[] {
        if (this.pes && this.pes.payloadReader) {
            return this.pes.payloadReader.frames;
        }
        return [];
    }

    public getMetadata(): {} {
        if (this.pes && this.pes.payloadReader) {
            if (this.pes.payloadReader instanceof H264Reader && (this.pes.payloadReader as H264Reader).sps) {
                const sps: Sps = (this.pes.payloadReader as H264Reader).sps;
                return {
                    profile: sps.profile,
                    level: sps.level,
                    bitDepth: sps.bitDepth,
                    chromaFormat: sps.chromaFormat,
                    frameRate: sps.frameRate,
                    sar: sps.sar,
                    codecSize: sps.codecSize,
                    presentSize:
                    sps.presentSize,
                };
            } else if (this.pes.payloadReader instanceof AdtsReader) {
                const adtsReader: AdtsReader = this.pes.payloadReader as AdtsReader;
                return {
                    channels: adtsReader.channels,
                    sampleRate: adtsReader.sampleRate,
                    frameDuration: adtsReader.frameDuration,
                };
            }
        }
        return {};
    }
}
