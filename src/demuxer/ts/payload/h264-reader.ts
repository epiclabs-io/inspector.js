import { BitReader } from '../../../utils/bit-reader';
import { PayloadReader } from './payload-reader';
import { Frame } from '../../frame';
import { Track } from '../../track';
import { H264ParameterSetParser } from '../../../codecs/h264/param-set-parser';
import { FRAME_TYPE, mapNaluSliceToFrameType, NAL_UNIT_TYPE, SLICE_TYPE, Sps } from '../../../codecs/h264/nal-units';

const NALU_DELIM_LEN = 3;

export class H264Reader extends PayloadReader {

    public sps: Sps = null;
    public pps: boolean = false;

    public pendingBytes: number = 0;

    constructor() {
        super();
    }

    public getMimeType(): string {
        return Track.MIME_TYPE_AVC;
    }

    public flush(timeUs: number): void {

        this.read(timeUs);

        // enforced process any last data after
        // a nalu-delim to be processed
        // (most likely partial NALUs).
        const nextNalUnit: number = this.findNextNalu(0);
        if (!Number.isFinite(nextNalUnit)) {
            return;
        }
        this.processNalu(nextNalUnit,
            this.dataBuffer.byteLength,
            this.readNaluHeadAt(nextNalUnit));
    }

    public reset(): void {
        super.reset();

        this.sps = null;
        this.pps = false;
    }

    public read(timeUs: number): void {

        // process pending remainder data
        let firstNalUnit: number = 0;
        let nextNalUnit: number = 0;

        if (this.pendingBytes > 0) {
            nextNalUnit = this.findNextNalu(this.pendingBytes);
            // if we cant find a next NALU-delim from the remainder data,
            // we can already give-up here.
            if (!Number.isFinite(nextNalUnit)) {
                return;
            }
            this.processNalu(0, nextNalUnit, this.readNaluHeadAt(firstNalUnit));
            firstNalUnit = nextNalUnit;
        } else {
            firstNalUnit = this.findNextNalu();
            if (!Number.isFinite(firstNalUnit)) {
                return;
            }
        }

        // post: firstNalUnit is finite number

        // Q: for what else do we need this timeUs param, and
        // why do we need to set this superclass prop here
        // as it gets passed in from the call arg... ?

        // FIXME: use NaN instead of -1
        if (this.firstTimestamp === -1) {
            this.timeUs = this.firstTimestamp = timeUs;
        }
        if (timeUs !== -1) {
            this.timeUs = timeUs;
        }

        // process next nal units in the buffer
        while (true) {
            // w/o the +3 we would end up again with the input offset!
            nextNalUnit = this.findNextNalu(firstNalUnit + NALU_DELIM_LEN);
            if (!Number.isFinite(nextNalUnit)) {
                break;
            }

            this.processNalu(firstNalUnit, nextNalUnit,
                this.readNaluHeadAt(firstNalUnit));

            firstNalUnit = nextNalUnit;
        }

        // prune data-buffer
        this.dataBuffer = this.dataBuffer.subarray(firstNalUnit);

        // we need to make sure the next read starts off
        // ahead the last parsed NALU-delimiter.
        this.pendingBytes = this.dataBuffer.byteLength;
    }

    private findNextNalu(offset: number = 0): number {
        if (!(this?.dataBuffer?.byteLength)) {
            return NaN;
        }

        const length: number = this.dataBuffer.byteLength - NALU_DELIM_LEN;
        for (let i: number = offset; i < length; i++) {
            if (this.dataBuffer[i] === 0
                && this.dataBuffer[i + 1] === 0
                && this.dataBuffer[i + 2] === 1) {
                return i;
            }
        }
        return NaN;
    }

    private readNaluHeadAt(offset: number): number {
        // TODO: check for invalid values
        // (can be if buffer begin/remainder is garbage)
        return this.dataBuffer[offset + NALU_DELIM_LEN] & 0x1F;
    }

    private processNalu(start: number, end: number, nalType: number): void {

        switch(nalType) {
        case NAL_UNIT_TYPE.SLICE:
            this.parseSliceNALUnit(start, end);
            break;
        case NAL_UNIT_TYPE.IDR:
            this.addFrame(FRAME_TYPE.I, end - start - NALU_DELIM_LEN, NaN);
            break;
        case NAL_UNIT_TYPE.SPS:
            this.parseSPSNALUnit(start, end);
            break;
        case NAL_UNIT_TYPE.PPS:
            this.pps = true;
            break;
        default:
            break;
        }

        this.onData(this.dataBuffer.subarray(start + NALU_DELIM_LEN, end));
    }

    private parseSPSNALUnit(start: number, end: number): void {
        this.sps = H264ParameterSetParser.parseSPS(this.dataBuffer.subarray(start + 4, end));
    }

    private parseSliceNALUnit(start: number, end: number): void {
        const sliceParser: BitReader = new BitReader(this.dataBuffer.subarray(start, end));
        sliceParser.skipBytes(4);
        sliceParser.readUEG();
        const sliceType: SLICE_TYPE = sliceParser.readUEG();

        const frameType: FRAME_TYPE = mapNaluSliceToFrameType(sliceType);
        this.addFrame(frameType, end - start - NALU_DELIM_LEN, NaN);
    }

    private addFrame(frameType: FRAME_TYPE, frameSize: number, duration: number): void {
        const frame = new Frame(frameType, this.timeUs, frameSize, duration);
        this.frames.push(frame);
    }

}
