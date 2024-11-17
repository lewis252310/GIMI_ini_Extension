import { Diagnostic, DiagnosticSeverity, Position, Range, TextDocument, TextLine } from "vscode";
import { parseSectionTypeInfo, getSectionConfig, SectionType, isNonINIComfSection, isRegularSection, isCommandListSection, isPrefixSection, AllSectionsKeys } from "./GIMISectionTitle";
import { ChainStructureBase } from "./GIMIChainStructure"
import { GIMIProject } from "./GIMIProject";
import { encodeToGIMIString, GIMIString, LowString } from "./GIMIString";
import { GIMIVariable } from "./GIMIVariable";
import { GIMIFile } from "./GIMIFile";
import { isCommentText, GIMIDocumentParser, TextToken } from "./parser";
import { TempDiagnostic, DiagnosticsManager } from "../diagnostics"

type HeaderBasedRangeResultT = {
    state: "between", start: {lineText: string | undefined, position: Position}, end: {lineText: string | undefined, position: Position}
} | {
    state: "on", lineText: string, position: Position;
};

/**
 * `section:<scope>/<filePath>/<fileName>:<name>` noop, not this one
 */
// export class GIMISection extends GIMIUnit {
export class GIMISection extends ChainStructureBase {
    type: SectionType;
    root: GIMIProject;
    parent: GIMIFile;

    offset: number;
    
    range: Range;

    private _relDiags: TempDiagnostic[] = [];
    private _diagnostics: Diagnostic[] | undefined = undefined;

    private _relFoldRngs: Range[] = [];
    private _foldinfRanges: Range[] | undefined = undefined;

    private _rawTitle: string;
    private _name: GIMIString;
    private _fullName: GIMIString | undefined;
    private readonly _variables: Map<GIMIString, GIMIVariable> = new Map<GIMIString, GIMIVariable>

    /**
     * After constructor neeed run self.analyze() to real init, or instance just a shell for GIMISection
     * 
     * `titleLine` just input full, raw title line text
     */
    // constructor(components: {document: TextDocument, range: Range, offset: number, root: GIMIProject, parent: GIMIFile, prev?: GIMISection, next?: GIMISection, children?: GIMIVariable[]}) {
    constructor(components: {titleLine: string, offset: number, range: Range, root: GIMIProject, parent: GIMIFile}) {
        super();
        // super(GIMIuri, range, project, parent, children);
        const {titleLine, offset, range, root, parent} = components;
        const nameText = titleLine.trim();
        if (!GIMISection.isHeaderStr(nameText)) {
            if (nameText.length === 0) {
                throw new Error('GIMISection constructor errored. Empty string')
            }
            throw new Error('GIMISection constructor errored. Not follow the rules')
        }
        this._rawTitle = nameText;
        const sectionInfo = parseSectionTypeInfo(nameText);
        this.type = sectionInfo.type;
        this._name = sectionInfo.name;
        this.root = root;
        this.parent = parent;
        this.offset = offset;
        this.range = range;
    }

    /**encoded title name without prefix, for non-prefix type this normaly is empty*/
    get name(): GIMIString {
        return this._name;
    }

    /**encoded full title without start '[' and end ']'*/
    get fullName(): GIMIString {
        if (!this._fullName) {
            const tempTxt = this._rawTitle.slice(1, (this._rawTitle.endsWith("]") ? -1 : undefined));
            this._fullName = encodeToGIMIString(tempTxt);
        }
        return this._fullName;
    }

    /**full, noo-encoded, trimed section title line */
    get rawTitle(): string {
        return this._rawTitle;
    }

    get titleRange(): Range {
        const {start} = this.range;
        return new Range(start.translate(0, 1), start.translate(0, 1 + this.fullName.length));
    }

    /**lower case section type string. for undefined type will return empty string*/
    get prefix(): string {
        const config = getSectionConfig(this.type);
        return config?.name ?? "";
    }

    get variables(): GIMIVariable[] {
        return Array.from(this._variables.values());
    }

    get length(): number {
        return this.range.end.line - this.range.start.line + 1;
    }

    getIdentifierKeyPart(): GIMIString {
        if (this.type === undefined || isPrefixSection(this.type)) {
            return this.fullName;
        }
        return getSectionConfig(this.type)!.name as GIMIString
    }

