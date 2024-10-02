import { Range, Position, TextDocument, DiagnosticSeverity, TextLine } from "vscode";

export type RelativeDiagnostic = {
    relRng: Range,
    info: string,
    lv: DiagnosticSeverity
}

export class TextToken {
    readonly txt: string;
    readonly line: number;
    readonly rng: [number, number];
    constructor(text: string, lineIndex: number, rng: [number, number]) {
        this.txt = text;
        this.line = lineIndex;
        this.rng = rng;
    }
    getRange(offset?: number): Range {
        const oft = offset ?? 0;
        return new Range(this.line, oft + this.rng[0], this.line, oft + this.rng[1]);
    }

    /**callback return a empty string to do not splice */
    regexSplit(callback: (text: string) => {regexArr: RegExpExecArray | RegExpMatchArray, indexes: number[]}[] | null): TextToken[] | null {
        const segments = callback(this.txt);
        // not really help at here (ᗜ˰ᗜ)
        // const isComplete = (item: RegExpExecArray | RegExpMatchArray): item is RegExpExecArray & {index: number, input: string, indices: RegExpIndicesArray } => {
        //     return Array.isArray(item) && 'index' in item && 'input' in item && 'indices' in item;
        // }
        if (segments === null || segments.length === 0) {
            return null;
        }
        const tokens: TextToken[] = segments.flatMap(({regexArr: item, indexes: idxs}) => {
            const isRegexArr = 'index' in item && 'input' in item;
            if (isRegexArr && item.indices) {
                return idxs.map(idx => {
                    const inds = item.indices![idx];
                    return new TextToken(item[idx], this.line, [this.rng[0] + inds[0], this.rng[0] + inds[1]]);
                })
            }
            const orgStr = isRegexArr ? item.input!.substring(item.index!) : this.txt;
            const orgStIdx = isRegexArr ? this.rng[0] + item.index! : this.rng[0];
            return idxs.map(idx => {
                const _txt = item[idx];
                const strSt = orgStIdx + orgStr.indexOf(_txt);
                return new TextToken(_txt, this.line, [strSt, strSt + _txt.length]);
            })
        })
        return tokens;
    }

    static fromString(text: string, lineIndex: number = 0, offset: number = 0): TextToken {
        return new TextToken(text, lineIndex, [offset, offset + text.length]);
    }
    static fromTextLine(textLine: TextLine): TextToken {
        return new TextToken(textLine.text, textLine.lineNumber, [textLine.range.start.character, textLine.range.end.character]);
    }
    static fromExec(regex: {item: RegExpExecArray, index?: number}, lineIndex: number, offset: number = 0): TextToken {
        const {item: execItem, index: idx = 0} = regex;
        const text = execItem[idx];
        if (!text) {
            throw Error("Text Token input group is not exist.")
        }
        const rng: [number, number] = (() => {
            const ind = execItem.indices?.[idx];
            if (!ind) {
                const stIdx = execItem.input.substring(execItem.index).indexOf(text);
                return [offset + stIdx, offset + stIdx + text.length];
            }
            return [offset + ind[0], offset + ind[1]];
        })()
        return new TextToken(text, lineIndex, rng);
    }
    static fromMatch(regex: {item: RegExpMatchArray, index?: number}, orgString: string, lineIndex: number, offset: number = 0): TextToken {
        const {item: matchItem, index: idx = 0} = regex
        const text = matchItem[idx];
        if (!text) {
            throw Error("Text Token input group is not exist.")
        }
        matchItem.input
        const rng: [number, number] = (() => {
            const ind = matchItem.indices?.[idx];
            if (!ind) {
                const stIdx = orgString.indexOf(text);
                return [offset + stIdx, offset + stIdx + text.length];
            }
            return [offset + ind[0], offset + ind[1]];
        })()
        return new TextToken(text, lineIndex, rng);
    }
}

class TextTokenComposite {
    readonly line: number;
    readonly rng: [number, number];
    readonly tokens: ParserToken[];
    constructor(tokens: ParserToken[], lineIndex?: number) {
        this.tokens = tokens;
        if (this.tokens.length < 1) {
            console.warn("TextTokenComposite constructor WARN! ths input tokens length is 0!");
            this.rng = [0, 0];
            this.line = 0;
        } else {
            this.line = lineIndex ?? tokens[0].line;
            this.rng = [this.tokens[0].rng[0], this.tokens.at(-1)!.rng[1]]
        }
    }
    getRange(offset?: number): Range {
        const oft = offset ?? 0;
        return new Range(this.line, oft + this.rng[0], this.line, oft + this.rng[1]);
    }
    static isTextTokenCompsite(token: any): token is TextTokenComposite {
        return 'tokens' in token && Array.isArray(token.tokens);
    }
}

type ParserToken = TextToken | TextTokenComposite;


type ParserTokenType = "var" | "val" | "keyW" | "arithOp" | "compOp" | "logiOp" | "expr" | "parenL" | "parenR" | "unknow";
// variable, value, key word, arithmetic operators, comparison operators, logical operators, expression, left parenthese, right parenthese, unknow;

