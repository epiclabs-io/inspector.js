import ByteParserUtils from '../../utils/byte-parser-utils';
import { Track } from '../track';
import { IDemuxer } from '../demuxer';
import { Frame } from '../frame';

import { Vint, EbmlElement, IEbmlElementInfo } from './ebml/ebml-types';
import { getEbmlElementInfo } from './ebml/schema';
import { EbmlParser } from './ebml/ebml-parser';
import { WebMTrack } from './webm-track';
import { IEBMLInfo } from './elements/ebml-info';
import { ITrackInfo } from './elements/track-info';
import { ISegmentInfo } from './elements/segment-info';

export class WebMDemuxer implements IDemuxer {
    public tracks: { [id: number] : Track; };

    private data: Uint8Array;
    private dataOffset: number;
    private elements: EbmlElement[];
    private ebmlInfo: IEBMLInfo;
    private segmentInfo: ISegmentInfo;

    constructor() {
        this.tracks = {};
    }

    public append(data: Uint8Array): void {
        this.elements = [];
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

        this.elements = this.parseElements(this.data.byteLength);
        console.log(this.elements);

        if (this.dataOffset > 0) {
            this.data = this.data.subarray(this.dataOffset);
            this.dataOffset = 0;
        }

        this.updateTracks();
    }

    public end(): void {
        this.updateTracks();
    }

    private parseElements(end: number): EbmlElement[] {
        const elements: EbmlElement[] = [];

        while (this.dataOffset < end) {
            const element: EbmlElement = this.readElement();
            if (element === null) {
                console.error('There was an issue demuxing a webm file: incorrect format');
                return;
            }

            if (element.type === 'm') {
                element.childs = this.parseElements(element.end);
            }

            elements.push(element);
            this.processElement(element);
        }
        return elements;
    }

    private readElement(): EbmlElement {
        const id: Vint = EbmlParser.readVint(this.data, this.dataOffset);
        if (!id) {
            return null;
        }

        var idStr: string = ByteParserUtils.parseBufferToHex(this.data, this.dataOffset, this.dataOffset + id.length);
        const elementInfo: IEbmlElementInfo = getEbmlElementInfo(idStr);
        const element: EbmlElement = new EbmlElement(idStr, elementInfo.type, elementInfo.name, this.dataOffset, this.dataOffset + id.length);
        this.dataOffset += id.length;

        const size: Vint = EbmlParser.readVint(this.data, this.dataOffset);
        this.dataOffset += size.length;
        if (size !== null) {
            element.size = size.value;

            // Manage unknown size case
            if (size.value === -1) {
                element.end = -1;
            } else {
                element.end += size.value + size.length;
            }

            // If type is m, we are in a container element
            if (element.type !== 'm') {
                if (element.end !== -1) {
                    const data: Uint8Array = this.data.subarray(this.dataOffset, this.dataOffset + element.size);
                    this.parseElementData(element, data);
                }
                this.dataOffset += element.size;
            }
        }

        return element;
    }

    private parseElementData(element: EbmlElement, data: Uint8Array): void {
        switch (element.type) {
            case 'u':
            element.data = ByteParserUtils.parseUint(data, 0, data.byteLength);
            break;

            case 'i':
            element.data = ByteParserUtils.parseInt(data, 0, data.byteLength);
            break;

            case 's':
            element.data = ByteParserUtils.parseString(data, 0, data.byteLength);
            break;

            case '8':
            element.data = ByteParserUtils.parseUTF8String(data, 0, data.byteLength);
            break;

            case 'b':
            element.data = data;
            break;

            case 'f':
            element.data = ByteParserUtils.parseFloat(data, 0, data.byteLength);
            break;

            case 'd':
            const ns: number = ByteParserUtils.parseUint(data, 0, 8);
            const d: Date = new Date(2001, 0, 1, 0, 0, 0, 0);
            d.setSeconds(d.getSeconds() + ns / (1000 * 1000));
            element.data = d;
            break;
        }
    }

    private processElement(element: EbmlElement): void {
        if (element.name === 'EBML') {
            this.ebmlInfo = this.flatChilds(element);
            if (this.ebmlInfo.DocType !== 'webm') {
                console.warn('WebM document doesnt have the right doc type (webm != ' + this.ebmlInfo.DocType + ')');
            }
        } else if (element.name === 'Tracks') {
            this.processTracksElement(element);
        } else if (element.name === 'Info') {
            this.segmentInfo = this.flatChilds(element);
        }
    }

    private processTracksElement(element: EbmlElement): void {
        for (const child of element.childs) {
            const trackInfo: ITrackInfo = this.flatChilds(child);
            const track: WebMTrack = new WebMTrack(trackInfo);
            this.tracks[track.id] = track;
        }
    }

    private flatChilds(element: EbmlElement): any {
        const obj: any = {};
        for (const child of element.childs) {
            obj[child.name] = child.data;
        }
        return obj;
    }

    private updateTracks(): void {
        for (const trackId in this.tracks) {
            if (this.tracks.hasOwnProperty(trackId)) {
                this.tracks[trackId].update();
            }
        }
    }
}
