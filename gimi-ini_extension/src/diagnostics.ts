import { languages, DiagnosticCollection, TextDocument, TextDocumentChangeEvent, Diagnostic, Range, Position, DiagnosticSeverity } from 'vscode'
import { GIMIRule, GIMIWorkspace } from './util';

// Not use now
class GIMIDiagnosticsProvider {
	private diagnosticCollection = languages.createDiagnosticCollection('gimi-ini');

    constructor(private languageName: string) {
        this.diagnosticCollection = languages.createDiagnosticCollection(languageName)        
    }
}

function diagonsticLineText(text: string): Range {
    const range: Range = new Range(0, 1, 2, 3);

    return range;
}

export function updateDiagonstics(event: TextDocumentChangeEvent | TextDocument, diagnosticCollection: DiagnosticCollection) {
    const diagnostics: Diagnostic[] = [];
    const commentLineRegex = new RegExp(`^(.*?);(.*)$`, 'i');
    const sectionTitleRegex = new RegExp(`(.+)?\\[.*\\](.+)?`, 'i');
    let document: TextDocument;

    // Compact but ugly and hard to read
    let ranges: {
        startLine: number,
        endLine: number
    }[] = [];
    
    if ('document' in event && 'contentChanges' in event) {
        document = event.document;
        event.contentChanges.forEach(change => {
            let s = change.range.start.line;
            let endPosition = change.rangeOffset + change.text.length;
            let e = document.positionAt(endPosition).line;
            ranges.push({startLine: s, endLine: e});
            const lineDiff = e - s;
            // if (lineDiff !== 0) {
            //     // mean chahge is over 1 line
            //     diagnosticCollection.get(document.uri)?.forEach(item => {
            //         const start = item.range.start;
            //         const end = item.range.end;
            //         item.range = new Range(new Position(start.line + lineDiff, start.character), new Position(end.line + lineDiff, end.character)) 
            //     })
            // }
        })
    } else {
        document = event as TextDocument;
        ranges.push({startLine: 0, endLine: (document.lineCount - 1)})
    }
    diagnosticCollection.get(document.uri)?.forEach(item => {
        diagnostics.push(item);
    })
    ranges.forEach(range => {
        for (let i = range.startLine; i <= range.endLine; i++) {
            const line = document.lineAt(i).text;
            let matchs = commentLineRegex.exec(line);
            if (matchs && !/^\s*$/.test(matchs[1])) {
                let range = new Range(i, 0, i, line.length);
                const diagnostic = new Diagnostic(range, `Comments must be on a separate line.\nContinuation after codes is illegal.`)
                diagnostics.push(diagnostic);
                continue;
            }

            // at ShaderRegex will get a huge error
            // matchs = sectionTitleRegex.exec(line);
            // if (matchs) {
            //     // what happen if matchs does not exist? tested, will get ERROR.
            //     // (matchs[1] && !/^[\s;]*$/.test(matchs[1]))
            //     if (matchs[2] && !/^\s*$/.test(matchs[2])) {
            //         let range = new Range(i, 0, i, line.length);
            //         const diagnostic = new Diagnostic(range, `After and before of section title should only have space or tab`)
            //         diagnostics.push(diagnostic);
            //     }
            // }
        }
    })
    diagnosticCollection.set(document.uri, diagnostics)
}

