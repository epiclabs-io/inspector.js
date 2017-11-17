import { Sps } from './nal-units';
export default class SPSParser {
    static parseSPS(data: Uint8Array): Sps;
    private static getProfileString(profile_idc);
    private static getLevelString(level_idc);
    private static getChromaFormatString(chroma);
    private static skipScalingList(gb, count);
}
