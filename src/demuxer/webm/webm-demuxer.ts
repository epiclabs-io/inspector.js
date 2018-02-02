import ByteParserUtils from '../../utils/byte-parser-utils';
import Track from '../track';
import IDemuxer from '../demuxer';
import Frame from '../frame';

enum State {
    READ_TAG = 1,
    READ_SIZE = 2,
    READ_CONTENT = 3
}

export default class WebMDemuxer implements IDemuxer {
    public tracks: { [id: number] : Track; };

    private data: Uint8Array;
    private dataOffset: number;
    private state: State;

    constructor() {
        // do nothing
    }

    public append(data: Uint8Array): void {
        if (!this.data || this.data.byteLength === 0 || this.dataOffset >= this.data.byteLength) {
            this.data = data;
            this.dataOffset = 0;
        } else {
            const newLen: number = this.data.byteLength + data.byteLength;
            const temp: Uint8Array = new Uint8Array(newLen);
            temp.set(this.data, 0);
            temp.set(data, this.data.byteLength);
            this.data = temp;
        }

        this.parse();

        if (this.dataOffset > 0) {
            this.data = this.data.subarray(this.dataOffset);
            this.dataOffset = 0;
        }

        this.updateTracks();
    }

    public end(): void {
        this.updateTracks();
    }

    private parse(): void {
        while (this.dataOffset < this.data.byteLength) {
            switch (this.state) {
                case State.READ_TAG:
                this.readTag();
                break;

                case State.READ_SIZE:
                this.readSize();
                break;

                case State.READ_CONTENT:
                this.readContent();
                break;
            }
        }
    }

    private readTag(): void {

    }

    private readSize(): void {

    }

    private readContent(): void {

    }

    private updateTracks(): void {
        for (const trackId in this.tracks) {
            if (this.tracks.hasOwnProperty(trackId)) {
                this.tracks[trackId].update();
            }
        }
    }
}