    /**
     * just using on need move full section, if is some range change, use set range
     */
    offsetRangeLine(deltaLine: number) {
        if (deltaLine === 0) {
            return;
        }
        this._diagnostics = undefined;
        this._foldinfRanges = undefined;
        const {start: _st, end: _ed} = this.range
        this.range = new Range(_st.translate({lineDelta: deltaLine}), _ed.translate({lineDelta: deltaLine}))
    }

    getDiagnostics(): Diagnostic[] {
        if (this._diagnostics === undefined) {
            this._diagnostics = this._relDiags.map(({relRng: {start, end}, info, lv}) => {
                const secStP = this.range.start;
                const _stP = secStP.translate(start.line, start.character);
                const _edP = secStP.translate(end.line, end.character);
                return new Diagnostic(new Range(_stP, _edP), info, lv);
            })
        }
        return this._diagnostics;
    }
    
    getFoldingRange(): Range[] {
        if (this._foldinfRanges === undefined) {
            this._foldinfRanges = this._relFoldRngs.map(({start, end}) => {
                const secStP = this.range.start;
                return new Range(secStP.translate(start.line, start.character), secStP.translate(end.line, end.character));
            })
        }
        return this._foldinfRanges;
    }
    
    findVariable(name: string): GIMIVariable | undefined {
        return this._variables.get(encodeToGIMIString(name));
    }

    /**
     * 
     * @param range need inculde section title line.
     * @param offset 
     * @returns 
     */
    analyze(document: TextDocument, range: Range, offset?: number): boolean {
        if (document.uri.path !== this.parent.uri.path) {
            console.error('analyze failed, document uri is not seam as parent uri');
            return false
        }
        // const secHeaderText = document.lineAt(range.start.line).text.trim().match(/^\[(.+)\]$/i)
        const secHeaderText = document.lineAt(range.start.line).text.trim()
        if (!secHeaderText || secHeaderText !== this._rawTitle) {
            console.error('analyze failed, range start line at document is not seam as section has name');
            return false
        }
        this.range = range;
        offset && (this.offset = offset);
        analyzeSectionTitle(document.lineAt(range.start)).forEach((tempDiags) => {
            this._relDiags.push(tempDiags)
        })
        if (this.range.isSingleLine) {
            return true;
        }
        if (isNonINIComfSection(this.type)) {
            // do nothing for now
        } else if (this.type === "Constants") {
            for (let i = range.start.line; i <= range.end.line; i++) {
                const line = document.lineAt(i);
                if (isCommentText(line.text.trim()) || line.isEmptyOrWhitespace || i === range.start.line) {
                    continue;
                }
                const lineRelStart = line.range.start.translate(-range.start.line, -range.start.character)
                const lineRelEnd = line.range.end.with(lineRelStart.line);
                const {variable: varR, diags} = GIMIVariable.analyzeVariableDeclarationLine(line.text, new Range(lineRelStart, lineRelEnd));
                if (varR) {
                    const varInsten = new GIMIVariable(varR.name, varR.range, varR.type, this)
                    this._variables.set(varInsten.name, varInsten);
                }
                this._relDiags.push(...diags);
            }
        } else if (isRegularSection(this.type)) {
            const contentRng = this.range.with(this.range.start.translate(1));
            const result = analyzeRegularSection(document, contentRng, this.range.start, this.type)
            this._relDiags.push(...result.diags);
        } else if (isCommandListSection(this.type)) {
            const contentRng = this.range.with(this.range.start.translate(1));
            const result = analyzeCommandListSection(document, contentRng, this.range.start, this.type)
            this._relDiags.push(...result.diags);
            result.flodRngs && this._relFoldRngs.push(...result.flodRngs);
        } else {
            for (let i = range.start.line; i <= range.end.line; i++) {
                const line = document.lineAt(i);
                const text = line.text.trim();
                if (isCommentText(text) || line.isEmptyOrWhitespace) {
                    continue;
                }
                // const lineRelativeRange = new Range(line.range.start.translate(-range.start.line, -range.start.character), line.range.end.translate(-range.start.line))
                const lineRelStart = line.range.start.translate(-range.start.line, -range.start.character)
                const lineRelEnd = line.range.end.with(lineRelStart.line);
                if (text.includes(';')) {
                    this._relDiags.push({
                        relRng: new Range(lineRelStart, lineRelEnd),
                        info: 'Comments must be on a separate line. Continuation after codes is illegal.',
                        lv: DiagnosticSeverity.Error
                    })
                    continue;
                }
            }
        }
        return true;
    }

