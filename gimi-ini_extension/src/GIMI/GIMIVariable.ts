import { DiagnosticSeverity, Range } from "vscode";
import { GIMIIdentifier } from "./GIMI";
import { GIMIUnit } from "./GIMIUnit";
import { GIMISection } from "./GIMISection";
import { GIMIFile } from "./GIMIFile";
import { GIMIString } from "./GIMIString";
import { RelativeDiagnostic, TextToken } from "./parser";

type VariableType = 'persist'| 'global' | 'local'

type VariableAnalyzeResult = {
    /**variable name with `$` mark, if not exist means analyse fails with clear error */
    variable?: {
        name: string,
        range: Range,
        type: VariableType
    },
    diags: RelativeDiagnostic[]
}

/**
 * `variable#$\<filePath>\<name>`
 */
// export class GIMIVariable extends GIMIUnit {
export class GIMIVariable {
    type: VariableType;
    /**wiht out `$` mark non-encoded string */
    private _rawName: string;
    /**with out `$` mark encoded string */
    name: GIMIString;
    range: Range;
    parent: GIMISection;
    // constructor(identifier: GIMIIdentifier, range: Range, type: VariableType, parent?: GIMIIdentifier, children?: GIMIIdentifier[]) {
    constructor(rawText: string, range: Range, type: VariableType, parent: GIMISection) {
        // super(identifier, range, parent, children);
        this.type = type;
        const _name = rawText.startsWith("$") ? rawText.slice(1) : rawText
        this._rawName = _name;
        this.name = _name.toLowerCase() as GIMIString
        this.range = range;
        this.parent = parent;
    }

    static readonly varLineRegex = /\w+|\$\w+|\S+/g;

    static tokenizeVariableDeclarationLine(lineText: string, range: Range): TextToken[] {
        const lineToken = new TextToken(lineText, range.start.line, [range.start.character, range.end.character]);
        const tokens = lineToken.regexSplit(txt => {
            const matchs = [...txt.matchAll(this.varLineRegex)]
            return matchs.map(_m => {
                return {regexArr: _m, indexes: [0]};
            })
        })
        return tokens ?? [];
    }

    private static variableDeclarationType(token: TextToken) {
        switch (token.txt) {
            case "global":
                return "scopeG";
            case "local":
                return "scopeL";
            case "persist":
                return "persist";
            case "=":
                return "equal";
            default:
                if (token.txt.startsWith("$")) {
                    return "var";
                }
                return "value";
        }
    }

    static analyzeVariableDeclarationLine(lineText: string, range: Range): VariableAnalyzeResult {
        const lowText = lineText.toLowerCase();
        const tokens = this.tokenizeVariableDeclarationLine(lowText, range);
        const _r: VariableAnalyzeResult = { diags: []};
        if (tokens.length === 0) {
            // not shore what times will happend this thing
            return _r;
        }
        let expectState: "scope" | "var" | "varOrPersist" | "value" | "equal" = "scope";
        const stateRecord: string[] = [];
        for (let i = 0; i < tokens.length; i++) {
            const tk = tokens[i];
            const tkt = this.variableDeclarationType(tk);
            let handleVar = false;
            let errInfo = "";
            switch (expectState) {
                case "scope":
                    if (tkt === "scopeG") {
                        expectState = "varOrPersist";
                    } else if (tkt === "scopeL") {
                        expectState = "var";
                    // } else if (tkt === "persist") {
                    } else {
                        expectState = "var";
                        errInfo = "Must be a scope modifier."
                    }
                    break;
                case "varOrPersist":
                    if (tkt === "var") {
                        expectState = "equal";
                        handleVar = true;
                    } else if (tkt === "persist") {
                        expectState = "var";
                    } else if (tkt === "scopeG") {
                        // never used actually
                        expectState = "var";
                        errInfo = "Scope modifier must before persist modifier."
                    } else {
                        expectState = "equal";
                        errInfo = "Must be a variable declaration."
                    }
                    break;
                case "var":
                    if (tkt !== "var") {
                        errInfo = "Must be a variable declaration.";
                    } else {
                        handleVar = true;
                    }
                    expectState = "equal";
                    break;
                case "equal":
                    if (tkt !== "equal") {
                        errInfo = "Must be a `=` operator.";
                    }
                    expectState = "value";
                    break;
                case "value":
                    // do nothing
                    break;
                default:
                    errInfo = "Something in exception case. This should never happend.";
                    break;
            }
            if (handleVar) {
                // type of midd obj is {[x: string]: VariableType | "out"}
                const varT = {
                    persist: "persist",
                    scopeG: "global",
                    scopeL: "local"
                }[stateRecord.at(-1) ?? ""];
                varT && (_r.variable = {name: tk.txt, range: tk.getRange(), type: varT as VariableType});
            }
            stateRecord.push(tkt);
            if (errInfo) {
                _r.diags.push({relRng: tk.getRange(), info: errInfo, lv: DiagnosticSeverity.Error});
            }
            if (expectState === "value" && tkt === "equal" && i === tokens.length - 1) {
                _r.diags.push({
                    relRng: new Range(tk.line, tk.rng[1] + 2, tk.line, tk.rng[1] + 2),
                    info: "Missing value declaration.", lv: DiagnosticSeverity.Error
                })
            }
        }
        return _r;
    }

    static isVariableStr(str: string): boolean {
        return str.startsWith("$");
    }
}
