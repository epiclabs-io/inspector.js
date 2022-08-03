import { BitReader } from "../../../utils/bit-reader";

/**
 *
 * @param packet
 * @returns [dts, pts]
 */
export function parsePesHeader(packet: BitReader): [number, number] {
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

    packet.skipBytes(1); // todo: parse the data-alignment idc

    const ptsDtsFlags = packet.readByte();

    // number of bytes following this bytes until payload data section
    let headerRemainderLen = packet.readByte();

    // The extension header size has variable length based on the present flags.
    // We need to keep track how many bytes we will effectively read,
    // as this will vary, in order to skip the remaining non-read bytes in an easy way,
    // without having to treat all the possible flags and field lengths cases.
    let packetBytesRemaining = packet.remainingBytes();

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

    // count the bytes read since the timing section start
    packetBytesRemaining -= packet.remainingBytes();
    // subtract the read bytes from the header len read before
    headerRemainderLen -= packetBytesRemaining;
    // skip the bytes to point packet to data section
    packet.skipBytes(headerRemainderLen);

    return [dts, pts];
}
