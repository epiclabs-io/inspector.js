import { BitReader } from '../../../utils/bit-reader';
import { PayloadReader } from './payload-reader';
import { Frame } from '../../frame';
import { Track } from '../../track';
import { H264ParameterSetParser } from '../../../codecs/h264/param-set-parser';
import { Sps } from '../../../codecs/h264/nal-units';

enum NAL_UNIT_TYPE {
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

enum SLICE_TYPE {
    P = 0,
    B,
    I,
    SP,
    SI
}

export class Fraction {
    constructor(public num: number, public den: number) {
        // do nothing
    }
}

export class H264Reader extends PayloadReader {

    public sps: Sps = null;
    public pps: boolean = false;

    public pendingBytes: number;

    constructor() {
        super();
        this.pendingBytes = 0;
    }

    public getMimeType(): string {
        return Track.MIME_TYPE_AVC;
    }

    public flush(timeUs: number): void {
        if (this.dataBuffer && this.dataBuffer.byteLength > 0) {
            this.consumeData(timeUs);

            if (this.dataBuffer.byteLength > 0) {
                const offset: number = this.findNextNALUnit(0);
                if (offset < this.dataBuffer.byteLength) {
                    this.processNALUnit(offset, this.dataBuffer.byteLength, this.dataBuffer[offset + 3] & 0x1F);
                }
            }
        }
    }

    public reset(): void {
        super.reset();

        this.sps = null;
        this.pps = false;
    }

    public consumeData(timeUs: number): void {

        if (!this.dataBuffer) {
            return;
        }
        if (this.firstTimestamp === -1) {
            this.timeUs = this.firstTimestamp = timeUs;
        }

        // process any possible remaining data
        let nextNalUnit: number = 0;
        let offset: number = 0;
        if (this.pendingBytes > 0) {
            nextNalUnit = this.findNextNALUnit(this.pendingBytes);
            if (nextNalUnit < this.dataBuffer.byteLength) {
                this.processNALUnit(0, nextNalUnit, this.dataBuffer[offset + 3] & 0x1F);
                offset = nextNalUnit;
            }
            this.pendingBytes = 0;
        } else {
            offset = this.findNextNALUnit(0);
        }

        // process next nal units in the buffer
        if (timeUs !== -1) {
            this.timeUs = timeUs;
        }

        if (this.dataBuffer.byteLength > 0) {
            while (nextNalUnit < this.dataBuffer.byteLength) {
                nextNalUnit = this.findNextNALUnit(offset + 3);
                if (nextNalUnit < this.dataBuffer.byteLength) {
                    this.processNALUnit(offset, nextNalUnit, this.dataBuffer[offset + 3] & 0x1F);
                    offset = nextNalUnit;
                }
            }

            this.dataBuffer = this.dataBuffer.subarray(offset);
            this.pendingBytes = this.dataBuffer.byteLength;
        }
    }

    private findNextNALUnit(index: number): number {
        const limit: number = this.dataBuffer.byteLength - 3;
        for (let i: number = index; i < limit; i++) {
            if (this.dataBuffer[i] === 0 && this.dataBuffer[i + 1] === 0 && this.dataBuffer[i + 2] === 1) {
                return i;
            }
        }

        return this.dataBuffer.byteLength;
    }

    private processNALUnit(start: number, limit: number, nalType: number): void {

        if (nalType === NAL_UNIT_TYPE.SPS) {
            this.parseSPSNALUnit(start, limit);
        } else if (nalType === NAL_UNIT_TYPE.PPS) {
            this.pps = true;
        } else if (nalType === NAL_UNIT_TYPE.AUD) {
            this.parseAUDNALUnit(start, limit);
        } else if (nalType === NAL_UNIT_TYPE.IDR) {
            this.addNewFrame(Frame.IDR_FRAME, limit - start, NaN);
        } else if (nalType === NAL_UNIT_TYPE.SEI) {
            this.parseSEINALUnit(start, limit);
        } else if (nalType === NAL_UNIT_TYPE.SLICE) {
            this.parseSliceNALUnit(start, limit);
        }
    }

    private parseSPSNALUnit(start: number, limit: number): void {
        this.sps = H264ParameterSetParser.parseSPS(this.dataBuffer.subarray(start + 4, limit));
    }

    private skipScalingList(parser: BitReader, size: number): void {
        let lastScale: number = 8;
        let nextScale: number = 8;
        for (let i: number = 0; i < size; i++) {
            if (nextScale !== 0) {
                const deltaScale: number = parser.readSEG();
                nextScale = (lastScale + deltaScale + 256) % 256;
            }
            if (nextScale !== 0) {
                lastScale = nextScale;
            }
        }
    }

    private parseSEINALUnit(start: number, limit: number): void {
        let seiParser: BitReader = new BitReader(this.dataBuffer.subarray(start, limit));
        seiParser.skipBytes(4);

        while (seiParser.remainingBytes() > 0) {
            const data: number = seiParser.readByte();
            if (data !== 0xFF) {
                break;
            }
        }

        // parse payload size
        while (seiParser.remainingBytes() > 0) {
            const data: number = seiParser.readByte();
            if (data !== 0xFF) {
                break;
            }
        }

        seiParser.destroy();
        seiParser = null;
    }

    private parseSliceNALUnit(start: number, limit: number): void {
        let sliceParser: BitReader = new BitReader(this.dataBuffer.subarray(start, limit));
        sliceParser.skipBytes(4);
        sliceParser.readUEG();
        const sliceType: number = sliceParser.readUEG();
        const type: string = this.getSliceTypeName(sliceType);
        this.addNewFrame(type, limit - start, NaN);

        sliceParser.destroy();
        sliceParser = null;
    }

    private parseAUDNALUnit(start: number, limit: number): void {
        // const audParser: BitReader = new BitReader(this.dataBuffer.subarray(start, limit));
        // audParser.skipBytes(4);
    }

    private getSliceTypeName(sliceType: number): string {
        if (sliceType > 4) {
            sliceType = sliceType - 5;
        }
        switch (sliceType) {
            case SLICE_TYPE.B:
                return Frame.B_FRAME;
            case SLICE_TYPE.I:
                return Frame.IDR_FRAME;
            case SLICE_TYPE.P:
                return Frame.P_FRAME;
            case SLICE_TYPE.SI:
                return 'SI';
            case SLICE_TYPE.SP:
                return 'SP';
            default:
                return 'Unknown';
        }
    }

    private addNewFrame(frameType: string, frameSize: number, duration: number): void {
        const frame = new Frame(frameType, this.timeUs, frameSize, duration);
        this.frames.push(frame);
    }

}
