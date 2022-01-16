import { Size, FrameRate } from '../video-types';

export enum NAL_UNIT_TYPE {
    SLICE = 1,
    DPA,
    DPB,
    DPC,
    IDR,
    SEI,
    SPS,
    PPS,
    AUD,
    END_SEQUENCE,
    END_STREAM
}

export enum SLICE_TYPE {
    P = 0,
    B,
    I,
    SP,
    SI
}

export enum FRAME_TYPE {
    I = 'I',
    P = 'P',
    B = 'B',
    SI = 'SI',
    SP = 'SP',
    UNKNOWN = ''
}

export function mapNaluSliceToFrameType(sliceType: number): FRAME_TYPE {
    if (sliceType > 4) {
        sliceType = sliceType - 5;
    }
    switch (sliceType) {
        case SLICE_TYPE.B:
            return FRAME_TYPE.B;
        case SLICE_TYPE.I:
            return FRAME_TYPE.I;
        case SLICE_TYPE.P:
            return FRAME_TYPE.P;
        case SLICE_TYPE.SI:
            return FRAME_TYPE.SI;
        case SLICE_TYPE.SP:
            return FRAME_TYPE.SP;
        default:
            return FRAME_TYPE.UNKNOWN;
    }
}

export class Sps {
    constructor (
        public id: number,
        public profile: string,
        public profileIdc: number,
        public level: string,
        public levelIdc: number,
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
