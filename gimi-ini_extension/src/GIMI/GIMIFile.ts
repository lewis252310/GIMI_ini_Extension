import { Uri, Range, Position, TextDocument, Diagnostic, DiagnosticSeverity, TextDocumentContentChangeEvent } from "vscode";
import { GIMIIdentifier } from "./GIMI";
import { GIMIProject } from "./GIMIProject";
import { GIMISection } from "./GIMISection";
import * as pathUtil from "path";
import { encodeToGIMIString, GIMIString, LowString } from "./GIMIString";
import { GIMIVariable } from "./GIMIVariable";
import { GIMIWorkspace } from "./GIMIWorkspace";
import { GIMINamespace } from "./GIMINamespace";
import { GIMIChainStructure, ChainIdentifier } from "./GIMIChainStructure"
import { isCommentText } from "./parser"
import { AllSections, getSectionConfig, isPrefixSection, SectionType } from "./GIMISectionTitle";

// type ChainContentTypes = GIMINamespace | GIMISection
type ChainContentTypes = GIMISection

/**
 * top: pos is upper them chain
 * buttom: pos is lower them chain
 * head: pos is in first node of chain
 * tail: pos is in last node of chain
 */
type ChainInfoPositionRelationT = {state: "in", data: {isAfter?: ChainContentTypes, isIn: ChainContentTypes, isBefore?: ChainContentTypes}
} | {state: "top", data: {isBefore: ChainContentTypes}
} | {state: "buttom", data: {isAfter: ChainContentTypes} }

type SectionRelationOfRangeT = {
    start: ChainInfoPositionRelationT, end: ChainInfoPositionRelationT,
    range: {isAfter?: ChainContentTypes, contains: ChainContentTypes[], isBefore?: ChainContentTypes},
}

/**
 * `file:/<filePath>/<fileName>` for `file:/root/folder/differenceA/RGB.ini`,
 * More detial are in {@link GIMIIdentifier}
 * And 'range' will always is a 0-leng position at text start, that is a remnants.
 */
// export class GIMIFile extends GIMIUnit {
export class GIMIFile {
    uri: Uri;
    isDisabled: boolean;
    private GIMINamespace: GIMINamespace;
    private _name: LowString;
    private _range: Range;
    private _separators: number[] = [];
    private _diagnostics: Diagnostic[] = [];
    private _root: GIMIProject;
    private structureChain: GIMIChainStructure<ChainContentTypes> = new GIMIChainStructure<ChainContentTypes>();
    /**not use now */
    private lastChangeInfo: {inUnit: GIMISection | GIMINamespace, position: Position};

    constructor(document: TextDocument, project: GIMIProject) {
        // const name = LowString.build(pathUtil.basename(uri.path));
        // super(name, new Range(new Position(0, 0), new Position(0, 0)), project, parent, children);
        this._name = LowString.build(pathUtil.basename(document.uri.path));
        this._root = project;
        this._range = new Range(
            new Position(0, 0),
            new Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
        );
        this.uri = document.uri;
        this.isDisabled = pathUtil.basename(document.uri.path).toLowerCase().startsWith('disabled');
        this.GIMINamespace = new GIMINamespace(this);
        // this.structureChain.push(this.GIMINamespace);
        this.lastChangeInfo = { inUnit: this.GIMINamespace, position: new Position(0, 0) };
        this.analyze(document);
    }

    get name() {
        return this._name.enc;
    }

    get rawName() {
        return this._name.raw;
    }
    
    get namespace() {
        return this.GIMINamespace.name;
    }

    get namespaceRaw() {
        return this.GIMINamespace.rawName;
    }

    get globalVariables(): GIMIVariable[] {
        const constantsSecs = this.structureChain.getGroup(AllSections.Constants.name as GIMIString);
        return constantsSecs ? constantsSecs.flatMap(sec => sec.variables) : [];
    }

    get rootProject(): GIMIProject {
        return this._root;
    }

