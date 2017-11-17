import PayloadReader from './payload-reader';
export default class UnknownReader extends PayloadReader {
    getMimeType(): string;
    consumeData(pts: number): void;
}