function judgeConditionType(token: ParserToken): ParserTokenType {
    if (token instanceof TextTokenComposite) {
        // return "expression";
        return "expr";
    }
    const tt = token.txt;
    if (["==", "!=", "!==", '<', "<=", '>', ">="].includes(tt)) {
        // comparison
        return "compOp";
    } else if (['+', '-', '*', "**", '/', "//", '%'].includes(tt)) {
        // arithmetic
        return "arithOp";
    } else if (["&&", "||"].includes(tt)) {
        // logical
        return "logiOp";
    } else if (tt === '(') {
        return "parenL";
    } else if (tt === ')') {
        return "parenR";
    } else if (tt.startsWith('$')) {
        return "var";
    } else if (["time"].includes(tt)) {
        return "keyW";
    } else if (!Number.isNaN(Number(tt))) {
        return "val";
    } else {
        return "unknow";
    }
}

export class GIMIDocumentParser {
    private constructor() {}

    // for now parsing key, equal, value only using space, tab is not supported
    static readonly keyValuePairRegex = /^[ \t]*([^=\s]*) *(=?) *(.*)$/d;

    static readonly firstPartRegex = /^[ \t]*(if|else(?: ?if)?|elif|[^=\s]*) *(.*)$/di;

    static readonly singleValueRegex = /(".+?"|\S+?\b) *(.*$)/d;

    static readonly sectionInvokeRegex = /^([\w.]+(?:\\[\w.]+)*) *(.*)/d;
    static readonly sectionInvokePattern = String.raw`^[\w.]+(?:\\[\w.]+)*`;

    static readonly conditionStructureRegex = /\(|\)|<=|>=|<|>|==|===|!=|!==|&&|\|\||\*{1,2}|\/{1,2}|\%|[+-]?\b\d+(?:\.\d+)?\b|\+|-|\$\w+|\$(?:\\\w+)+|\w+|\S+?/dg;

    private static regexPatternGroup: string[] = [
        String.raw`"(?:\.|[^"\\])*"`,
        String.raw`\$\w+`,
        // String.raw`\$[a-z_\\][\w\\]*\b`,
        String.raw`\$\\(?:\w+\\?)+`,
        String.raw`\.\\[\w\\]+(?:\.\w+)?`,
        String.raw`[+-]?\b\d+(?:\.\d+)?\b`,
        String.raw`;|,|\(|\)`,
        String.raw`<|>|<=|>=|==|===|!=|!==|=|&&|\|\|`,
        String.raw`\+{1}|-{1}|\*{1,2}|\/{1,2}|\%{1}|!{1}`,
        String.raw`[\w.]+|[^\s]+`
    ]

    private static regexPattern = {
        string: String.raw`"(?:\.|[^"\\])*"`,
        word: String.raw`\w+`,
        fileVar: String.raw`\$\w+`,
        outerVar: String.raw`\$(?:\\\w+)+`,
        number: String.raw`[+-]?\b\d+(?:\.\d+)?\b`,
        float: String.raw`[+-]?\b\d+\.\d+\b`,
        integer: String.raw`[+-]?\b\d+\b`,
        logicalOper: String.raw`\(|\)|&&|\|\|!`,
        assignmentOper: String.raw`=`,
        comparisonOper: String.raw`<|>|<=|>=|==|===|!=|!==`,
        arithmeticOper: String.raw`\+|-|\*{1,2}|\/{1,2}|\%`,
        other: String.raw`\S+?`
    }
    // use d flag to allow the use of `indices`
    static readonly structureRegex = new RegExp(`${this.regexPatternGroup.join('|')}`, "dg");

    // static generatorStructureUnit(text: string): RegExpMatchArray[] {
    //     return [...text.matchAll(this.structureRegex)]
    // }

    static tokenizeFirstPart(lineText: TextToken): { first: TextToken, content: TextToken } {
        const tokens = lineText.regexSplit(txt => {
            const match = txt.match(this.firstPartRegex)
            return match && [{regexArr: match, indexes: [1,2]}];
        })
        if (!tokens) {
            // even line is starts with `=`, it will only happen that first does not exist.
            // so it should be impossible to fail
            throw Error("tokenizeFirstPart falied! this is should not happen.");
        }
        return {first: tokens[0], content: tokens[1]};
    }

    /**
     * if tokenize fail, key will be input, and equl, value will be empty token.
     */
    static tokenizeKeyValuePair(lineText: TextToken): { key: TextToken, equal: TextToken, value: TextToken } {
        const tokens = lineText.regexSplit(txt => {
            const match = txt.match(this.keyValuePairRegex)
            return match && [{regexArr: match, indexes: [1,2,3]}];
        })
        if (!tokens) {
            // even line is empty, also should get three empty catch group.
            throw Error("tokenizeKeyValuePair falied! this is should not happen.");
        }
        return {key: tokens[0], equal: tokens[1], value: tokens[2]};
    }
    
