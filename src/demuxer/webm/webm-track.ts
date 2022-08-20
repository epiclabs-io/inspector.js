import ByteParserUtils from '../../utils/byte-parser-utils';
import { FRAME_TYPE } from '../../codecs/h264/nal-units';

import { Track, TrackType } from '../track';
import { Frame } from '../frame';

import { ITrackInfo } from './elements/track-info';
import { Vint, EbmlElement } from './ebml/ebml-types';

export class WebMTrack extends Track {

    private _frames: Frame[];

    private lastPts: number;
    private nsPerFrame: number;
    private lastTimecodeBase: number;
    private timecodeScale: number;
    private codec: string;
    private metadata: any;

    constructor(info: ITrackInfo, metadata: any) {
        const type = WebMTrack.getType(info.TrackType);
        const codec: string = info.CodecName || WebMTrack.getCodecNameFromID(info.CodecID);
        super(info.TrackNumber, type, type + '/' + codec);

        // explicit init after super-call needed
        this._frames = [];
        this.lastPts = 0;
        this.lastTimecodeBase = 0;

        this.type = type;
        this.codec = codec;
        this.metadata = metadata;
        this.nsPerFrame = info.DefaultDuration;
        this.timecodeScale = info.TrackTimecodeScale;
    }

    get frames() { return this._frames; }

    private static getType(type: number): TrackType {
        switch (type) {
        case 1:
            return TrackType.VIDEO;
        case 2:
            return TrackType.AUDIO;
        case 3:
            return TrackType.COMPLEX;
        case 0x10:
            return TrackType.LOGO;
        case 0x11:
            return TrackType.TEXT;
        case 0x12:
            return TrackType.BUTTONS;
        case 0x20:
            return TrackType.CONTROL;
        default:
            return TrackType.UNKNOWN;
        }
    }

    private static getCodecNameFromID(codecID: string): string {
        if (!codecID) {
            return null;
        }
        const pos: number = codecID.indexOf('_');
        if (pos < 0) {
            return codecID;
        }
        return codecID.substr(pos + 1);
    }

    public getResolution(): [number, number] {
        throw new Error('Method not implemented.');
    }

    public getFrames(): Frame[] {
        return this._frames;
    }

    public getMetadata(): any { // FIXME: Seems this is the only implementation and it violates the base-class return-type
                                // We should probably rather try to come up with a generic data-model
                                // or at least type this as a string-to-any hash...
        if (!this.metadata) {
            return null;
        }
        if (this.type === TrackType.VIDEO) {
            return {
                codecSize: {
                    height: this.metadata.PixelHeight,
                    width: this.metadata.PixelWidth
                },
                presentSize: {
                    height: this.metadata.DisplayHeight,
                    width: this.metadata.DisplayWidth,
                }
            };
        } else if (this.type === TrackType.AUDIO) {
            return {
                sampleRate: this.metadata.SamplingFrequency
            };
        }
    }

    public setTimecode(time: number): void {
        this.lastTimecodeBase = time;
    }

    public processBlock(trackId: Vint, element: EbmlElement): void {
        const buffer: Uint8Array = element.data as Uint8Array;
        const timecode: number = ByteParserUtils.parseUint16(buffer, trackId.length);
        const flags: number = ByteParserUtils.parseUint(buffer, trackId.length + 2, 1);

        this.lastPts = 1000 * ((this.lastTimecodeBase + timecode) / (this.timecodeScale > 0 ? this.timecodeScale : 1));

        if (element.name === 'SimpleBlock' && flags & 0x80) {
            this._frames.push(new Frame(
                FRAME_TYPE.I,
                this.lastPts, 0, 0,
                buffer.length
            ));
        } else {
            this._frames.push(new Frame(
                FRAME_TYPE.P,
                this.lastPts, 0, 0,
                buffer.length
            ));
        }
    }
}