    // get sections(): GIMISection[] {
    //     const _r: GIMISection[] = [];
    //     this.sectionChain.forEach((sec) => {
    //         _r.push(sec);
    //     });
    //     return _r;
    // }
    
    findGlobalVariable(name: GIMIString): GIMIVariable | undefined {
        const constantsSecs = this.structureChain.getGroup(AllSections.Constants.name as GIMIString);
        if (!constantsSecs) {
            return undefined;
        }
        let _r: GIMIVariable | undefined = undefined;
        constantsSecs.some(sec => {
            const vari = sec.findVariable(name);
            if (vari) {
                _r = vari;
                return true;
            }
        });
        return _r;
    }

    isSameUri(inputUri: Uri): boolean {
        return inputUri.fsPath === this.uri.fsPath
    }

    /**
     * update section duplicate diagnostics (file level) 
     */
    private updateDiagnostics(): void {
        this._diagnostics.length = 0;
        this.structureChain.getAllGroup().forEach(_g => {
            const { datas: sections } = _g;
            if (isPrefixSection(sections[0].type) && sections.length > 1) {
                sections.forEach(_sec => {
                    const range = new Range(_sec.range.start.translate(0, 1), _sec.range.start.translate(0, _sec.rawTitle.length - 2));
                    this._diagnostics.push(new Diagnostic(
                        range, "This type of section cant be duplicate names", DiagnosticSeverity.Error
                    ))
                })
            }
        })
    }
    
    getTypeOfSections(type: SectionType): GIMISection[] {
        const _r: GIMISection[] = []
        this.structureChain.forEach(sec => {
            sec.type === type && _r.push(sec);
        })
        return _r;
    }

    getAllDiagnostics(): Diagnostic[] {
        const _r: Diagnostic[] = []
        _r.push(...this._diagnostics);
        _r.push(...this.GIMINamespace.diagnostics);
        this.structureChain.forEach(_c => {
            _r.push(..._c.getDiagnostics());
        })
        return _r;
    }

    getFoldingRanges(): Range[] {
        // return this.structureChain.map(_c => _c.range);
        let _r: Range[] = [];
        this.structureChain.forEach(_c => {
            _r.push(_c.range);
            _r = _r.concat(_c.getFoldingRange());
        });
        return _r;
    }
    
    findSectionFromPosition(position: Position): GIMISection | undefined {
        let _r: GIMISection | undefined = undefined;
        this.structureChain.walk({}, ({current: sec}) => {
            if (sec.range.contains(position)) {
                _r = sec;
                return false;
            }
        })
        return _r;
    }

    findSection(name: GIMIString): GIMISection | undefined {
        return this.structureChain.get(name);
    }

