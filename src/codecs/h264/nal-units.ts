import { Size, FrameRate } from '../video-types';

export class Sps {
    constructor (
        public id: number,
        public profile: string,
        public level: string,
        public bitDepth: number,
        public chromaFormat: number,
        public chromaFormatStr: string,
        public frameRate: FrameRate,
        public sar: Size,
        public codecSize: Size,
        public presentSize: Size ) {
        // do nothing
    }
}

export class Pps {
    constructor(
        public id: number,
        public spsId: number,
        public entropyCodingModeFlag: boolean,
    ) {}
}