    // update(document: TextDocument, range: Range, offset?: number): boolean {
        
    // }
    
    private static titleMatcher = /^\[(.+?)](.+)?/;

    static parseTitleLine(line: string): {title: string, titleIndex: number, extra?: string, extraIndex?: number} | undefined {
        const text = line.trim();
        if (text.startsWith("[") && text.length > 2) {
            if (text.endsWith("]")) {
                return {title: text.slice(1, -1), titleIndex: 1};
            } else {
                const match = text.match(this.titleMatcher);
                if (match) {
                    return {
                        title: match[1],
                        titleIndex: 1,
                        extra: match[2],
                        extraIndex: 1 + (match[1].length - 1) + 2
                    }
                }
            }            
        }
        return undefined;
    }

    /**will not trim() self */
    static isHeaderStr(str: string): boolean {
        if (str.startsWith("[") && str.length > 2) {
            if (str.endsWith("]")) {
                return true;
            } else if (str.includes("]")) {
                return true;
            }
        }
        return false;
    }

    /**
     * find section header line before gived position
     */
    static findBeforeHeader(document: TextDocument, position: Position): {lineIndex: number, header?: string} {
        const _r: {lineIndex: number, header?: string} = {
            lineIndex: position.line < 0 ? 0 : position.line
        };
        for (let i = _r.lineIndex; i >= 0; i--) {
            const text = document.lineAt(i).text;
            if (this.isHeaderStr(text.trim())) {
                _r.lineIndex = i;
                _r.header = text;
                break;
            } else if (i === 0) {
                _r.lineIndex = i;
            }
        }
        return _r;
    }

    /**
     * find section header line after gived position
     */
    static findAfterHeader(document: TextDocument, position: Position): {lineIndex: number, header?: string} {
        const docsLL = document.lineCount - 1
        const _r: {lineIndex: number, header?: string} = {
            lineIndex: position.line > docsLL ? docsLL : position.line
        };
        for (let i = _r.lineIndex; i <= docsLL; i++) {
            const text = document.lineAt(i).text;
            if (this.isHeaderStr(text.trim())) {
                _r.lineIndex = i;
                _r.header = text;
                break;
            } else if (i === docsLL) {
                _r.lineIndex = i;
            } 
        }
        return _r;
    }

    /**
     * try to search for the smallest line-based range around `effectAt`.
     * 
     * start and end will mark on section title if exist.
     * 
     * if effectAt on section range, 
     * 
     * if startHeader is not exist, startHeaderPos will be position (0, 0).
     * 
     * if endHeader is not exist, endHeaderPos will be position of last line of document (last_line, 0).
     */
    // static encloseRangeWithHeaders(document: TextDocument, effectAt: Range | Position): {startHeader: string | undefined, startHeaderPos: Position, endHeader: string | undefined, endHeaderPos: Position}{
    static encloseRangeWithHeaders(document: TextDocument, effectAt: Range | Position): HeaderBasedRangeResultT {
        const {_stP, _edP} = (() => {
            if (effectAt instanceof Range) {
                return {_stP: effectAt.start, _edP: effectAt.end}
            } else {
                return {_stP: effectAt, _edP: effectAt}
            }
        })();
        if (_stP.line === _edP.line) {
            const lineText = document.lineAt(_stP).text.trim()
            if (this.isHeaderStr(lineText)) {
                return {state: "on", lineText: lineText, position: _stP};
            }
        }
        const { stPos, stText } = (() => {
            const { lineIndex, header } = this.findBeforeHeader(document, _stP);
            return {
                stPos: new Position(lineIndex, 0),
                stText: header
            }
        })();
        const { edPos, edText } = (() => {
            // let temp = this.findAfterHeader(document, _edP);
            // if (temp.lineIndex === stPos.line) {
            //     temp = this.findAfterHeader(document, _edP.translate({lineDelta: 1}));
            // }
            // const { lineIndex, header } = temp;
            const { lineIndex, header } = this.findAfterHeader(document, _edP);
            return {
                // edPos: header ? new Position(lineIndex, header.length - 1) : document.lineAt(document.lineCount - 1).range.end,
                edPos: new Position(lineIndex, 0),
                edText: header
            }
        })();
        return {
            state: "between",
            start: {lineText: stText, position: stPos},
            end: {lineText: edText, position: edPos}
        };
    }