    /**
     * i think processing for position can use copy or something similar to reduce one time operation
     * 
     * search on the current stored section chain structure, 
     * basically used to search for deleted ranges in `onDidChangeTextDocument()`
     * 
     * undefiend means chain length is 0
     * 
     * reture mean is input position is In|Before|After which section
     * isIn: position is in this unit
     * isBefore: position is before this unit
     * isAfter: position is after this unit
     * isAfter get but isBefore undefiend means position is in|after lest unit range
     * start|end marked unit start|end current stored line index, [start, end]
     */
    getSectionRelationFrom(effectAt: Range | Position): {
        start: ChainInfoPositionRelationT, end: ChainInfoPositionRelationT,
        range: {isAfter?: ChainContentTypes, contains: ChainContentTypes[], isBefore?: ChainContentTypes},
    } | undefined {
        const { stL, edL } = (() => {
            if (effectAt instanceof Range) {
                return {stL: effectAt.start.line, edL: effectAt.end.line};
            } else {
                return {stL: effectAt.line, edL: effectAt.line};
            }
        })();
        const _r: {
            start?: ChainInfoPositionRelationT, end?: ChainInfoPositionRelationT,
            range: {isAfter?: ChainContentTypes, contains: ChainContentTypes[], isBefore?: ChainContentTypes},
        } = { range: {contains: []} }
        const procResult = ((units: { prev?: ChainContentTypes, current: ChainContentTypes, next?: ChainContentTypes }, compL: number): ChainInfoPositionRelationT | undefined => {
            const {prev: prevUnit, current: curtUnit, next: nextUnit} = units;
            const _stL = curtUnit.range.start.line;

            // not vary sure should use `Infinity` or not. because on the logic is a bit... unsafe?
            // but use undefined is hard to do condition
            // const _edL = nextUnit ? nextUnit.range.start.line - 1 : undefined
            const _edL = nextUnit ? nextUnit.range.start.line - 1 : Infinity
            
            if (!prevUnit && compL < _stL) {
                // top of first node, top of chain
                return {state: "top", data: {isBefore: curtUnit}};
            } else if (!nextUnit && _edL < compL) {
                // buttom of last node, buttom of chain
                // for now is never in, because now at tail node will set _edL = `Infinity`
                return {state: "buttom", data: {isAfter:curtUnit}};
            } else if (!nextUnit && _stL <= compL) {
                // buttom of last node
                // in last node
                return {state: "in", data: {isAfter: prevUnit, isIn: curtUnit, isBefore: nextUnit}};
            } else if (_stL <= compL && compL <= _edL) {
                // in current node range
                return {state: "in", data: {isAfter: prevUnit, isIn: curtUnit, isBefore: nextUnit}};
            }
            return undefined;
        })
        this.structureChain.walk({}, ({prev, current, next}, index) => {
            _r.start === undefined && (_r.start = procResult({prev, current, next}, stL));
            _r.end === undefined && (_r.end = procResult({prev, current, next}, edL));
            _r.start && _r.range.contains.push(current);

            if (_r.start && _r.end) {
                _r.range.isAfter = _r.start.state === "top" ? undefined : _r.start.data.isAfter;
                // _r.range.isAfter = _r.start.data.isAfter;
                _r.range.isBefore = _r.end.state === "buttom" ? undefined : _r.end.data.isBefore;
                // _r.range.isBefore = _r.end.data.isBefore;
                return false;
            }
        })
        if (_r.start === undefined || _r.end === undefined) {
            // if chain.length === 0, will happen this
            return undefined;
            throw new Error("getChainInfoFrom() ERRORed! one of start or end is undefiend")
        }
        return {start: _r.start, end: _r.end, range: _r.range}
    }
    
    recalcSectionsRangeAt(atLine: number, delta: number): boolean {
        this.structureChain.forEach(_u => {
            if (_u.range.start.line > atLine) {
                _u.offsetRangeLine(delta);
            }
        })
        return true;
    }

    recalcSectionsRangeFrom(section: GIMISection, delta: number): boolean {
        if (section.identifier === "") {
            return false;
        }
        this.structureChain.walk({startAt: section.identifier}, unit => {
            unit.current.offsetRangeLine(delta);
        });
        return true;
    }

    /**
     * init, and will re-build anything
     */
    analyze(document: TextDocument): boolean {
        if (!this.isSameUri(document.uri)) {
            console.error('Cant analyzeFile, uri is not same.')
            return false;
        }
        this._range = new Range(
            new Position(0, 0),
            document.lineAt(document.lineCount - 1).range.end
        );

        this.GIMINamespace.analyze(document);
        const firstSecHeaderL = this.GIMINamespace.length
        const prevSec: {sec: GIMISection | undefined, endL: number} = {sec: undefined, endL: 0};
        const sections = GIMISection.extractVirtualSections(document, new Range(new Position(firstSecHeaderL, 0), this._range.end));
        if (sections !== undefined) {
            sections.forEach(({range, sectionFullHeader: header}, index) => {
                const section = new GIMISection({
                    titleLine: header,
                    range: range,
                    offset: range.start.line - prevSec.endL,
                    root: this._root,
                    parent: this
                });
                section.analyze(document, range);
                this.structureChain.push(section);
                prevSec.endL = range.end.line;
                prevSec.sec = section;
            })                
        }
        this.updateDiagnostics();
        GIMIWorkspace.updateDiagnosticCollection(this);
        return true;
    }

