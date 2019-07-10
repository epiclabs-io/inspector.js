export class Mp4SampleFlags {
    public isLeading: number;
    public dependsOn: number;
    public isDependedOn: number;
    public hasRedundancy: number;
    public paddingValue: number;
    public isNonSyncSample: number;
    public degradationPriority: number;
}

export function parseIsoBoxSampleFlags(flags: number): Mp4SampleFlags {
    return {
        isLeading: (flags[0] & 0x0c) >>> 2,
        dependsOn: flags[0] & 0x03,
        isDependedOn: (flags[1] & 0xc0) >>> 6,
        hasRedundancy: (flags[1] & 0x30) >>> 4,
        paddingValue: (flags[1] & 0x0e) >>> 1,
        isNonSyncSample: flags[1] & 0x01,
        degradationPriority: (flags[2] << 8) | flags[3]
    };
}
