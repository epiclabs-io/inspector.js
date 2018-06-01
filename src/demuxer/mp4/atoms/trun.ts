import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';

export class SampleFlags {
    constructor(public isLeading: number, public dependsOn: number, public isDependedOn: number,
        public hasRedundancy: number, public paddingValue: number, public isSyncFrame: boolean,
        public degradationPriority: number) {
    }
}

export class Sample {
    public flags: SampleFlags;
    public duration: number;
    public size: number;
    public compositionTimeOffset: number;

    public toString(): string {
        return `[duration: ${this.duration}, size: ${this.size}]`;
    }
}

export class Trun extends Atom {
    public version: number;
    public flags: Uint8Array;
    public trackId: number;
    public dataOffset: number;
    public samples: Sample[];

    public static parse(data: Uint8Array): Atom {
        const trun: Trun = new Trun(Atom.trun, data.byteLength);
        trun.version = data[0];
        trun.flags = data.subarray(1, 4);

        const dataOffsetPresent: boolean = !!(trun.flags[2] & 0x01);
        const firstSampleFlagsPresent: boolean = !!(trun.flags[2] & 0x04);
        const sampleDurationPresent: boolean = !!(trun.flags[1] & 0x01);
        const sampleSizePresent: boolean = !!(trun.flags[1] & 0x02);
        const sampleFlagsPresent: boolean = !!(trun.flags[1] & 0x04);
        const sampleCompositionTimeOffsetPresent: boolean = !!(trun.flags[1] & 0x08);

        let sampleCount: number = ByteParserUtils.parseUint32(data, 4);
        let offset: number = 8;
        trun.samples = [];
        let totalSize: number = 0;
        if (dataOffsetPresent) {
            trun.dataOffset = ByteParserUtils.parseUint32(data, offset);
            offset += 4;
        }
        if (firstSampleFlagsPresent && sampleCount) {
            const sample: Sample = new Sample();
            sample.flags = Trun.parseFlags(data.subarray(offset, offset + 4));
            offset += 4;
            if (sampleDurationPresent) {
                sample.duration = ByteParserUtils.parseUint32(data, offset);
                offset += 4;
            }
            if (sampleSizePresent) {
                sample.size = ByteParserUtils.parseUint32(data, offset);
                totalSize += sample.size;
                offset += 4;
            }
            if (sampleCompositionTimeOffsetPresent) {
                sample.compositionTimeOffset = ByteParserUtils.parseUint32(data, offset);
                offset += 4;
            }
            trun.samples.push(sample);
            sampleCount--;
        }
        while (sampleCount--) {
            const sample: Sample = new Sample();
            if (sampleDurationPresent) {
                sample.duration = ByteParserUtils.parseUint32(data, offset);
                offset += 4;
            }
            if (sampleSizePresent) {
                sample.size = ByteParserUtils.parseUint32(data, offset);
                totalSize += sample.size;
                offset += 4;
            }
            if (sampleFlagsPresent) {
                sample.flags = Trun.parseFlags(data.subarray(offset, offset + 4));
                offset += 4;
            }
            if (sampleCompositionTimeOffsetPresent) {
                sample.compositionTimeOffset = ByteParserUtils.parseUint32(data, offset);
                offset += 4;
            }
            trun.samples.push(sample);
        }
        return trun;
    }

    private static parseFlags(data: Uint8Array): SampleFlags {
        return new SampleFlags(
            (data[0] & 0x0c) >>> 2,
            (data[0] & 0x03),
            (data[1] & 0xc0) >>> 6,
            (data[1] & 0x30) >>> 4,
            (data[1] & 0x0e) >>> 1,
            (data[1] & 0x01) === 0,
            (data[2] << 8) | data[3]
        );
    }
}
