import { BitReader } from '../../utils/bit-reader';
import { Sps, Size, FrameRate } from './nal-units';

export class SPSParser {
    public static parseSPS(data: Uint8Array): Sps {
        let gb: BitReader = new BitReader(data);
        const profile_idc: number = gb.readByte();
        gb.readByte();
        const level_idc: number = gb.readByte();
        gb.readUEG();

        const profile_string: string = SPSParser.getProfileString(profile_idc);
        const level_string: string = SPSParser.getLevelString(level_idc);
        let chroma_format_idc: number = 1;
        let chroma_format: number = 420;
        let chroma_format_table: number[] = [0, 420, 422, 444];
        let bit_depth: number = 8;

        if (profile_idc === 100 || profile_idc === 110 || profile_idc === 122 ||
            profile_idc === 244 || profile_idc === 44 || profile_idc === 83 ||
            profile_idc === 86 || profile_idc === 118 || profile_idc === 128 ||
            profile_idc === 138 || profile_idc === 144) {

            chroma_format_idc = gb.readUEG();
            if (chroma_format_idc === 3) {
                gb.readBits(1);
            }
            if (chroma_format_idc <= 3) {
                chroma_format = chroma_format_table[chroma_format_idc];
            }

            bit_depth = gb.readUEG() + 8;
            gb.readUEG();
            gb.readBits(1);
            if (gb.readBool()) {
                const scaling_list_count: number = (chroma_format_idc !== 3) ? 8 : 12;
                for (let i: number = 0; i < scaling_list_count; i++) {
                    if (gb.readBool()) {
                        if (i < 6) {
                            SPSParser.skipScalingList(gb, 16);
                        } else {
                            SPSParser.skipScalingList(gb, 64);
                        }
                    }
                }
            }
        }
        gb.readUEG();
        let pic_order_cnt_type: number = gb.readUEG();
        if (pic_order_cnt_type === 0) {
            gb.readUEG();
        } else if (pic_order_cnt_type === 1) {
            gb.readBits(1);
            gb.readSEG();
            gb.readSEG();
            const num_ref_frames_in_pic_order_cnt_cycle: number = gb.readUEG();
            for (let i: number = 0; i < num_ref_frames_in_pic_order_cnt_cycle; i++) {
                gb.readSEG();
            }
        }
        gb.readUEG();
        gb.readBits(1);

        const pic_width_in_mbs_minus1: number = gb.readUEG();
        const pic_height_in_map_units_minus1: number = gb.readUEG();

        const frame_mbs_only_flag: number = gb.readBits(1);
        if (frame_mbs_only_flag === 0) {
            gb.readBits(1);
        }
        gb.readBits(1);

        let frame_crop_left_offset: number = 0;
        let frame_crop_right_offset: number = 0;
        let frame_crop_top_offset: number = 0;
        let frame_crop_bottom_offset: number = 0;

        const frame_cropping_flag: boolean = gb.readBool();
        if (frame_cropping_flag) {
            frame_crop_left_offset = gb.readUEG();
            frame_crop_right_offset = gb.readUEG();
            frame_crop_top_offset = gb.readUEG();
            frame_crop_bottom_offset = gb.readUEG();
        }

        let sar_width: number = 1, sar_height: number = 1;
        let fps: number = 0, fps_fixed: boolean = true, fps_num: number = 0, fps_den: number = 0;

        let vui_parameters_present_flag: boolean = gb.readBool();
        if (vui_parameters_present_flag) {
            if (gb.readBool()) {  // aspect_ratio_info_present_flag
                const aspect_ratio_idc: number = gb.readByte();
                const sar_w_table: number[] = [1, 12, 10, 16, 40, 24, 20, 32, 80, 18, 15, 64, 160, 4, 3, 2];
                const sar_h_table: number[] = [1, 11, 11, 11, 33, 11, 11, 11, 33, 11, 11, 33,  99, 3, 2, 1];

                if (aspect_ratio_idc > 0 && aspect_ratio_idc < 16) {
                    sar_width = sar_w_table[aspect_ratio_idc - 1];
                    sar_height = sar_h_table[aspect_ratio_idc - 1];
                } else if (aspect_ratio_idc === 255) {
                    sar_width = gb.readByte() << 8 | gb.readByte();
                    sar_height = gb.readByte() << 8 | gb.readByte();
                }
            }

            if (gb.readBool()) {
                gb.readBool();
            }
            if (gb.readBool()) {
                gb.readBits(4);
                if (gb.readBool()) {
                    gb.readBits(24);
                }
            }
            if (gb.readBool()) {
                gb.readUEG();
                gb.readUEG();
            }
            if (gb.readBool()) {
                const num_units_in_tick: number = gb.readBits(32);
                const time_scale: number = gb.readBits(32);
                fps_fixed = gb.readBool();

                fps_num = time_scale;
                fps_den = num_units_in_tick * 2;
                fps = fps_num / fps_den;
            }
        }

        let sarScale: number = 1;
        if (sar_width !== 1 || sar_height !== 1) {
            sarScale = sar_width / sar_height;
        }

        let crop_unit_x: number = 0, crop_unit_y: number = 0;
        if (chroma_format_idc === 0) {
            crop_unit_x = 1;
            crop_unit_y = 2 - frame_mbs_only_flag;
        } else {
            const sub_wc: number = (chroma_format_idc === 3) ? 1 : 2;
            const sub_hc: number = (chroma_format_idc === 1) ? 2 : 1;
            crop_unit_x = sub_wc;
            crop_unit_y = sub_hc * (2 - frame_mbs_only_flag);
        }

        let codec_width: number = (pic_width_in_mbs_minus1 + 1) * 16;
        let codec_height: number = (2 - frame_mbs_only_flag) * ((pic_height_in_map_units_minus1 + 1) * 16);

        codec_width -= (frame_crop_left_offset + frame_crop_right_offset) * crop_unit_x;
        codec_height -= (frame_crop_top_offset + frame_crop_bottom_offset) * crop_unit_y;

        const present_width: number = Math.ceil(codec_width * sarScale);

        gb.destroy();
        gb = null;

        return new Sps(profile_string, level_string, bit_depth, chroma_format,
            SPSParser.getChromaFormatString(chroma_format), new FrameRate(fps_fixed, fps, fps_den, fps_num),
            new Size(sar_width, sar_height), new Size(codec_width, codec_height), new Size(present_width, codec_height));
    }

    private static getProfileString(profile_idc: number): string {
        switch (profile_idc) {
            case 66:
                return 'Baseline';
            case 77:
                return 'Main';
            case 88:
                return 'Extended';
            case 100:
                return 'High';
            case 110:
                return 'High10';
            case 122:
                return 'High422';
            case 244:
                return 'High444';
            default:
                return 'Unknown';
        }
    }

    private static getLevelString(level_idc: number): string {
        return (level_idc / 10).toFixed(1);
    }

    private static getChromaFormatString(chroma: number): string {
        switch (chroma) {
            case 420:
                return '4:2:0';
            case 422:
                return '4:2:2';
            case 444:
                return '4:4:4';
            default:
                return 'Unknown';
        }
    }

    private static skipScalingList(gb: BitReader, count: number): void {
        let last_scale: number = 8, next_scale: number = 8;
        let delta_scale: number = 0;
        for (let i: number = 0; i < count; i++) {
            if (next_scale !== 0) {
                delta_scale = gb.readSEG();
                next_scale = (last_scale + delta_scale + 256) % 256;
            }
            last_scale = (next_scale === 0) ? last_scale : next_scale;
        }
    }
}
