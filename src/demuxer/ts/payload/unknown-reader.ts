import PayloadReader from './payload-reader';

export default class UnknownReader extends PayloadReader {

    public getMimeType(): string {
        return 'unknown';
    }

    public getFormat(): string {
        return 'Unknown';
    }

    public consumeData(pts: number): void {
        // do nothing
    }
}
