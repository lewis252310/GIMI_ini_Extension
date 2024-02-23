import { languages, DiagnosticCollection, TextDocument, TextDocumentChangeEvent, Diagnostic, Range, Position } from 'vscode'


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