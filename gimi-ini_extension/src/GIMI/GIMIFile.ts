import { Uri, Range, Position, TextDocument, Diagnostic, DiagnosticSeverity, TextDocumentContentChangeEvent, TextLine } from "vscode";
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
import { ConfigurationsManager } from "../configurations";

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
    private _analyzed: boolean;
    private structureChain: GIMIChainStructure<ChainContentTypes> = new GIMIChainStructure<ChainContentTypes>();
    /**not use now */
    private lastChangeInfo: {inUnit: GIMISection | GIMINamespace, position: Position};

    constructor(document: TextDocument, project: GIMIProject) {
        // const name = LowString.build(pathUtil.basename(uri.path));
        // super(name, new Range(new Position(0, 0), new Position(0, 0)), project, parent, children);
        this._analyzed = false;
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
    
    findGlobalVariable(name: string): GIMIVariable | undefined {
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
        if (!ConfigurationsManager.settings.diagnostics.enable) {
            return;
        }
        this._diagnostics.length = 0;
        this.structureChain.getAllGroup().forEach(_g => {
            const { datas: sections } = _g;
            if (isPrefixSection(sections[0].type) && sections.length > 1) {
                sections.forEach(_sec => {
                    const range = new Range(_sec.range.start.translate(0, 1), _sec.range.start.translate(0, _sec.rawTitle.length - 1));
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
            // throw new Error("getChainInfoFrom() ERRORed! one of start or end is undefiend")
            return undefined;
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
        if (section.chainId === "") {
            return false;
        }
        this.structureChain.walk({startAt: section.chainId}, unit => {
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
        if (this._analyzed) {
            console.error(`File ${document.uri.fsPath} has been analyzed.`)
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
        if (changes.length <= 0) {
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
                const selfDeltaLine = -(_c.range.end.line - _c.range.start.line) + (textRange.end.line - textRange.start.line);
                const deltaLStP = totalDeltaLine
                totalDeltaLine += selfDeltaLine;
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
                    // deltaLine: selfDeltaLine,
                    deltaLine: {
                        startP: deltaLStP,
                        endP: cumulativeDeltaLine,
                        self: selfDeltaLine,
                        cumulative: cumulativeDeltaLine,
                    }
                }
            })
            return {finalChanges, totalDeltaLine};
        })();

        if (this.structureChain.isEmpty()) {
            const virtualSecs = GIMISection.extractVirtualSections(document, new Range(finalChanges[0].delete.range.start, new Position(document.lineCount - 1, 0)));
            let prevSecEndL = 0;
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
            addedSecs && this.structureChain.pushMany(addedSecs);
            this.GIMINamespace.analyze(document);
            return true;
        }        
        // after here, structureChain definitely have content.

        const updateInfoColl = (() => {
            type SecsRel = {prev?: GIMISection, affected: Set<GIMISection>, next?: GIMISection};
            type Info = {rng: Range, secs: SecsRel, deltaL: number}
            const infos: {rng: Range, secs: SecsRel, deltaL: number}[] = [];
            const updateSecsRel = (oldD: SecsRel, newD: SecsRel) => {
                oldD.prev = newD.prev;
                oldD.next = newD.next;
                const oldAffectedArr = [...oldD.affected.values()]
                const newAffectedArr = [...newD.affected.values()]
                if (oldAffectedArr[0] === newAffectedArr[1]) {
                    oldD.affected.forEach(sec => newD.affected.add(sec));
                    oldD.affected = newD.affected;
                } else if (oldAffectedArr[1] === newAffectedArr[0]) {
                    newD.affected.forEach(sec => oldD.affected.add(sec));
                } else {
                    newD.affected.forEach(sec => oldD.affected.add(sec));
                    // throw Error("updateInfoColl updateSecsRel() ERROR! something is")
                }
            };
            return {
                add: (rng: Range, secsRel: SecsRel, deltaLine: number) => {
                    const lastInfo = infos.pop();
                    if (lastInfo && lastInfo.rng.contains(rng)) {
                        lastInfo.rng = new Range(lastInfo.rng.start, rng.end);
                        updateSecsRel(lastInfo.secs, secsRel);
                        lastInfo.deltaL = deltaLine;
                        infos.push(lastInfo);
                    } else if (lastInfo && lastInfo.rng.intersection(rng)) {
                        lastInfo.rng = lastInfo.rng.union(rng);
                        updateSecsRel(lastInfo.secs, secsRel);
                        lastInfo.deltaL = deltaLine;
                        infos.push(lastInfo);
                    } else {
                        lastInfo && infos.push(lastInfo);
                        const {prev, affected, next} = secsRel
                        infos.push({rng, secs: {prev, next, affected: new Set(affected)}, deltaL: deltaLine});
                    }
                },
                get updates() {
                    return infos.map(info => {
                        const affected = [...info.secs.affected.values()];
                        const stAt = affected.at(0);
                        const edAt = affected.at(-1);
                        if (!stAt || !edAt) {
                            // throw Error("affectedSec ERROR! stSec or edSec is undefiend!");
                            console.log("affectedSec ERROR! stSec or edSec is undefiend!");
                            return undefined
                        }
                        return {stAt, edAt, affected, range: info.rng};
                    }).filter(info => info !== undefined);
                },
                get recalcRngs() {
                    const _r: {stAt: GIMISection, edAt?: GIMISection, deleteLine: number}[] = []
                    for (let i = 0; i < infos.length; i++) {
                        const curtInfo = infos[i];
                        const nextInfo = infos[i + 1];
                        const stAt = curtInfo.secs.next;
                        if (!stAt) {
                            /** if next section is undefined, means affected is contains chain tail.
                             *  so not need to add anything after this one
                             */
                            break;
                        }
                        const edAt = nextInfo?.secs.prev;
                        _r.push({stAt, edAt, deleteLine: curtInfo.deltaL})
                    }
                    return _r;
                }
            }
        })()
        const checkPos = ((pos: Position) => {
            return {
                isIn: (rng: Range) => {
                    return pos.isAfterOrEqual(rng.start) && pos.isBefore(rng.end);
                },
                isAfter: (rng: Range) => {
                    return pos.isAfterOrEqual(rng.end);
                },
                isBefore: (rng: Range) => {
                    return pos.isBefore(rng.start);
                }
            }
        })

        let isInChangeRange: boolean = false;
        let currentDeltaLine: number = 0;
        let changeItemIdx = 0;
        const procUpdate = (() => {
            let lastExistSecTitleL: TextLine = document.lineAt(0);
            let stP: Position | null = null;
            const secStack: Set<GIMISection> = new Set();
            let secStackPrev: GIMISection | undefined = undefined;
            type Secs = {prev?: GIMISection, current: GIMISection, next?: GIMISection};
            let secs: Secs | undefined = undefined;
            let maybeTitle: TextLine | undefined = undefined;
            let deltaL: number = 0;
            const check = () => {
                if (!secs || !maybeTitle) {
                    throw Error("procUpdateRng ERROR! the one of member is empty!");
                }
                return true;
            };
            return {
                reset: (curtSecs: Secs, maybeTitleL: TextLine, deltaLine: number) => {
                    secs = curtSecs;
                    maybeTitle = maybeTitleL;
                    deltaL = deltaLine;
                    secStack.clear();
                    secStackPrev = undefined;
                },
                st: (alsoPrevSec: boolean) => {
                    check();
                    if (alsoPrevSec && secs!.prev) {
                        secStackPrev = this.structureChain.getRelation(secs!.prev.chainId)?.prev;
                        secStack.add(secs!.prev);
                        secStack.add(secs!.current);
                        stP = lastExistSecTitleL.range.start
                    } else {
                        secStackPrev = secs!.prev;
                        secStack.add(secs!.current);
                        stP = maybeTitle!.range.start;
                    }
                },
                mid: () => {
                    check();
                    secStack.add(secs!.current);
                },
                ed: () => {
                    check();
                    if (!stP) {
                        throw Error("Start pos is not exist.");
                    }
                    const edPL = secs?.next ? secs.next.range.start.line + currentDeltaLine - 1 : document.lineCount - 1 ;
                    secStack.add(secs!.current);
                    updateInfoColl.add( new Range(stP, document.lineAt(edPL).range.end),
                        {prev: secStackPrev, affected: secStack, next: secs!.next}, deltaL);
                },
                postProc: () => {
                    check();
                    if (maybeTitle!.text.trim() === secs!.current.rawTitle) {
                        lastExistSecTitleL = maybeTitle!;
                    }
                }
            };
        })();
        {
            // namespace scope process need have onw block
            let updateNamespace: boolean = false;
            const {current: headSec, next: nextSec} = this.structureChain.getRelation("HEAD")!
            const namespaceScope = (() => {
                const headstL = headSec.range.start.line;
                if (headstL > 0) {
                    return new Range(new Position(0, 0), headSec.range.start);
                }
                return undefined;
            })();
            while (namespaceScope && finalChanges[changeItemIdx]) {
                const changeItem = finalChanges[changeItemIdx];
                const {start: delStP, end: delEdP} = changeItem.delete.range;
                const maybeTitleL = document.lineAt(0);
                // console.log(maybeTitleL.text);
                if (checkPos(delStP).isIn(namespaceScope) && checkPos(delEdP).isIn(namespaceScope)) {
                    // full change range in content, update deltaL and idx
                    changeItemIdx++;
                    currentDeltaLine = changeItem.deltaLine.cumulative;
                    updateNamespace = true;
                    continue;
                } else if (checkPos(delStP).isIn(namespaceScope) && checkPos(delEdP).isAfter(namespaceScope)) {
                    isInChangeRange = true;
                    currentDeltaLine = changeItem.deltaLine.startP;
                    updateNamespace = true;
                    procUpdate.reset(this.structureChain.getRelation("HEAD")!, maybeTitleL, changeItem.deltaLine.self);
                    procUpdate.st(false);
                    procUpdate.postProc();
                    break;
                } else if (isInChangeRange && checkPos(delEdP).isIn(namespaceScope)) {
                    throw Error("changeRng end alone in namesapce spoce, should not happend.");
                    continue;
                } else if (isInChangeRange) {
                    throw Error("changeRng across full namesapce spoce, should not happend.");
                    break;
                } else {
                    // console.log(`changeRng '${changeItemIdx}' is after namesapce spoce.`);
                    break;
                }
            }
            if (updateNamespace) {
                this.GIMINamespace.analyze(document);
            }
        }
        this.structureChain.walk({}, (secs, chainIdx) => {
            if (!finalChanges[changeItemIdx]) {
                return false;
            }
            const {prev: prevSec, current: curtSec, next: nextSec} = secs;
            const curtSecStPos = curtSec.range.start;
            const nextSecStPos = nextSec?.range.start ?? new Position(document.lineCount, 0);
            const curtSecScope = new Range(curtSec.range.start, nextSec?.range.start ?? new Position(document.lineCount, 0));
            const maybeTitleL = document.lineAt(curtSec.range.start.line + currentDeltaLine);
            // console.log(maybeTitleL.text);
            while (finalChanges[changeItemIdx]) {
                const changeItem = finalChanges[changeItemIdx];
                const {start: delStP, end: delEdP} = changeItem.delete.range;
                procUpdate.reset(secs, maybeTitleL, changeItem.deltaLine.cumulative);
                if (checkPos(delStP).isIn(curtSecScope) && checkPos(delEdP).isIn(curtSecScope)) {
                    if (delStP.line === curtSecStPos.line && !GIMISection.isHeaderStr(maybeTitleL.text)) {
                        procUpdate.st(true);
                    } else {
                        procUpdate.st(false);
                    }
                    changeItemIdx++;
                    currentDeltaLine = changeItem.deltaLine.cumulative;
                    procUpdate.ed();
                    continue;
                } else if (checkPos(delStP).isIn(curtSecScope) && checkPos(delEdP).isAfter(curtSecScope) && delEdP.isAfterOrEqual(nextSecStPos)) {
                    if (delStP.line === curtSecStPos.line && !GIMISection.isHeaderStr(maybeTitleL.text)) {
                        procUpdate.st(true);
                    } else {
                        procUpdate.st(false);
                    }
                    isInChangeRange = true;
                    currentDeltaLine = changeItem.deltaLine.startP;
                    break;
                } else if (isInChangeRange && checkPos(delEdP).isIn(curtSecScope)) {
                    isInChangeRange = false;
                    currentDeltaLine = changeItem.deltaLine.endP;
                    changeItemIdx++;
                    procUpdate.ed();
                    continue;
                } else if (isInChangeRange) {
                    procUpdate.mid();
                    // console.log(`changeRng '${changeItemIdx}' across full '${curtSec.fullName}' section.`);
                    break;
                } else {
                    // console.log(`changeRng '${changeItemIdx}' is after '${curtSec.fullName}' section.`);
                    break;
                }
            }
            procUpdate.postProc();
        });

        updateInfoColl.updates.forEach((update, idx) => {
            if (update === undefined) {
                return;
            }
            const virtualSecs = GIMISection.extractVirtualSections(document, update.range);
            let prevSecEndL: number | undefined = undefined;
            const addedSecs = virtualSecs?.map(({range, sectionFullHeader: header}, index) => {
                const section = new GIMISection({
                    titleLine: header,
                    range: range,
                    offset: prevSecEndL ? range.start.line - prevSecEndL : 0,
                    root: this._root,
                    parent: this
                });
                section.analyze(document, range);
                prevSecEndL = range.end.line;
                return section;
            });
            if (addedSecs) {
                this.structureChain.splice(update.stAt.chainId, update.edAt.chainId, ...addedSecs);
            } else {
                this.structureChain.splice(update.stAt.chainId, update.edAt.chainId);
            }
            // console.log("");
        })

        updateInfoColl.recalcRngs.forEach(item => {
            this.structureChain.walk({startAt: item.stAt.chainId}, unit => {
                unit.current.offsetRangeLine(item.deleteLine);
                if (item.edAt && unit.current.chainId === item.edAt.chainId) {
                    return false;
                }
            })
        })
        
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