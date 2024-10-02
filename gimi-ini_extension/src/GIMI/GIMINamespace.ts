import { Diagnostic, DiagnosticSeverity, Position, Range, TextDocument, Uri } from "vscode";
import { encodeToGIMIString, GIMIString } from "./GIMIString";
import { ChainStructureBase } from "./GIMIChainStructure"
import { GIMIFile } from "./GIMIFile";
import { isCommentText } from "./parser";
import { GIMISection } from "./GIMISection";


/**
 * namespace 
 */
export class GIMINamespace extends ChainStructureBase {
    parent: GIMIFile;
    range: Range;
    diagnostics: Diagnostic[] = [];
    /**
     * if parent file does not has legal namespace line, this will be undefiend
     */
    private _rawLineText: string | undefined;
    private _rawName: string | undefined;
    /**
     * if parent file does not has legal namespace, this will be undefiend
     */
    private _name: GIMIString | undefined;
    constructor(parent: GIMIFile, length?: number) {
        super();
        this.parent = parent;
        // this.length = length ?? 0;
        this.range = new Range(0, 0, 0, 0);
    }

    get name(): GIMIString | undefined {
        return this._name;
    }

    get rawText(): string | undefined {
        return this._rawLineText;
    }

    get rawName(): string | undefined {
        return this._rawName;
    }

    /**
     * because namespace only can at file start part, also means before first section
     * lenght 0 mean this file has not any passible namespace range
     */
    get length(): number {
        return this.range.end.line - this.range.start.line + 1;
    }

    getIdentifierKeyPart(): GIMIString {
        return "giminamespace" as GIMIString;
    }

    /**
     * @param endAt analyze over on this line or first section title 
     */
    analyze(document: TextDocument, endAt?: Position): boolean {
        if (!GIMINamespace.legalityCheck(document.uri, this.parent.uri)) {
            console.error("Errored at namespace analyze! not pass the legality check");
            return false
        }
        const docsLastLIdx = document.lineCount - 1
        this._name = undefined;
        this.range = this.range.with({end: document.lineAt(endAt?.line ?? docsLastLIdx).range.end});
        this.diagnostics.length = 0;

        for (let i = 0; i <= docsLastLIdx; i++) {
            const line = document.lineAt(i);
            if (line.isEmptyOrWhitespace) {
                continue;
            }
            const text = line.text.trim()
            if (isCommentText(text)) {
                continue;
            } else if (GIMISection.isHeaderStr(text)) {
                this.range = i === 0 ?
                    new Range(0, 0, 0, 0) :
                    this.range.with({end: document.lineAt(i - 1).range.end});
                break;
            }
            if (this._name === undefined) {
                const match = /^namespace *= *([\w\\]*)/i.exec(text);
                if (match === null) {
                    this.diagnostics.push(new Diagnostic(line.range,
                        'This is not a allowed namespace expression.', DiagnosticSeverity.Error));
                } else if (match[1] === '') {
                    this.diagnostics.push(new Diagnostic(line.range,
                        'Value of namespace key is missing.', DiagnosticSeverity.Error));
                } else if (!/[\w\\]+/i.test(match[1])) {
                    this.diagnostics.push(new Diagnostic(line.range,
                        `Value of namespace illegal. only allowed any word character and '\\'`, DiagnosticSeverity.Error));
                } else {
                    this._rawLineText = line.text
                    this._rawName = match[1];
                    this._name = encodeToGIMIString(match[1]);
                }
            } else {
                this.diagnostics.push(new Diagnostic(line.range,
                    'The namespace already exists, maybe this line is redundant?', DiagnosticSeverity.Error));
            }
        }
        return true
    }

    static isNamespaceStr(str: string): boolean {
        return str.toLowerCase().startsWith("namespace");
    }

    static legalityCheck(currentUri: Uri, targetUri: Uri): boolean {
        if (currentUri.path !== targetUri.path) {
            console.error("Errored at namespace legalityCheck! input uri is not the seam as target uri");
            return false;
        // } else if (range.start.line !== 0) {
        //     console.error("Errored at namespace legalityCheck! input range is not start at first for file");
        //     return false;
        }
        return true;
    }

    /**
     * from document start to find namespace area
     * endAt: the search end line should end at where, 
     */
    static extractVirtualNamespace(document: TextDocument, endAt?: Position): Range | undefined {
        const docsEndLineIdx = document.lineCount - 1;
        const _endL = endAt ? endAt.line : docsEndLineIdx;
        let _r: Range | undefined = undefined;
        for (let i = 0; i <= _endL; i++) {
            const line = document.lineAt(i);
            if (line.isEmptyOrWhitespace) {
                continue;
            }
            const text = line.text.trim();
            if (isCommentText(text)) {
                continue;
            }
            if (GIMISection.isHeaderStr(text)) {
                if (i === 0) {
                    // not have any space for namespace
                    break;
                }
                _r = document.lineAt(i - 1).range.with({start: new Position(0, 0)});
                break;
            } else if (i === _endL) {
                _r = line.range.with({start: new Position(0, 0)});
                break;
            }
        }
        return _r;
    }
}