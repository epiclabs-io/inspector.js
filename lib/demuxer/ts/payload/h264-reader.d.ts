import PayloadReader from './payload-reader';
import { Sps } from '../../../codecs/h264/nal-units';
export declare class Fraction {
    num: number;
    den: number;
    constructor(num: number, den: number);
}
export default class H264Reader extends PayloadReader {
    sps: Sps;
    pendingBytes: number;
    constructor();
    getMimeType(): string;
    flush(pts: number): void;
    consumeData(pts: number): void;
    private findNextNALUnit(index);
    private processNALUnit(start, limit, nalType);
    private parseSPSNALUnit(start, limit);
    private skipScalingList(parser, size);
    private parseSEINALUnit(start, limit);
    private parseSliceNALUnit(start, limit);
    private parseAUDNALUnit(start, limit);
    private getSliceTypeName(sliceType);
    private getNALUnitName(nalType);
    private addNewFrame(frameType);
}
