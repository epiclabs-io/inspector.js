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

        this.readNaluData(nextNalUnit, this.dataBuffer.byteLength);
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
            firstNalUnit = this.readNaluData(firstNalUnit, nextNalUnit);
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

            firstNalUnit = this.readNaluData(firstNalUnit, nextNalUnit);
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

    /**
     * @returns end offset
     */
    private readNaluData(start: number, end: number): number {

        const naluData = this.dataBuffer.subarray(start + NALU_DELIM_LEN, end);
        // TODO: check for invalid values
        // (can be if buffer begin/remainder is garbage)
        const nalType = naluData[0] & 0x1F;

        switch(nalType) {
        case NAL_UNIT_TYPE.SLICE:
            this.parseSliceNALUnit(naluData);
            break;
        case NAL_UNIT_TYPE.IDR:
            this.addFrame(FRAME_TYPE.I, naluData, NaN);
            break;
        case NAL_UNIT_TYPE.SPS:
            this.parseSPSNALUnit(naluData);
            break;
        case NAL_UNIT_TYPE.PPS:
            this.pps = true;
            break;
        default:
            break;
        }

        this.onData(naluData);

        return end;
    }

    private parseSPSNALUnit(naluData: Uint8Array): void {
        // skip first byte NALU-header for SPS-parser func input (expects only payload)
        this.sps = H264ParameterSetParser.parseSPS(naluData.subarray(1));
    }

    private parseSliceNALUnit(naluData: Uint8Array): void {
        const sliceParser: BitReader = new BitReader(naluData);

        sliceParser.skipBytes(1);
        sliceParser.readUEG();
        const sliceType: SLICE_TYPE = sliceParser.readUEG();

        this.addFrame(mapNaluSliceToFrameType(sliceType), naluData, NaN);
    }

    private addFrame(frameType: FRAME_TYPE, naluData: Uint8Array, duration: number): void {
        const frame = new Frame(frameType, this.timeUs, naluData.byteLength, duration);
        this.frames.push(frame);
    }

}
