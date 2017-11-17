import { Atom } from './atom';
export declare class HvcC extends Atom {
    version: number;
    profileSpace: number;
    tierFlag: number;
    profileIdc: number;
    profileCompatibility: number;
    constraintIndicator: Uint8Array;
    levelIdc: number;
    spatialSegmentationIdc: number;
    parallelismType: number;
    chromaFormat: number;
    bitDepthLumaMinus8: number;
    bitDepthChromaMinus8: number;
    avgFrameRate: number;
    constantFrameRate: number;
    numTemporalLayers: number;
    temporalIdNested: number;
    lengthSizeMinusOne: number;
    static parse(data: Uint8Array): Atom;
}
