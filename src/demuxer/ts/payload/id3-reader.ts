import PayloadReader from './payload-reader';
import Track from '../../track';

export default class ID3Reader extends PayloadReader {

    public getMimeType(): string {
        return Track.MIME_TYPE_ID3;
    }

    public getFormat(): string {
        return 'ID3';
    }

    public consumeData(pts: number): void {
        // do nothing
    }
}