    static tokenizeSingleValue(valueToken: TextToken): {value: TextToken, extra: TextToken} {
        const tokens = valueToken.regexSplit(txt => {
            const match = txt.match(this.singleValueRegex);
            return match && [{regexArr: match, indexes: [1,2]}]
        })
        if (!tokens) {
            return {value: valueToken, extra: new TextToken("", valueToken.line, [valueToken.rng[1], valueToken.rng[1]])};
        }
        return {value: tokens[0], extra: tokens[1]}
    }

    /**
     * for parse expression in parentheses, should not input parenthese token
     */
    static parseExpression(tokens: ParserToken[], refDiags: RelativeDiagnostic[]): TextTokenComposite {
        // maybe change state types to number enum?
        type StateT = "var|val|keyW|expr" | "logi|arith|comp" | "logi|arith";
        const isVarType = ((tkt: ParserTokenType): boolean => tkt === "var" || tkt === "val" || tkt === "keyW" || tkt === "expr");
        if (tokens.length === 0) {
            return new TextTokenComposite([]);
        } else if (tokens.length === 1) {
            const tk = tokens[0];
            const tkt = judgeConditionType(tk);
            if (!isVarType(tkt)) {
                refDiags.push({ info: "Msut be a variable", lv: DiagnosticSeverity.Error, relRng: tk.getRange() })
            }
            return new TextTokenComposite(tokens);
        }
        const [stIdx, endIdx] = (() => {
            const _r = [0, tokens.length]
            if (judgeConditionType(tokens[0]) !== "parenL") {
                return _r;
            }
            _r[0]++;
            const tk = tokens.at(-1)!;
            if (judgeConditionType(tk) !== "parenR") {
                refDiags.push({ info: "Unclosed parenthese.", lv: DiagnosticSeverity.Error, 
                    relRng: new Range(tk.line, tk.rng[1], tk.line, tk.rng[1])
                })
            } else {
                _r[1]--; 
            }
            return _r;
        })();
        let expectState: StateT = "var|val|keyW|expr";
        let hasComparison: boolean = false;
        let lastState: ParserTokenType = "unknow";
        for (let i = stIdx; i < endIdx; i++) {
            const tk = tokens[i];
            const tkt = judgeConditionType(tk);
            let errInfo = "";
            switch (expectState) {
                case "var|val|keyW|expr":
                    if (!isVarType(tkt)) {
                        errInfo = "Must be a variable";
                    }
                    if (hasComparison) {
                        expectState = "logi|arith";
                    } else {
                        expectState = "logi|arith|comp";
                    }
                    break;
                case "logi|arith|comp":
                    if (tkt === "logiOp") {
                        hasComparison = false;
                    } else if (tkt === "arithOp") {

                    } else if (tkt === "compOp") {
                        hasComparison = true;
                    } else {
                        errInfo = "Must be a logical operator";
                    }
                    expectState = "var|val|keyW|expr";
                    break;
                case "logi|arith":
                    if (tkt === "logiOp") {
                        hasComparison = false;
                    } else if (tkt === "arithOp") {

                    } else {
                        errInfo = "Must be a logical operator or a arithmetic operator";
                    }
                    expectState = "var|val|keyW|expr";
                    break;
                default:
                    errInfo = "Something in exception case. This should never happend.";
                    break;
            }
            lastState = tkt;
            if (errInfo) {
                refDiags.push({ relRng: tk.getRange(), info: errInfo, lv: DiagnosticSeverity.Error })
            }
        }
        if (!isVarType(lastState)) {
            const tk = tokens[endIdx - 1];
            refDiags.push({ info: "Msut be a variable", lv: DiagnosticSeverity.Error, 
                relRng: new Range(tk.line, tk.rng[1], tk.line, tk.rng[1])
            })
        }
        return new TextTokenComposite(tokens);
    }

    static diagnosticCondition(textToken: TextToken): RelativeDiagnostic[] {
        const diags: RelativeDiagnostic[] = [];
        const stack: ParserToken[][] = [];
        let currentTokens: ParserToken[] = [];
        const tokens = textToken.regexSplit(txt => {
            const matchs = [...txt.matchAll(this.conditionStructureRegex)];
            return matchs.map(_m => {
                return {regexArr: _m, indexes: [0]};
            })
        });
        if (!tokens) {
            return diags;
        }
        tokens.forEach(tk => {
            if (tk.txt === '(') {
                // 將當前列表推入堆棧，並開啟新的列表
                stack.push(currentTokens);
                currentTokens = [tk];
            } else if (tk.txt === ')') {
                // 處理當前列表，並與堆棧中的上層合併
                currentTokens.push(tk);
                if (stack.length > 0) {
                    const result = this.parseExpression(currentTokens, diags); // 處理括號內的表達式
                    currentTokens = stack.pop()!; // 回到外層
                    currentTokens.push(result);
                }
            } else {
                currentTokens.push(tk);
            }
        });
        // 如果有堆棧殘留 壓回到 current
        while (stack.length > 0) {
            // 倒序、當前接在 pop 的末尾
            const unclosedTokens = stack.pop()!;
            currentTokens = unclosedTokens.concat(currentTokens);
        }
        this.parseExpression(currentTokens, diags);
        return diags;
    }
}

/**will not automatically trim() */
export function isCommentText(text: string): boolean {
    return text.startsWith(';');
}