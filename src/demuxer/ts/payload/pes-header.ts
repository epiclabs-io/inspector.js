import { BitReader } from "../../../utils/bit-reader";

/**
 *
 * @param {BitReader} packet PES packet-reader aligned to start of optional header section.
 * @returns [dts, pts]
 */
export function parsePesHeaderOptionalFields(packet: BitReader): [number, number] {

    /*
    Marker bits 	2 	10 binary or 0x2 hex
    Scrambling control 	2 	00 implies not scrambled
    Priority 	1
    Data alignment indicator 	1 	1 indicates that the PES packet header is immediately followed by the video start code or audio syncword
    Copyright 	1 	1 implies copyrighted
    Original or Copy 	1 	1 implies original
    */
    packet.skipBytes(1); // todo: parse the data-alignment idc

    /*
    PTS DTS indicator 	2 	11 = both present, 01 is forbidden, 10 = only PTS, 00 = no PTS or DTS
    ESCR flag 	1
    ES rate flag 	1
    DSM trick mode flag 	1
    Additional copy info flag 	1
    CRC flag 	1
    extension flag 	1
    */
    const ptsDtsFlags = packet.readByte();

    // PES header length 	8 	gives the length of the remainder of the PES header in bytes
    let headerRemainderLen = packet.readByte();

    // The extension header size has variable length based on the present flags.
    // We need to keep track how many bytes we will effectively read,
    // as this will vary, in order to skip the remaining non-read bytes in an easy way,
    // without having to treat all the possible flags and field lengths cases.
    let packetBytesRemaining = packet.remainingBytes();

    /*
    Optional fields 	variable length 	presence is determined by flag bits above
    Stuffing Bytes 	variable length 	0xff
    */

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
    let pts = NaN;
    let dts = NaN;
    if (ptsDtsFlags & 0xC0) {

        // the PTS and DTS are not written out directly. For information
        // on how they are encoded, see
        // http://dvd.sourceforge.net/dvdinfo/pes-hdr.html
        let lastByte;
        pts = (packet.readByte() & 0x0E) << 27 |
            (packet.readByte() & 0xFF) << 20 |
            (packet.readByte() & 0xFE) << 12 |
            (packet.readByte() & 0xFF) <<  5 |
            ((lastByte = packet.readByte()) & 0xFE) >>>  3;
        pts *= 4; // Left shift by 2
        pts += (lastByte & 0x06) >>> 1; // OR by the two LSBs
        dts = pts;
        if (ptsDtsFlags & 0x40) {
            dts = (packet.readByte() & 0x0E) << 27 |
            (packet.readByte() & 0xFF) << 20 |
            (packet.readByte() & 0xFE) << 12 |
            (packet.readByte() & 0xFF) << 5 |
            ((lastByte = packet.readByte()) & 0xFE) >>> 3;
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
