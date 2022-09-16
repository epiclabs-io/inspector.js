import { BitReader } from "../../utils/bit-reader";

/**
 * Parses the PSI until the table-data section start, returns the size of remaining bytes in it, without the CRC.
 * @param packetParser
 * @param payloadUnitStartIndicator
 * @returns Section length minus 9 (5 bytes syntax section + 32 bits trailing CRC) = Table/Data section size
 */
export function parsePsiPacketHeader(packetParser: BitReader, payloadUnitStartIndicator: boolean) {
        // PSI structure start: read pointer field and skip filler bytes
        if (payloadUnitStartIndicator) {
            packetParser.skipBytes(packetParser.readByte());
        }
        /**
            Table ID 	8
            Section syntax indicator 	1
            Private bit 	1 	The PAT, PMT, and CAT all set this to 0. Other tables set this to 1.
            Reserved bits 	2 	Set to 0x03 (all bits on)
         */
        packetParser.skipBits(12); // skip prior PSI header data (we expect table ID to comply and syntax section to be present always).
        packetParser.skipBits(2); // Section length unused bits
        const sectionLength: number = packetParser.readBits(10); // Section length

        /*
        Table ID extension 	16 	Informational only identifier. The PAT uses this for the transport stream identifier and the PMT uses this for the Program number.
        Reserved bits 	2 	Set to 0x03 (all bits on)
        Version number 	5 	Syntax version number. Incremented when data is changed and wrapped around on overflow for values greater than 32.
        Current/next indicator 	1 	Indicates if data is current in effect or is for future use. If the bit is flagged on, then the data is to be used at the present moment.
        Section number 	8 	This is an index indicating which table this is in a related sequence of tables. The first table starts from 0.
        Last section number 	8 	This indicates which table is the last table in the sequence of tables.

        => 5 bytes

        */

        packetParser.skipBytes(5)// Skip all syntax section prior table data

        /*
        Table data 	N*8 	Data as defined by the Table Identifier.
        CRC32 	32 	A checksum of the entire table excluding the pointer field, pointer filler bytes and the trailing CRC32.
        */

        return sectionLength - 9;
}
