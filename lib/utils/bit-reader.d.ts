export default class BitReader {
    buffer: Uint8Array;
    private workingBytesAvailable;
    private workingWord;
    private workingBitsAvailable;
    constructor(buffer: Uint8Array);
    destroy(): void;
    remainingBytes(): number;
    bitsAvailable(): number;
    bytesOffset(): number;
    skipBytes(count: number): void;
    skipBits(count: number): void;
    skipUEG(): void;
    skipSEG(): void;
    readUEG(): number;
    readSEG(): number;
    readBool(): boolean;
    readByte: () => number;
    readBits(size: number): number;
    private loadWord();
    private skipLeadingZeros();
}
