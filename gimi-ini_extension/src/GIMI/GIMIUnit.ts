import { Range } from "vscode";
import { GIMIIdentifier, GIMIUri } from "./GIMI";
import { GIMIString, LowString } from "./GIMIString";
import { GIMIProject } from "./GIMIProject";


interface MigotoStructI<PT, CT> {
    ID: GIMIIdentifier;
    root: GIMIProject;
    parent: PT;
    children: Map<GIMIString, CT>;
    range: Range;
}

interface MigotoStructIB {
    ID: GIMIIdentifier;
    root: unknown;
    parent: unknown;
    children: Map<GIMIString, unknown>;
    range: Range;
}


/**
 * basic members, need implenment using type
 */
export interface GIMIUnitI {
    GIMIuri: GIMIUri;
    root: GIMIUnitI | undefined
    parent: GIMIUnitI | undefined;
    children: Map<string, GIMIUnitI>;
    range: Range;
}

/**
 * basic functions
 * 
 * `<UnitType>:<fileRef>:<OtherInfo>`
 */
// export class GIMIUnit implements GIMIUnitI {
export class GIMIUnit {
    readonly root: GIMIProject;
    range: Range;
    private _children: Map<GIMIString, GIMIUnit> = new Map<GIMIString, GIMIUnit>;
    private _parent?: GIMIUnit;
    private _name: LowString;

    constructor(name: LowString, range: Range, root: GIMIProject, parent?: GIMIUnit, children?: GIMIUnit[]) {
        this.root = root;
        this.range = range;
        this._parent = parent;
        this._name = name;
        children?.forEach(_c => this._children.set(_c.name, _c))
    }

    get name() {
        return this._name.enc
    }
    
    get rawName() {
        return this._name.raw;
    }

    get parent() {
        return this._parent;
    }

    addChild(_in: GIMIUnit): boolean {
        let _p = this.parent
        while (_p) {
            if (_in === _p) {
                throw new Error("Cannot set parent; would cause a circular reference.")
            }
            _p = _p.parent
        }
        this._children.set(_in.name, _in);
        return true;
    }

    findChild(_in: GIMIString): GIMIUnit | undefined {
        return this._children.get(_in);
    }

    setParent(_in: GIMIUnit) {
        this._parent = _in;
    }

    setName(_in: LowString): void {
        this._name = _in
    }

    getLineRange(): {start: number, end: number} {
        return { start: this.range.start.line, end: this.range.end.line };
    }
}
