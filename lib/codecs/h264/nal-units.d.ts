export declare class FrameRate {
    fixed: boolean;
    fps: number;
    fpsDen: number;
    fpsNum: number;
    constructor(fixed: boolean, fps: number, fpsDen: number, fpsNum: number);
}
export declare class Size {
    width: number;
    height: number;
    constructor(width: number, height: number);
}
export declare class Sps {
    profile: string;
    level: string;
    bitDepth: number;
    chromaFormat: number;
    frameRate: FrameRate;
    sar: Size;
    codecSize: Size;
    presentSize: Size;
    constructor(profile: string, level: string, bitDepth: number, chromaFormat: number, chromaFormatStr: string, frameRate: FrameRate, sar: Size, codecSize: Size, presentSize: Size);
}