    /**
     * Not work for init section array!! This is just analyzing the legal section range and section header original line.
     * 
     * analyze potentially legal section structures in `effectRange`.
     * 
     * if return undefiend means input range is all in namespace area (for now)
     */
    static extractVirtualSections(document: TextDocument, effectrRange?: Range): {sectionFullHeader: string, range: Range}[] | undefined {
        const { startLineIdx, endLineIdx }: {startLineIdx: number, endLineIdx: number} = (() => {
            const docuLastLIdx = document.lineCount - 1;
            if (effectrRange === undefined) {
                return { startLineIdx: 0, endLineIdx: docuLastLIdx}
            } else {
                return {
                    startLineIdx: Math.min(effectrRange.start.line, docuLastLIdx),
                    endLineIdx: Math.min(effectrRange.end.line, docuLastLIdx)
                };
            }
        })()
        const result: {sectionFullHeader: string, range: Range}[] = [];
        // rngS initial -1 because not every section will start at idx 0, and alos mark that first section has not been found yet.
        const lastSec = {rngS: -1, rngE: 0};
        const doPushLast = (): boolean => {
            if (lastSec.rngS === -1) {
                // means that this execute is triggered by found the first section header
                return false;
            } else if (lastSec.rngS <= lastSec.rngE) {
                const nameL = document.lineAt(lastSec.rngS);
                const secEndL = document.lineAt(lastSec.rngE);
                result.push({
                    sectionFullHeader: nameL.text,
                    range: new Range(nameL.range.start, secEndL.range.end)
                });
                return true;
            }
            return false;
        }
        for (let i = startLineIdx; i <= endLineIdx; i++) {
            const line = document.lineAt(i);
            if (line.isEmptyOrWhitespace) {
                continue;
            }
            const text = line.text.trim();
            if (isCommentText(text)) {
                // is a comment line
                continue;
            } else if (this.isHeaderStr(text)) {
                // section header line
                doPushLast();
                lastSec.rngS = i;
                lastSec.rngE = i;
            } else {
                // normal line
                lastSec.rngE = i;
                continue;
            }
        }
        doPushLast();
        return result.length === 0 ? undefined : result;
    }
}

function analyzeSectionTitle(line: TextLine): TempDiagnostic[] {
    const rawText = line.text;
    if (!GIMISection.isHeaderStr(rawText.trimStart())) {
        console.log("throw Error(analyzeSectionTitle ERROR!)")
        throw Error("analyzeSectionTitle ERROR! input is not a legal section title.");
    }
    const _r: TempDiagnostic[] = [];
    const lineRelSt = line.range.start.with(0);
    const lineRelEd = line.range.end.with(0);
    const lineRelRng = new Range(lineRelSt, lineRelEd);
    const match = rawText.match(/\s*\[(.+)\] *(.*)/d);
    if (!match) {
        _r.push({ relRng: lineRelRng, lv: DiagnosticSeverity.Error,
            info: "Nothing matched! This is an internal exception. !!! Shouldn't happen !!!" });
        return _r;
    }
    const [raw, name, extra] = (() => {
        return match.map((_m, i) => {
            return {txt: _m, idx: match.indices![i][0]}
        })
    })();
    for (const _u of name.txt.matchAll(/[^\w.]/dg)) {
        const stPos = lineRelSt.translate(0, name.idx + _u.indices![0][0]);
        _r.push({ relRng: new Range(stPos, stPos.translate(0, _u[0].length)),
            info: `Use '${_u[0]}' in title can cause problems.`, lv: DiagnosticSeverity.Warning
        });
    }
    if (extra.txt.length !== 0) {
        _r.push({
            relRng: new Range(lineRelSt.translate(0, (extra.idx)), lineRelEd),
            info: "No annotations are allowed after the section title.", lv: DiagnosticSeverity.Error
        });
    }
    return _r;
}

