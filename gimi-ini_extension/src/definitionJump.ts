import path from 'path';
import { CancellationToken, Definition, DefinitionProvider, Location, LocationLink, MarkdownString, Position, ProviderResult, Range, TextDocument, Uri, window, workspace } from 'vscode'
import { GIMIRule, GIMIWorkspace, checkRelativePathIsExist } from './util';

export class GIMIDefinitionProvider implements DefinitionProvider{
    provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]> {
        let jumpTo: Location;

        if (document.lineAt(position.line).text.includes(';')) {
            // comment line just skip
            // or maybe a illegal comment line
            return;
        }

        let word: string;
        let range = undefined;
        range = document.getWordRangeAtPosition(position, /(?:[\w]+|\$)\\[\w\\\.]+/i);
        if (range) {
            // is a section or variable call
            word = document.getText(range);
            const matchs = [...word.matchAll(/[\w\.]+/g)];
            if (!GIMIRule.getSectionNamespaces().includes(matchs[0][0])) {
                return;
            }
            const name = matchs[0][0] + matchs.at(-1)?.[0];
            const namespace = matchs.slice(1, -1).map(m => m[0]).join('\\');
            console.log(`name: ${name}, ns: ${namespace}`);
            if (!namespace.includes('.')) {                
                for (const file of GIMIWorkspace.getProjectFiles()) {
                    if (file.gimiNamespace === namespace) {
                        for (const section of file.getSections()) {
                            if (section.name.toLowerCase() === name.toLowerCase()) {
                                const titleStart = section.range.start;
                                const startP = titleStart.translate(0, 1);
                                const endP = titleStart.translate(0, section.name.length + 1);
                                // return new Location(file.uri, new Range(startP, endP));
                                const _r: LocationLink[] = []
                                _r.push({
                                    targetUri: file.uri,
                                    targetRange: new Range(startP, endP),
                                    originSelectionRange: range,
                                    targetSelectionRange: new Range(titleStart.translate(0, 3), titleStart.translate(0, section.name.length - 3))
                                })
                                return _r;
                            }
                        }
                    }
                }
                return [{
                    targetUri: document.uri,
                    targetRange: range,
                    originSelectionRange: range,
                }];
            }
            return;
        }
        range = document.getWordRangeAtPosition(position, /\$[\w]+/);
        if (range) {
            // is a variable
            word = document.getText(range);
            let inConstantsSection = false;
            for (let i = 0; i < document.lineCount; i++) {
                let line = document.lineAt(i).text;
                if (inConstantsSection) {
                    if (/\[.*\]/i.test(line)) {
                        break;
                    }
                    let wordRegex = new RegExp(`${word.replace('$', '\\$')}\\b`, 'i')
                    let matchs = wordRegex.exec(line);
                    if (matchs) {
                        let start: Position = new Position(i, matchs.index);
                        let end: Position = new Position(i, matchs.index + matchs[0].length);
                        return new Location(document.uri, new Range(start, end));
                    }
                }
                else if (/^\[Constants\]/i.test(line)) {
                    inConstantsSection = true;
                    continue;
                }
            }
            return;
        }
        range = document.getWordRangeAtPosition(position, /(?<=.*\=.*)(CommandList|Resource).+/i);
        if (range) {
            // is a section title
            for (let i = 0; i < document.lineCount; i++) {
                let line = document.lineAt(i).text;
                word = document.getText(range);
                // console.log(word);
                if (line.includes('[') && line.includes('[')) {
                    let wordRegex = new RegExp(`\\[${word}\\]`, 'i')
                    let matchs = wordRegex.exec(line);
                    if (matchs) {
                        let start: Position = new Position(i, matchs.index);
                        let end: Position = new Position(i, matchs.index + matchs[0].length);
                        return new Location(document.uri, new Range(start, end));
                    }
                }
            }
            return;
        }
        const line = document.lineAt(position.line);
        const text = line.text.trim();
        if (text.toLowerCase().startsWith('filename')) {
            const textOffset = line.text.length - text.length;
            const item = /filename\s*=\s*(.+)/.exec(text);
            if (!item) {
                return;
            }
            checkRelativePathIsExist(item[1], document.uri.fsPath).then(checked => {
                if (!checked) {
                    window.showErrorMessage(`ERROR: The path '${item[1]}' does not exist.`);
                }
            });
        }
        // throw new Error('Method not implemented.');
        return; 
    }
}