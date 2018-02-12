export class Vint {
    constructor(public value: number, public length: number) {

    }
}

export class EbmlElement {
    public size: number;
    public data: String | number | Date | Uint8Array;
    public childs: EbmlElement[];

    constructor(public id: string, public type: string, public name: string, public start: number, public end: number) {
        this.childs = [];
    }
}

export interface IEbmlElementInfo {
    name: string;
    type: string;
    cppname?: string;
    level?: number;
    mandatory?: boolean;
    recursive?: boolean;
    multiple?: boolean;
    default?: string;
    maxver?: number;
    minver?: number;
    range?: string;
    webm?: boolean;
    br?: string[] | string;
    del?: string[];
    bytesize?: number;
    divx?: boolean;
    strong?: string;
    i?: string;
    description?: string;
}