function sectionAnalyzeTemplate(docu: TextDocument, rng: Range, secStPos: Position, callback: (rawText: string, lineRelRng: Range, lineHasSemicolon: TempDiagnostic | undefined) => boolean): {lastAnalyzeLine: Range} {
    const lastAnalyzeLine = {relRng: new Range(0, 0, 0, 0)};
    for (let i = rng.start.line; i <= rng.end.line; i++) {
        const line = docu.lineAt(i);
        if (isCommentText(line.text.trimStart()) || line.isEmptyOrWhitespace) {
            continue;
        }

        const lineRelSt = line.range.start.translate(-secStPos.line, -secStPos.character);
        // const lineRelEd = line.range.end.with(lineRelSt.line);
        const lineRelRng = new Range(lineRelSt, line.range.end.with(lineRelSt.line));
        lastAnalyzeLine.relRng = lineRelRng;
        const lineHasSemicolon: TempDiagnostic | undefined = (() => {
            if (line.text.includes(';') && line.text.match(/".*?"|;/g)?.some(_m => _m === ';')) {
                return { relRng: lineRelRng, lv: DiagnosticSeverity.Error,
                    info: "Comments must be on a separate line. located in codes is illegal."
                };
            }
            return undefined;
        })();
        const state = callback(line.text, lineRelRng, lineHasSemicolon);
    }
    return {lastAnalyzeLine: lastAnalyzeLine.relRng}
}

function  handleBasicKeyValuePair(text: {content: string | TextToken, lineIdx?: number}, refDiags: TempDiagnostic[]): { key: TextToken, equal: TextToken, value: TextToken, complete: boolean } {
    const textToken = typeof text.content == "string" ? TextToken.fromString(text.content, text.lineIdx) : text.content;
    const {key, equal, value} = GIMIDocumentParser.tokenizeKeyValuePair(textToken);
    const _r = {key: key, equal: equal, value: value, complete: true};
    if (key.txt === "" || equal.txt !== "=" || value.txt === "") {
        refDiags.push({ relRng: textToken.getRange(),
            info: "Incomplete key-value pair.", lv: DiagnosticSeverity.Error });
        _r.complete = false;
    }
    return _r;
}

function handleBasicFirstPart(text: {content: string | TextToken, lineIdx?: number}, refDiags: TempDiagnostic[]): { line: TextToken, first: TextToken, content: TextToken, complete: boolean } {
    const textToken = typeof text.content == "string" ? TextToken.fromString(text.content, text.lineIdx) : text.content;
    const {first, content} = GIMIDocumentParser.tokenizeFirstPart(textToken);
    const _r = {line: textToken, first: first, content: content, complete: true};
    if (first.txt === "") {
        refDiags.push({ relRng: textToken.getRange(),
            info: "Missing first keyword or identifier.", lv: DiagnosticSeverity.Error });
        _r.complete = false;
    }
    return _r;
}

function handleBasicSingleValue(text: {content: string | TextToken, lineIdx?: number}, refDiags: TempDiagnostic[]): {value: TextToken, extra: TextToken, complete: boolean} {
    const textToken = typeof text.content == "string" ? TextToken.fromString(text.content, text.lineIdx) : text.content;
    const {value, extra} = GIMIDocumentParser.tokenizeSingleValue(textToken);
    const _r = {value: value, extra: extra, complete: true};
    if (extra.txt !== "") {
        refDiags.push({ relRng: extra.getRange(),
            info: "Unexpected keyword or identifier.",  lv: DiagnosticSeverity.Error });
        _r.complete = false;
    }
    return _r;
}

const SECTIONKEYVALUEREGEXRULE: { [K in AllSectionsKeys | "DEFAULT"]?: { [x: string]: RegExp } } = {
    Key: {
        key: /\S+/dg,
        variable: /,|[^\s,]+/dg,

    },
    DEFAULT: {DEFAULT: /\b(\w+)\b *(.+)?/d}
}

/**
 * if not find will returned default pattern `/\b(\w+) *(.+)?/d`, and can use catch group to check have extra value or not.
 */
function getValueRegexPattern(section: AllSectionsKeys, key: string): RegExp {
    const pattern = SECTIONKEYVALUEREGEXRULE[section]?.[key];
    return pattern ?? SECTIONKEYVALUEREGEXRULE["DEFAULT"]!["DEFAULT"];
}

type RegularSectionHandleStrategyT = (key: TextToken, value: TextToken, lineHasSemicolon: TempDiagnostic | undefined, refDiags: TempDiagnostic[]) => boolean;

