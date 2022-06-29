import { BitReader } from '../../../utils/bit-reader';
import { PayloadReader } from './payload-reader';
import { Frame } from '../../frame';
import { Track } from '../../track';
import { H264ParameterSetParser } from '../../../codecs/h264/param-set-parser';
import { FRAME_TYPE, mapNaluSliceToFrameType, NAL_UNIT_TYPE, SLICE_TYPE, Sps } from '../../../codecs/h264/nal-units';

const NALU_DELIM_LEN = 3;

export class H264Reader extends PayloadReader {

    private _pendingBytes: number = 0;

    public sps: Sps = null;
    public pps: boolean = false;

    public getMimeType(): string {
        return Track.MIME_TYPE_AVC;
    }

    public flush(dts: number, cto: number): void {

        this.read(dts, cto);

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

    public read(dts: number, cto: number): void {
        if (!this.dataBuffer) {
            throw new Error('read() should not be called without priorly data appended');
        }
        this.setCurrentTime(dts, cto);

        // process pending remainder data
        let firstNalUnit: number = 0;
        let nextNalUnit: number = 0;

        if (this._pendingBytes > 0) {
            nextNalUnit = this.findNextNalu(this._pendingBytes);
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
        this._pendingBytes = this.dataBuffer.byteLength;
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
     * @param begin offset (inclusive)
     * @param end offset (exclusive)
     * @returns end offset (exclusive) as input
     */
    private readNaluData(begin: number, end: number): number {

        const naluData = this.dataBuffer.subarray(begin + NALU_DELIM_LEN, end);

        // TODO: check for invalid values
        // (can happen if buffer begin/remainder is garbage)
        const naluType = naluData[0] & 0x1F;
        switch(naluType) {
        case NAL_UNIT_TYPE.SLICE:
            this.parseNonIdrPicSlice(naluData);
            break;
        case NAL_UNIT_TYPE.IDR:
            this.addFrame(FRAME_TYPE.I, naluData);
            break;
        case NAL_UNIT_TYPE.SPS:
            this.parseSps(naluData);
            break;
        case NAL_UNIT_TYPE.PPS:
            this.pps = true;
            break;
        default:
            break;
        }

        this.onData(naluData, this.dts, naluType);
        return end;
    }

    private parseSps(naluData: Uint8Array): void {
        // skip first byte NALU-header for SPS-parser func input (expects only payload)
        this.sps = H264ParameterSetParser.parseSPS(naluData.subarray(1));
    }

    private parseNonIdrPicSlice(naluData: Uint8Array): void {
        const sliceParser: BitReader = new BitReader(naluData);

        sliceParser.skipBytes(1);
        sliceParser.readUEG();
        const sliceType: SLICE_TYPE = sliceParser.readUEG();

        this.addFrame(mapNaluSliceToFrameType(sliceType), naluData);
    }

    private addFrame(frameType: FRAME_TYPE, naluData: Uint8Array): void {
        const frame = new Frame(
            frameType,
            this.dts,
            this.cto,
            0,
            naluData.byteLength,
        );
        this.frames.push(frame);
    }

}
