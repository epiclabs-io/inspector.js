import { Size, FrameRate } from '../video-types';

export class Sps {
    constructor (public profile: string, public level: string, public bitDepth: number,
        public chromaFormat: number, chromaFormatStr: string, public frameRate: FrameRate,
        public sar: Size, public codecSize: Size, public presentSize: Size ) {
        // do nothing
    }
}