    update(document: TextDocument, changes: readonly TextDocumentContentChangeEvent[]): boolean {
        if (!this.isSameUri(document.uri)) {
            console.error('Cant updateFile, uri is not same.')
            return false;
        }

        // this.printSectionState("Before updateB");

        const reverseChanges = [...changes].reverse();
        const {finalChanges, totalDeltaLine} = (() => {
            let cumulativeOffset = 0;
            let totalDeltaLine = 0;
            const finalChanges = reverseChanges.map(_c => {
                const fixedOffset = _c.rangeOffset + cumulativeOffset
                // const stPos = document.positionAt(fixedOffset);
                // const edPos = document.positionAt(fixedOffset + _c.text.length);
                const textRange = new Range(document.positionAt(fixedOffset), document.positionAt(fixedOffset + _c.text.length));
                cumulativeOffset += (_c.text.length - _c.rangeLength);
                const localDeltaLine = -(_c.range.end.line - _c.range.start.line) + (textRange.end.line - textRange.start.line);
                totalDeltaLine += localDeltaLine;
                const cumulativeDeltaLine = totalDeltaLine;
                return {
                    delete: {
                        range: _c.range,
                        fromOffset: _c.rangeOffset,
                        length: _c.rangeLength,
                    },
                    added: {
                        text: _c.text,
                        range: textRange,
                        fromOffset: fixedOffset
                    },
                    deltaLine: localDeltaLine,
                    cumulativeDeltaLine
                }
            })
            return {finalChanges, totalDeltaLine};
        })();
        const chainRelations = finalChanges.map(_c => {
            return this.getSectionRelationFrom(_c.delete.range);
        }).filter(_v => _v !== undefined);
        if (chainRelations.length === 0) {
            this.GIMINamespace.analyze(document);
            return true;
        }
        finalChanges.forEach((_c, idx) => {
            const {start: addSt, end: addEd} = _c.added.range;
            const {start: addStRel, end: addEdRel} = chainRelations[idx];

            let changeStSec: GIMISection | "fileTop" | "fileButtom" = "fileTop";
            let changeEdSec: GIMISection | "fileTop" | "fileButtom" = "fileTop";
            let changeStPrevSec: GIMISection | undefined = undefined;
            let changeOffsetFromSec: GIMISection | undefined = undefined;
            let searchStL: number = addSt.line;
            let searchEdL: number = addEd.line;
            if (addStRel.state === "in") {
                changeStPrevSec = addStRel.data.isAfter;
                if (addSt.line === addStRel.data.isIn.range.start.line) {
                    const lineText = document.lineAt(addSt).text
                    if (GIMISection.isHeaderStr(lineText)) {
                        changeStSec = addStRel.data.isIn
                    } else {
                        changeStSec = addStRel.data.isAfter ?? "fileTop"
                    }
                } else {
                    changeStSec = addStRel.data.isIn
                }
            } else if (addStRel.state === "buttom") {
                changeStSec = "fileButtom";
                changeStPrevSec = addStRel.data.isAfter;
            } else {
                changeStSec = "fileTop"
                // state === "top" always not have prev, so undefiend
                changeStPrevSec = undefined;
            }

            if (addEdRel.state === "in") {
                if (addEd.line === addEdRel.data.isIn.range.start.line + _c.cumulativeDeltaLine) {
                    const lineText = document.lineAt(addEd.line).text
                    if (_c.delete.length === 0) {
                        // insert
                        changeEdSec = addEdRel.data.isIn;
                        changeOffsetFromSec = addEdRel.data.isBefore;
                        // if (_c.added.range.isSingleLine) {
                        if (GIMISection.isHeaderStr(lineText)) {
                            searchEdL++
                        }
                    } else if (_c.delete.length > 0) {
                        // delete or replace
                        changeEdSec = addEdRel.data.isIn;
                        changeOffsetFromSec = addEdRel.data.isBefore;
                        if (GIMISection.isHeaderStr(lineText)) {
                            searchEdL++
                        }
                    } else {
                        throw Error("WTF is this change do?");
                    }
                } else {
                    changeEdSec = addEdRel.data.isIn
                    changeOffsetFromSec = addEdRel.data.isBefore;
                }
            } else if (addEdRel.state === "top") {
                changeEdSec = "fileTop";
                changeOffsetFromSec = addEdRel.data.isBefore;
            } else {
                // addEdRel.state === "buttom"
                changeEdSec = "fileButtom";
                changeOffsetFromSec = undefined;
            }

            const extractRange = (() => {
                let _rng = GIMISection.encloseRangeWithHeaders(document, new Range(searchStL, 0, searchEdL, 0));
                if (_rng.state === "on") {
                    return new Range(_rng.position, _rng.position);
                } else {
                    return new Range(_rng.start.position, _rng.end.position);
                }
            })()
            const virtualSecs = GIMISection.extractVirtualSections(document, extractRange);
            let prevSecEndL = changeStPrevSec ? changeStPrevSec.range.end.line : 0;
            const addedSecs = virtualSecs?.map(({range, sectionFullHeader: header}, index) => {
                const section = new GIMISection({
                    titleLine: header,
                    range: range,
                    offset: range.start.line - prevSecEndL,
                    root: this._root,
                    parent: this
                });
                section.analyze(document, range);
                prevSecEndL = range.end.line;
                return section;
            })
            
            if (changeStSec === "fileTop" && changeEdSec === "fileTop") {
                if (addedSecs) {
                    const state = this.structureChain.pushMany(addedSecs);
                    if (!state) {
                        throw Error("updateB pushMany ERROR! pushMany faild");
                    }
                }
            } else if (changeStSec === "fileButtom" && changeEdSec === "fileButtom") {
                if (addedSecs) {
                    const state = this.structureChain.unshiftMany(addedSecs);
                    if (!state) {
                        throw Error("updateB pushMany ERROR! pushMany faild");
                    }
                }
            } else if (changeStSec === "fileTop" && changeEdSec === "fileButtom") {
                this.structureChain.clear();
                if (addedSecs) {
                    this.structureChain.pushMany(addedSecs);
                }
            } else {
                if (this.structureChain.isNotEmpty() === false) {
                    throw Error("updateB ERROR! why structureChain at here is empty? why??")
                }
                const spliceStId: ChainIdentifier = (() => {
                    if (changeStSec === "fileTop") {
                        return "HEAD";
                    } else if (changeStSec === "fileButtom") {
                        return "TAIL";
                    } else {
                        return changeStSec.identifier;
                    }
                })()
                const spliceEdId: ChainIdentifier = (() => {
                    if (changeEdSec === "fileTop") {
                        return "HEAD";
                    } else if (changeEdSec === "fileButtom") {
                        return "TAIL";
                    } else {
                        return changeEdSec.identifier;
                    }
                })()
                if (addedSecs) {
                    this.structureChain.splice(spliceStId, spliceEdId, ...addedSecs);
                } else {
                    this.structureChain.splice(spliceStId, spliceEdId);
                }
            }
            if (changeStSec === "fileTop") {
                this.GIMINamespace.analyze(document);
            }
            if (_c.deltaLine !== 0 && changeOffsetFromSec) {
                this.recalcSectionsRangeFrom(changeOffsetFromSec, _c.deltaLine);
                // this.recalcSectionsRangeAt(change.range.end.line, deltaLines);
            }
        })

        // this.printSectionState("After updateB");

        this.updateDiagnostics();
        GIMIWorkspace.updateDiagnosticCollection(this);

        return true;
    }

    printSectionState(info?: string): void {
        info && console.log(info);
        console.log("Current chain status:");
        this.structureChain.forEach(_u => {
            console.log(" -", _u.rawTitle);
        })
    }
}