import Track from '../track';
import PESReader from './pes-reader';

export default class TSTrack extends Track {
    constructor(id: number, type: string, mimeType: string, public pes: PESReader) {
        super(id, type, mimeType);
    }

    public getType(): string {
        const mimeType: string = this.getMimeType();
        if (mimeType) {
            const pos: number = mimeType.indexOf('/');
            if (pos > 0) {
                return mimeType.substring(0, pos);
            }
        }
        return '';
    }

    public getMimeType(): string {
        if (this.pes && this.pes.payloadReader) {
            return this.pes.payloadReader.getMimeType();
        }
        return super.getMimeType();
    }

    public getDuration(): number {
        if (this.pes && this.pes.payloadReader) {
            return this.pes.payloadReader.getDuration();
        }
        return 0;
    }
}
