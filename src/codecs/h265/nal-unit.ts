export class NalUnit {
    constructor (public type: number, public data: Uint8Array) { }
}

export class NalUnitsArray {
    public nalUnits: NalUnit[];
    constructor (public completeness: boolean, public type: number) {
        this.nalUnits = [];
    }
}
