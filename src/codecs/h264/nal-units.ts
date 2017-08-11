export class FrameRate {
    constructor (public fixed: boolean, public fps: number,
        public fpsDen: number, public fpsNum: number) {
            // do nothing
        }
}

export class Size {
    constructor (public width: number, public height: number) {
        // do nothing
    }
}

export class Sps {
    constructor (public profile: string, public level: string, public bitDepth: number,
        public chromaFormat: number, chromaFormatStr: string, public frameRate: FrameRate,
        public sar: Size, public codecSize: Size, public presentSize: Size ) {
        // do nothing
    }
}
