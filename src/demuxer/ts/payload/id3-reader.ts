import { PayloadReader } from './payload-reader';
import { Track } from '../../track';

export class ID3Reader extends PayloadReader {

    public getMimeType(): string {
        return Track.MIME_TYPE_ID3;
    }

    public consumeData(pts: number): void {
        // do nothing
    }
}
