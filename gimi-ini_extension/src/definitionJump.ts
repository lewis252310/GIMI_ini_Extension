import { CancellationToken, Definition, DefinitionProvider, Location, LocationLink, Position, ProviderResult, Range, TextDocument } from 'vscode'

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
        // throw new Error('Method not implemented.');
        return; 
    }
}