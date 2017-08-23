export class Atom {
    public static ftyp: string = 'ftyp';
    public static styp: string = 'styp';
    public static avc1: string = 'avc1';
    public static avc3: string = 'avc3';
    public static hvc1: string = 'hvc1';
    public static hev1: string = 'hev1';
    public static s263: string = 's263';
    public static d263: string = 'd263';
    public static vp08: string = 'vp08';
    public static vp09: string = 'vp09';
    public static mdat: string = 'mdat';
    public static mp4a: string = 'mp4a';
    public static wave: string = 'wave';
    public static ac_3: string = 'ac-3';
    public static dac3: string = 'dac3';
    public static ec_3: string = 'ec-3';
    public static dec3: string = 'dec3';
    public static dtsc: string = 'dtsc';
    public static dtsh: string = 'dtsh';
    public static dtsl: string = 'dtsl';
    public static dtse: string = 'dtse';
    public static ddts: string = 'ddts';
    public static tfdt: string = 'tfdt';
    public static tfhd: string = 'tfhd';
    public static trex: string = 'trex';
    public static trun: string = 'trun';
    public static sidx: string = 'sidx';
    public static moov: string = 'moov';
    public static mvhd: string = 'mvhd';
    public static trak: string = 'trak';
    public static mdia: string = 'mdia';
    public static minf: string = 'minf';
    public static stbl: string = 'stbl';
    public static avcC: string = 'avcC';
    public static hvcC: string = 'hvcC';
    public static vpcC: string = 'vpcC';
    public static esds: string = 'esds';
    public static moof: string = 'moof';
    public static traf: string = 'traf';
    public static mvex: string = 'mvex';
    public static tkhd: string = 'tkhd';
    public static edts: string = 'edts';
    public static elst: string = 'elst';
    public static mdhd: string = 'mdhd';
    public static hdlr: string = 'hdlr';
    public static stsd: string = 'stsd';
    public static pssh: string = 'pssh';
    public static sinf: string = 'sinf';
    public static schm: string = 'schm';
    public static schi: string = 'schi';
    public static tenc: string = 'tenc';
    public static encv: string = 'encv';
    public static enca: string = 'enca';
    public static frma: string = 'frma';
    public static saiz: string = 'saiz';
    public static saio: string = 'saio';
    public static uuid: string = 'uuid';
    public static senc: string = 'senc';
    public static pasp: string = 'pasp';
    public static TTML: string = 'TTML';
    public static vmhd: string = 'vmhd';
    public static mp4v: string = 'mp4v';
    public static stts: string = 'stts';
    public static stss: string = 'stss';
    public static ctts: string = 'ctts';
    public static stsc: string = 'stsc';
    public static stsz: string = 'stsz';
    public static stco: string = 'stco';
    public static co64: string = 'co64';
    public static tx3g: string = 'tx3g';
    public static wvtt: string = 'wvtt';
    public static stpp: string = 'stpp';
    public static samr: string = 'samr';
    public static sawb: string = 'sawb';
    public static dinf: string = 'dinf';
    public static dref: string = 'dref';
    public static url: string = 'url ';
    public static smhd: string = 'smhd';
    public static mfhd: string = 'mfhd';
    public static emsg: string = 'emsg';

    constructor (public type: string, public size: number) {
    }

    public static isContainerBox(type: string): boolean {
        return type === Atom.moov || type === Atom.trak || type === Atom.mdia
            || type === Atom.minf || type === Atom.stbl || type === Atom.moof
            || type === Atom.traf || type === Atom.mvex || type === Atom.stsd
            || type === Atom.mp4a || type === Atom.avc1 || type === Atom.dref
            || type === Atom.dinf;
    }
}

export class ContainerAtom extends Atom {
    containerDataOffset: number;
    atoms: Atom[];

    constructor(type: string, size: number) {
        super(type, size);
        this.containerDataOffset = 0;
    }
}