function regHandleStrategyKeySec(key: TextToken, value: TextToken, lineHasSemicolon: TempDiagnostic | undefined, refDiags: TempDiagnostic[]): boolean {
    if (key.txt !== "key" && lineHasSemicolon) {
        // only `key` key need passby semicolon check. -_-
        refDiags.push(lineHasSemicolon);
        return false;
    }
    if (key.txt === "key" || key.txt.startsWith('$')) {
        // const singleResult = analyzeSingleValue(value);
        // console.log("Stop at here");
    } else if (key.txt === "condition") {
        const result = GIMIDocumentParser.diagnosticCondition(value);
        refDiags.push(...result);
    } else if (key.txt === "type") {
        const {value: valTk, extra: extTk} = GIMIDocumentParser.tokenizeSingleValue(value);
        DiagnosticsManager.runDiagnostics("global.unexpectedWord", [], () => {
            if (extTk.txt !== "") {
                refDiags.push({ relRng: extTk.getRange(),
                    info: "Unexpected keyword or identifier.", lv: DiagnosticSeverity.Error });
            }
            return true;
        })
        DiagnosticsManager.runDiagnostics("section.key.unknowType", [], () => {
            const legalType = ["cycle", "hold", "toggle"];
            if (!legalType.includes(valTk.txt)) {
                refDiags.push({ relRng: valTk.getRange(), lv: DiagnosticSeverity.Error,
                    info: `Unknow type '${valTk.txt}', The allowed types are ${legalType.join(", ")}.` });
            }
            return true;
        })
    
    // } else if (GIMIVariable.isVariableStr(key.txt)) {

    } else {
        handleBasicSingleValue({content: value}, refDiags);
    }
    return true;
}

type CommandListSectionHandleStrategyT = (line: TextToken, first: TextToken, content: TextToken, refDiags: TempDiagnostic[]) => boolean;

function cmdListHandleStrategyPresentSec(line: TextToken, first: TextToken, content: TextToken, refDiags: TempDiagnostic[]): boolean {
    if (first.txt.startsWith("$")) {
        // is a variable
        const {key, equal, value, complete: completeL} = handleBasicKeyValuePair({content: line}, refDiags);
        if (!completeL) {
            return false;
        }
        const relDiags = GIMIDocumentParser.diagnosticCondition(value);
        refDiags.push(...relDiags)
    } else if (first.txt === "post" || first.txt === "pre") {
        // is a have opt variable
        const {key, equal, value, complete: completeL} = handleBasicKeyValuePair({content}, refDiags);
        if (!completeL) {
            return false;
        }
        const relDiags = GIMIDocumentParser.diagnosticCondition(value);
        refDiags.push(...relDiags)
    } else if (first.txt === "run") {
        // is a section call, so should only have single value, do same process like variable?
        const {key, equal, value, complete: completeL} = handleBasicKeyValuePair({content: line}, refDiags);
        const tokens = value.regexSplit(txt => {
            const match = txt.match(GIMIDocumentParser.sectionInvokeRegex)
            return match && [{regexArr: match, indexes: [1,2]}];
        });
        if (!tokens) {
            return false;
        } else if (tokens[1].txt !== "") {
            refDiags.push({
                relRng: tokens[1].getRange(), lv: DiagnosticSeverity.Error,
                info: "Unexpected part or illegal sectoin name."
            })
        }
    }
    return true;
}

type SectionLinesAnalyzeResult = {
    /**diagnostics */
    diags: TempDiagnostic[],
    /**folding ranges, only for commandlist section */
    flodRngs?: Range[]
}

/**
 * @param startPosition position for current section start, normally is (X, 0)
 * @param range does not include the title line
 */
function analyzeRegularSection(document: TextDocument, range: Range, startPosition: Position, sectionType: SectionType): SectionLinesAnalyzeResult {
    const _r: SectionLinesAnalyzeResult = {diags: []};
    const tempDiags = _r.diags;
    
    let handleStrategy: RegularSectionHandleStrategyT | undefined = undefined;
    if (sectionType === "Key") {
        handleStrategy = regHandleStrategyKeySec;
    } else {
        handleStrategy = ((key, value, lineHasSemicolon, refDiags) => {
            if (lineHasSemicolon) {
                tempDiags.push(lineHasSemicolon);
                return false;
            }
            return true;
        })
    }

    sectionAnalyzeTemplate(document, range, startPosition, (rawText, lineRelRng, lineHasSemicolon) => {
        const lowText = rawText.toLowerCase();
        const {key, equal, value, complete: completeL} = handleBasicKeyValuePair({content: lowText, lineIdx: lineRelRng.start.line}, tempDiags);
        if (!completeL) {
            return false;
        }

        // 把 lineHasSemicolon 移出框架 然後改成一種檢查函數
        // 貌似又不可行了 非常頭疼

        handleStrategy?.(key, value, lineHasSemicolon, tempDiags);

        return true;
    })
    return _r;
}

