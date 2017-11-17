import { Atom } from './atom';
export declare class DecoderConfigDescriptor {
    tag: number;
    length: number;
    audioObjectType: number;
    samplingFrequencyIndex: number;
    channelConfiguration: number;
    constructor(tag: number, length: number, audioObjectType: number, samplingFrequencyIndex: number, channelConfiguration: number);
}
export declare class DecoderConfig {
    objectProfileIndication: number;
    streamType: number;
    bufferSize: number;
    maxBitrate: number;
    avgBitrate: number;
    decoderConfigDescriptor: DecoderConfigDescriptor;
    constructor(objectProfileIndication: number, streamType: number, bufferSize: number, maxBitrate: number, avgBitrate: number, decoderConfigDescriptor: DecoderConfigDescriptor);
}
export declare class Esds extends Atom {
    version: number;
    flags: Uint8Array;
    esId: number;
    streamPriority: number;
    decoderConfig: DecoderConfig;
    static parse(data: Uint8Array): Atom;
}
