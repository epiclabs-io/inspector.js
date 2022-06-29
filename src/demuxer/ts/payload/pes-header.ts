import { BitReader } from "../../../utils/bit-reader";

export function parsePesHeaderTimestamps(packet: BitReader): [number, number] {
    /**
     * Thanks to Videojs/Muxjs for this bit, which does well the
     * trick around 32-bit unary bit-ops and 33 bit numbers :)
     * -> See https://github.com/videojs/mux.js/blob/87f777f718b264df69a063847fe0fb9b5e0aaa6c/lib/m2ts/m2ts.js#L333
     */
    // PTS and DTS are normally stored as a 33-bit number.  Javascript
    // performs all bitwise operations on 32-bit integers but javascript
    // supports a much greater range (52-bits) of integer using standard
    // mathematical operations.
    // We construct a 31-bit value using bitwise operators over the 31
    // most significant bits and then multiply by 4 (equal to a left-shift
    // of 2) before we add the final 2 least significant bits of the
    // timestamp (equal to an OR.)
    const ptsDtsFlags = packet.readByte();
    packet.skipBytes(1);
    let pts = NaN;
    let dts = NaN;
    if (ptsDtsFlags & 0xC0) {
        // the PTS and DTS are not written out directly. For information
        // on how they are encoded, see
        // http://dvd.sourceforge.net/dvdinfo/pes-hdr.html
        pts = (packet.readByte() & 0x0E) << 27 |
            (packet.readByte() & 0xFF) << 20 |
            (packet.readByte() & 0xFE) << 12 |
            (packet.readByte() & 0xFF) <<  5 |
            (packet.readByte() & 0xFE) >>>  3;
        pts *= 4; // Left shift by 2
        pts += (packet.readByte() & 0x06) >>> 1; // OR by the two LSBs
        dts = pts;
        if (ptsDtsFlags & 0x40) {
            let lastByte;
            dts = (packet.readByte() & 0x0E) << 27 |
            (packet.readByte() & 0xFF) << 20 |
            (packet.readByte() & 0xFE) << 12 |
            (packet.readByte() & 0xFF) << 5 |
            (lastByte = packet.readByte() & 0xFE) >>> 3;
            dts *= 4; // Left shift by 2
            dts += (lastByte & 0x06) >>> 1; // OR by the two LSBs
        }
    }
    return [dts, pts];
}