/**
 * @param startPosition position for current section start, normally is (X, 0)
 * @param range does not include the title line
 */
function analyzeCommandListSection(document: TextDocument, range: Range, startPosition: Position, sectionType: SectionType): SectionLinesAnalyzeResult {
    const _r: SectionLinesAnalyzeResult = {diags: [], flodRngs: []};
    const tempDiags = _r.diags;

    const foldRngStStack: number[] = [];
    const foldRngs = _r.flodRngs!;
    
    const getMissConditionDiag = ((rng: Range): TempDiagnostic => {
        return { info: "Condition expression can't be empty.", lv: DiagnosticSeverity.Error, relRng: rng }
    })
    const getNotMoreExtra = ((rng: Range): TempDiagnostic => {
        return { info: "After endif and else not need anymore keyword or identifier.", lv: DiagnosticSeverity.Error, relRng: rng }
    })
    const procFoldRng = ((mode: "push" | "complete", lineIdx: number): boolean => {
        if (lineIdx < 0) {
            return false;
        }
        if (mode === "push") {
            foldRngStStack.push(lineIdx);
            return true;
        }
        if (foldRngStStack.length === 0) {
            return false;
        }
        foldRngs.push(new Range(foldRngStStack.pop()!, 0, lineIdx, 0));
        return true;
    });
    
    let handleStrategy: CommandListSectionHandleStrategyT | undefined = undefined;
    if (sectionType === "Present") {
        handleStrategy = cmdListHandleStrategyPresentSec;
    }

    const procRsut = sectionAnalyzeTemplate(document, range, startPosition, (rawText, lineRelRng, lineHasSemicolon) => {
        if (lineHasSemicolon) {
            // any lines in commandlist section should not have located ; i remeber
            tempDiags.push(lineHasSemicolon);
            return false;
        }
        const lineIdx = lineRelRng.start.line;
        const lowText = rawText.toLowerCase();
        const {line, first, content, complete: completeL} = handleBasicFirstPart({content: lowText, lineIdx}, tempDiags);
        if (!completeL) {
            return false;
        }
        if (first.txt === "endif") {
            procFoldRng("complete", lineIdx - 1);
            if (content.txt !== "") {
                tempDiags.push(getNotMoreExtra(content.getRange()));
                return false;
            }
            return true;
        } else if (first.txt === "else") {
            procFoldRng("complete", lineIdx - 1);
            procFoldRng("push", lineIdx);
            if (content.txt !== "") {
                tempDiags.push(getNotMoreExtra(content.getRange()));
                return false;
            }
            return true;
        } else if (first.txt === "if") {
            procFoldRng("push", lineIdx);
            if (content.txt === "") {
                tempDiags.push(getMissConditionDiag(first.getRange()));
                return false;
            }
            const result = GIMIDocumentParser.diagnosticCondition(content);
            tempDiags.push(...result);
            return true;
        } else if (first.txt.startsWith("el") && /el(?:se *)?if/i.test(first.txt)) {
            // try to match `else if` part, and use two step condition to do not create regex engine so often.
            procFoldRng("complete", lineIdx - 1);
            procFoldRng("push", lineIdx);
            if (content.txt === "") {
                tempDiags.push(getMissConditionDiag(first.getRange()));
                return false;
            }
            const result = GIMIDocumentParser.diagnosticCondition(content);
            tempDiags.push(...result);
            return true;
        }

        handleStrategy?.(line, first, content, tempDiags);

        return true;
    });

    if (foldRngStStack.length !== 0) {
        tempDiags.push({ relRng: procRsut.lastAnalyzeLine, lv: DiagnosticSeverity.Error,
            info: "Unclosed if-else block."
        })
    }

    return _r;
}