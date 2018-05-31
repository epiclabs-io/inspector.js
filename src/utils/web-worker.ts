import * as index from '../index';
import { IDemuxer } from '../demuxer/demuxer';
import { Mp4Demuxer } from '../demuxer/mp4/mp4-demuxer';
import { MpegTSDemuxer } from '../demuxer/ts/mpegts-demuxer';
import { WebMDemuxer } from '../demuxer/webm/webm-demuxer';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
 */
type WebWorkerPostMessageFunc = (message: any, transferList?: Array<any>) => void;

declare const postMessage: WebWorkerPostMessageFunc;

export class WebWorker {
    public static onMessage = ((event) => {
        if (event.data) {
            switch (event.data.type) {
                case index.InspectorActionType.CREATE_MP4_DEMUX_JOB:
                    WebWorker.createMp4DemuxJob(event);
                    break;
                case index.InspectorActionType.CREATE_MPEGTS_DEMUX_JOB:
                    WebWorker.createMpegTSDemuxJob(event);
                    break;
                case index.InspectorActionType.CREATE_WEBM_DEMUX_JOB:
                    WebWorker.createWebMDemuxJob(event);
                    break;
                case index.InspectorActionType.EXECUTE_JOB_APPEND:
                    WebWorker.executeJobAppend(event);
                    break;
                case index.InspectorActionType.END_JOB:
                    WebWorker.endJob(event);
                    break;
                default:
                    break;
            }
        }
    });

    private static jobs: Map<String, IDemuxer> = new Map<String, IDemuxer>();

    private static createMp4DemuxJob(event: index.InspectorAction): void {
        const guid: String = WebWorker.createGuid();
        const demuxer: Mp4Demuxer = index.createMp4Demuxer();
        WebWorker.jobs.set(guid, demuxer);
        postMessage({
            type: index.InspectorActionType.CREATE_MP4_DEMUX_JOB_RESPONSE,
            job: guid,
            data: demuxer,
        });
    }

    private static createMpegTSDemuxJob(event: index.InspectorAction): void {
        const guid: String = WebWorker.createGuid();
        const demuxer: MpegTSDemuxer = index.createMpegTSDemuxer();
        WebWorker.jobs.set(guid, demuxer);
        postMessage({
            type: index.InspectorActionType.CREATE_MPEGTS_DEMUX_JOB_RESPONSE,
            job: guid,
            data: demuxer,
        });
    }

    private static createWebMDemuxJob(event: index.InspectorAction): void {
        const guid: String = WebWorker.createGuid();
        const demuxer: WebMDemuxer = index.createWebMDemuxer();
        WebWorker.jobs.set(guid, demuxer);
        postMessage({
            type: index.InspectorActionType.CREATE_WEBM_DEMUX_JOB_RESPONSE,
            job: guid,
            data: demuxer,
        });
    }

    private static executeJobAppend(event: index.InspectorAction): void {
        if (WebWorker.jobs.has(event.data.job)) {
            const demuxer: IDemuxer = WebWorker.jobs.get(event.data.job);
            demuxer.append(event.data.data);
            postMessage({
                type: index.InspectorActionType.EXECUTE_JOB_APPEND_RESPONSE,
                job: event.data.job,
                data: demuxer,
            });
        }
    }

    private static endJob(event: index.InspectorAction): void {
        if (WebWorker.jobs.has(event.data.job)) {
            const demuxer: IDemuxer = WebWorker.jobs.get(event.data.job);
            WebWorker.jobs.get(event.data.job).end();
            WebWorker.jobs.delete(event.data.job);
            postMessage({
                type: index.InspectorActionType.END_JOB_RESPONSE,
                job: event.data.job,
                data: demuxer,
            });
        }
    }

    private static createGuid(): String {
        return `${this.s4()}${this.s4()}-${this.s4()}-${this.s4()}-${this.s4()}-${this.s4()}${this.s4()}${this.s4()}`;
    }

    private static s4(): String {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
}
