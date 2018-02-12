export interface IEBMLInfo {
    EBMLVersion: number;
    EBMLReadVersion: number;
    EBMLMaxIDLength: number;
    EBMLMaxSizeLength: number;
    DocType: string;
    Void: Uint8Array;
    DocTypeVersion: number;
    DocTypeReadVersion: number;
}
