export class BitReader {
    private workingBytesAvailable: number;
    private workingWord: number;
    private workingBitsAvailable: number;

    constructor(public buffer: Uint8Array) {
        this.workingBytesAvailable = buffer.byteLength;
        this.workingWord = 0;
        this.workingBitsAvailable = 0;

        this.loadWord();
    }

    public destroy(): void {
        this.buffer = null;
    }

    public remainingBytes(): number {
        return this.workingBytesAvailable + this.workingBitsAvailable / 8;
    }

    public bitsAvailable(): number {
        return (8 * this.workingBytesAvailable) + this.workingBitsAvailable;
    }

    public bytesOffset(): number {
        return this.buffer.byteLength - this.remainingBytes();
    }

    public skipBytes(count: number): void {
        this.skipBits(count * 8);
    }

    public skipBits(count: number): void {
        let skipBytes: number;
        if (this.workingBitsAvailable > count) {
            this.workingWord <<= count;
            this.workingBitsAvailable -= count;
        } else {
            count -= this.workingBitsAvailable;
            skipBytes = Math.floor(count / 8);

            count -= (skipBytes * 8);
            this.workingBytesAvailable -= skipBytes;

            this.loadWord();

            this.workingWord <<= count;
            this.workingBitsAvailable -= count;
        }
    }

    public skipUEG(): void {
        this.skipBits(1 + this.skipLeadingZeros());
    }

    public skipSEG(): void {
        this.skipBits(1 + this.skipLeadingZeros());
    }

    public readUEG(): number {
        const clz: number = this.skipLeadingZeros();
        return this.readBits(clz + 1) - 1;
    }

    public readSEG(): number {
        var val: number = this.readUEG();
        if (0x01 & val) {
            return (1 + val) >>> 1;
        }
        return -1 * (val >>> 1);
    }

    public readBool(): boolean {
        return this.readBits(1) === 1;
    }

    public readByte = function(): number {
        return this.readBits(8);
    };

    public readBits(size: number): number {
        let bits: number = Math.min(this.workingBitsAvailable, size);
        const val: number = this.workingWord >>> (32 - bits);

        this.workingBitsAvailable -= bits;
        if (this.workingBitsAvailable > 0) {
            this.workingWord <<= bits;
        } else if (this.workingBytesAvailable > 0) {
            this.loadWord();
        }

        bits = size - bits;
        if (bits > 0) {
            return (val << bits | this.readBits(bits)) >>> 0;
        }
        return val;
    }

    private loadWord(): void {
        const position: number = this.buffer.byteLength - this.workingBytesAvailable;
        const workingBytes: Uint8Array = new Uint8Array(4);
        const availableBytes: number = Math.min(4, this.remainingBytes());

        if (availableBytes === 0) {
            throw new Error('No bytes available');
        }

        workingBytes.set(this.buffer.subarray(position, position + availableBytes));
        this.workingWord = new DataView(workingBytes.buffer).getUint32(0);

        this.workingBitsAvailable = availableBytes * 8;
        this.workingBytesAvailable -= availableBytes;
    }

    private skipLeadingZeros(): number {
        let leadingZeroCount: number;
        for (leadingZeroCount = 0; leadingZeroCount < this.workingBitsAvailable; ++leadingZeroCount) {
            if ((this.workingWord & (0x80000000 >>> leadingZeroCount)) !== 0) {
                this.workingWord <<= leadingZeroCount;
                this.workingBitsAvailable -= leadingZeroCount;
                return leadingZeroCount;
            }
        }
        this.loadWord();
        return leadingZeroCount + this.skipLeadingZeros();
    }
}
