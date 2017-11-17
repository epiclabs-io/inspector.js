import PayloadReader from './payload-reader';
export default class ID3Reader extends PayloadReader {
    getMimeType(): string;
    consumeData(pts: number): void;
}