export function updateDiagonsticsByDocument(document: TextDocument, diagnosticCollection: DiagnosticCollection) {
    const diagnostics: Diagnostic[] = [];
    let fileCheckPromises: Thenable<void | Diagnostic>[] = [];
    let foldersState: {[name: string]: boolean} = {};
    // const commentLineRegex = new RegExp(`^(.*?);(.*)$`, 'i');

    const file = GIMIWorkspace.findFile(document.uri);
    if (!file) {
        return;
    }
    // file.getSections().forEach(section => {
    //     console.log(section.name);
    // })

    let inSharderRegexSection = false;
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        if (line.isEmptyOrWhitespace) {
            continue;
        }
        const text = line.text.trim();
        const textOffset = line.text.length - text.length;
        let shaderMatchs = /^\[(.+)\]/i.exec(text);
        if (shaderMatchs) {
            if (shaderMatchs[1].toLowerCase().startsWith('shaderregex')) {
                inSharderRegexSection = true;
            } else {
                inSharderRegexSection = false;
            }
        }
        // let matchs = commentLineRegex.exec(text);
        // if (matchs && !/^\s*$/.test(matchs[1])) {
        if (text.includes(';')) {
            if (!text.startsWith(';')) {                
                let message = 'Comments must be on a separate line. Continuation after codes is illegal.'
                diagnostics.push(new Diagnostic(line.range, message, DiagnosticSeverity.Error));
            }
            continue;
        }
        if (!inSharderRegexSection && text.includes('\\')) {
            // \$|CommandList|Resource|CustomShader|TextureOverride|ShaderOverride|ShaderRegex
            // let variables = text.matchAll(/\$(.+?)[ =]/g);
            // for (const variable of variables) {
            //     if (variable.index === undefined) {
            //         continue;
            //     } else if (variable.includes('\\') && !variable[0].startsWith('\\')) {
            //         let message = `Slashes are only used when calling a namespace. Maybe you mean this?\n'$\\${variable[0]}'`;
            //         const sP = new Position(i, variable.index);
            //         const eP = new Position(i, variable.index + variable[0].length)
            //         diagnostics.push(new Diagnostic(new Range(sP, eP), message, DiagnosticSeverity.Information));
            //     }
            // }
            if (text.toLowerCase().startsWith('namespace')) {
                continue;
            } else if (text.toLowerCase().startsWith('filename')) {
                
                continue;
            }
            // text.split(/[ \t\+\-\*\/=&\|]+/);
            let units = text.matchAll(/[\$\.\w\\]+/g);
            for (const unit of units) {
                if (unit.index === undefined) {
                    continue;
                } else if (!unit[0].includes('\\')) {
                    continue;
                }

                const unitOffset = textOffset + unit.index;
                const word = unit[0];
                if (word.endsWith('\\')) {
                    const message = 'Exception backslash. Did you missing section name?'
                    const eP = new Position(i, unitOffset + word.length);
                    diagnostics.push(new Diagnostic(new Range(eP.translate(0, -1), eP), message, DiagnosticSeverity.Error));
                }

                const firstPart = Array.from(word.matchAll(/[\$\.\w]+/g))[0];
                let message = '';
                const sP = new Position(i, unitOffset + (firstPart.index as number));
                const eP = new Position(i, unitOffset + (firstPart.index as number) + firstPart[0].length);
                let correctNamespace = false;
                for (const name of GIMIRule.getSectionNamespaces()) {
                    if (firstPart[0].toLowerCase().startsWith(name.toLowerCase())) {
                        correctNamespace = true;
                        if (firstPart[0].length !== name.length) {                            
                            message = `The namespace '${firstPart[0]}' seems missing a backslash. Maybe what you want is '${name}\\${firstPart[0].replace(name, '')}'?`;
                            diagnostics.push(new Diagnostic(new Range(sP, eP), message, DiagnosticSeverity.Warning));
                        }
                        break;
                    }
                }
                if (correctNamespace) {
                    continue;
                } else {
                    message = `Namespace '${firstPart[0]}' not found.`;
                    diagnostics.push(new Diagnostic(new Range(sP, eP), message, DiagnosticSeverity.Error));
                }
            }
        }
    }
    diagnosticCollection.set(document.uri, diagnostics)
}

/**
 * Not completed
 */
function diagnosticSingleLine(line: string, positionOffset?: Position): {startC: number, endC: number, message: string, type: DiagnosticSeverity}[] | undefined {
    const _r: {startC: number, endC: number, message: string, type: DiagnosticSeverity}[] = [];

    const text = line.trim().toLowerCase();
    const lineOffset = line.length - text.length;

    if (text.includes(';') && !text.startsWith(';')) {
        const msg = 'Comments must be on a separate line. Continuation after codes is illegal.'
        _r.push({startC: lineOffset, endC: (text.length - 1), message: msg, type: DiagnosticSeverity.Error})
    }

    if (_r.length > 0) {
        return _r;
    }
    return undefined;
}