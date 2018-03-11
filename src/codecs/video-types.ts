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
