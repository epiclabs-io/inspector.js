import PayloadReader from './payload-reader';

export default class ID3Reader extends PayloadReader {

    public getMimeType(): string {
        return 'application/id3';
    }

    public getFormat(): string {
        return 'ID3';
    }

    public consumeData(pts: number): void {
        // do nothing
    }
}
