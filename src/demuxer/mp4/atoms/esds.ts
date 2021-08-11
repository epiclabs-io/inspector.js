import ByteParserUtils from '../../../utils/byte-parser-utils';
import { Atom } from './atom';


class Descriptor {
    public children: Descriptor[] = [];

    constructor(public type: string, public payloadSize: number, public size: number) {
        // do nothing
    }

    parseChildren(data: Uint8Array, size: number) {
        let offset = 0;
		while (offset < size) {
			const descriptor = Descriptor.parseDescriptors(data.subarray(offset));
            offset += descriptor.size;
			this.children.push(descriptor);
		}
    }

    public static parseDescriptors(data: Uint8Array): Descriptor {
        let offset = 0;
        const streamDescriptor = data[offset++];
        
        let descriptorSize = 0;

        let byteRead = data[offset++];
        while (byteRead & 0x80) {
			descriptorSize = (byteRead & 0x7F) << 7;
			byteRead = data[offset++];
		}
        descriptorSize += byteRead & 0x7F;

        if (streamDescriptor === 3) {
            return ESDescriptor.parse(data.subarray(offset), descriptorSize, descriptorSize + offset);
        } else if (streamDescriptor === 4) {
            return DecoderConfigDescriptor.parse(data.subarray(offset), descriptorSize, descriptorSize + offset);
        } else if (streamDescriptor === 5) {
            return DecoderSpecificInfo.parse(data.subarray(offset), descriptorSize, descriptorSize + offset);
        } else if (streamDescriptor === 6) {
            return SLConfigDescriptor.parse(data.subarray(offset), descriptorSize, descriptorSize + offset);
        } else {
            return new Descriptor(`unknown|${streamDescriptor}`, descriptorSize, descriptorSize + offset);
        }
    }
}

export class ESDescriptor extends Descriptor {

    constructor(public esId: number, public dependsOnEsId: number, public flags: number,
        public url: string, public ocrEsId: number, public payloadSize: number,  public size: number) {
        super('ESDescriptor', payloadSize, size);
    }

    public static parse(data: Uint8Array, payloadSize: number, size: number) {
        let offset = 0;
        let esId = ByteParserUtils.parseUint16(data, offset);
        offset += 2;

        let dependsOnEsId = 0;
        let flags = data[offset++];
		if (flags & 0x80) {
			dependsOnEsId = ByteParserUtils.parseUint16(data, offset);
			offset += 2;
		} 

        let url = '';
		if (flags & 0x40) {
			const len = data[offset++];
			url = ByteParserUtils.parseStringWithLength(data, offset, len);
			offset += len;
		} 

        let ocrEsId = 0;
		if (flags & 0x20) {
			ocrEsId = ByteParserUtils.parseUint16(data, offset);
			offset += 2;
		} 

        const descriptor = new ESDescriptor(esId, dependsOnEsId, flags, url, ocrEsId, payloadSize, size);
        descriptor.parseChildren(data.subarray(offset), payloadSize - offset);

        return descriptor;
    }
}

export class DecoderConfigDescriptor extends Descriptor {

    constructor(public oti: number, public streamType: number, public bufferSize: number,
        public maxBirate: number, public avgBitrate: number, public payloadSize, public size: number) {
        super('DecoderConfigDescriptor', payloadSize, size);
    }

    public static parse(data: Uint8Array, payloadSize: number, size: number) {
        let offset = 0;
        const oti = data[offset++];
        const streamType = data[offset++];
        const bufferSize = ByteParserUtils.parseUint(data, offset, 3);
        offset += 3;

        const maxBitrate = ByteParserUtils.parseUint32(data, offset);
        offset += 4;

        const avgBitrate = ByteParserUtils.parseUint32(data, offset);
        offset += 4;

        const descriptor = new DecoderConfigDescriptor(oti, streamType, bufferSize, maxBitrate, avgBitrate, payloadSize, size);
        descriptor.parseChildren(data.subarray(offset), payloadSize - offset);

        return descriptor;
    }
}

export class DecoderSpecificInfo extends Descriptor {

    constructor(public data: Uint8Array, public payloadSize, public size: number) {
        super('DecoderSpecificInfo', payloadSize, size);
    }

    public static parse(data: Uint8Array, payloadSize: number, size: number) {
        const descriptor = new DecoderSpecificInfo(data.subarray(0, payloadSize), payloadSize, size);
        return descriptor;
    }
}


export class SLConfigDescriptor extends Descriptor {

    constructor(public data: Uint8Array, public payloadSize, public size: number) {
        super('SLConfigDescriptor', payloadSize, size);
    }

    public static parse(data: Uint8Array, payloadSize: number, size: number) {
        const descriptor = new SLConfigDescriptor(data.subarray(0, payloadSize), payloadSize, size);
        return descriptor;
    }
}

export class Esds extends Atom {
    public version: number;
    public flags: Uint8Array;
    public descriptors: Descriptor[];

    public static parse(data: Uint8Array): Atom {
        const esds: Esds = new Esds(Atom.esds, data.byteLength);

        esds.version = data[0];
        esds.flags = data.subarray(1, 4);
        
        esds.descriptors = []; 
        esds.descriptors.push(Descriptor.parseDescriptors(data.subarray(4)));

        return esds;
    }

}
