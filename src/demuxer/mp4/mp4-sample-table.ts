import { Stts, TimeToSampleEntry } from './atoms/stts';
import { Stsc, SampleToChunkEntry } from './atoms/stsc';
import { Stsz } from './atoms/stsz';
import { Ctts, CTimeOffsetToSampleEntry } from './atoms/ctts';
import { Mp4Track } from './mp4-track';
import { Stss } from './atoms/stss';
import { Stco } from './atoms/stco';

import { Frame } from '../frame';

import { toMicroseconds } from '../../utils/timescale';

import {getLogger, LoggerLevels} from '../../utils/logger';

const {log, debug} = getLogger('Mp4SampleTable', LoggerLevels.OFF);

export class Mp4SampleTable {
    decodingTimestamps: Stts;
    compositionTimestampOffsets: Ctts;
    syncSamples: Stss;
    sampleSizes: Stsz;

    chunkOffsetBox: Stco
    samplesToChunkBox: Stsc;

    constructor(private _track: Mp4Track) {
        if (!_track) {
            throw new Error('Sample-table can not be created without a Track');
        }
    }

    digest() {

        debug('digesting sample table');

        let dts = 0;
        let frameCount = 0;

        const frames: Frame[] = [];
        const chunksDecompressed: {samplesPerChunk: number, sampleDescriptionIndex: number}[] = []

        function assertAndResetFrameCount() {
            if (frameCount !== frames.length) {
                throw new Error('Sample-to-chunk-list decompression yields inconsistent sample count. Input data may be corrupt.');
            }

            frameCount = 0;
        }

        this.decodingTimestamps.timeToSamples.forEach((entry: TimeToSampleEntry) => {

            for (let i = 0; i < entry.sampleCount; i++) {

                const isSyncFrame = this.syncSamples ? (this.syncSamples.syncSampleNumbers.indexOf(frameCount + 1) >= 0) : false;

                const newFrame = new Frame(
                    isSyncFrame ? Frame.IDR_FRAME : Frame.P_FRAME,
                    toMicroseconds(dts, this._track.getTimescale()),
                    this.sampleSizes.sampleSize || this.sampleSizes.entries[frameCount],
                    toMicroseconds(entry.sampleDelta, this._track.getTimescale())
                );

                newFrame.scaledDuration = entry.sampleDelta;
                newFrame.scaledDecodingTime = dts;
                newFrame.scaledPresentationTimeOffset = 0;
                newFrame.timescale = this._track.getTimescale();

                frames.push(newFrame);

                frameCount++; // note: here we incr the count after using it as an ordinal index

                dts += entry.sampleDelta;
            }
        });

        assertAndResetFrameCount();

        // Having a CTO table is not mandatory
        if (this.compositionTimestampOffsets) {
            this.compositionTimestampOffsets.cTimeOffsetToSamples.forEach((entry: CTimeOffsetToSampleEntry) => {
                for (let i = 0; i < entry.sampleCount; i++) {

                    frames[frameCount]
                        .setPresentationTimeOffsetUs(toMicroseconds(entry.sampleCTimeOffset, this._track.getTimescale()));

                    frames[frameCount].scaledPresentationTimeOffset = entry.sampleCTimeOffset;

                    frameCount++; // note: here we incr the count after using it as an ordinal index
                }
            });

            assertAndResetFrameCount();
        }

        this.samplesToChunkBox.sampleToChunks.forEach((sampleToChunkEntry: SampleToChunkEntry, index) => {

            // the sample-to-chunk box contains a compressed list
            // of possibly repeating properties (samplesPerChunk + sampleDescriptionIndex)
            // we need to decompress this information by looking at firstChunkIndex

            let chunksInThisEntry = 1;

            if (this.samplesToChunkBox.sampleToChunks.length === 1) {
                chunksInThisEntry = frames.length / sampleToChunkEntry.samplesPerChunk;
            } else if (index < this.samplesToChunkBox.sampleToChunks.length - 1) {
                chunksInThisEntry = this.samplesToChunkBox.sampleToChunks[index + 1].firstChunk
                    - sampleToChunkEntry.firstChunk;
            } else { // last chunk when not only chunk
                chunksInThisEntry = (frames.length - frameCount) / sampleToChunkEntry.samplesPerChunk;
            }

            for (let i=0; i < chunksInThisEntry; i++) {
                chunksDecompressed.push(sampleToChunkEntry);
                frameCount += sampleToChunkEntry.samplesPerChunk;
            }

        });

        assertAndResetFrameCount();

        chunksDecompressed.forEach((chunkSampleInfo, index) => {

            let sampleOffsetInChunk = 0;

            for (let i = 0; i < chunkSampleInfo.samplesPerChunk; i++) {

                const frame = frames[frameCount];

                frame.bytesOffset = this.chunkOffsetBox.chunkOffsets[index];
                frame.bytesOffset += sampleOffsetInChunk;

                sampleOffsetInChunk += frame.size;

                frameCount++;
            }

        });

        assertAndResetFrameCount();

        // Finally, append all frames to our track
        frames.forEach((frame) => {
            this._track.appendFrame(frame)
        });

        log(frames)
    }
};
