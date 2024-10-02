import { CancellationToken, Definition, DefinitionProvider, Location, LocationLink, MarkdownString, Position, ProviderResult, Range, TextDocument, Uri, window, workspace } from 'vscode'
import { GIMIWorkspace } from "./GIMI/GIMIWorkspace";
import { GIMIDocumentParser, TextToken } from "./GIMI/parser"
import { isRegularSection } from './GIMI/GIMISectionTitle';
import { encodeToGIMIString, GIMIString } from './GIMI/GIMIString';

export class GIMIDefinitionProvider implements DefinitionProvider{
    provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]> {
        let jumpTo: Location;

        if (document.lineAt(position.line).text.includes(';')) {
            // comment line just skip
            // or maybe a illegal comment line
            return;
        }

        const file = GIMIWorkspace.findFile(document.uri);
        if (!file) {
            return;
        }
        const section = file.findSectionFromPosition(position);
        if (!section) {
            // maybe is a namespace?
            return;
        }
        const line = document.lineAt(position.line);

        // a inter variable
        let wordRange = document.getWordRangeAtPosition(position, /\$\w+\b/);
        if (wordRange) {
            const word = document.getText(wordRange);
            // console.log("get word", word);
            const vari = file.findGlobalVariable(encodeToGIMIString(word.slice(1)));
            if (!vari) {
                return;
            }
            return [{
                targetUri: document.uri,
                targetRange: vari.range,
                originSelectionRange: wordRange
            }];
        }
        
        // a outer variable
        wordRange = document.getWordRangeAtPosition(position, /\$(?:\\\w+)+/);
        if (wordRange) {
            const word = document.getText(wordRange);
            // console.log("get word", word);
            const parts = word.slice(2).split("\\");
            const name = parts.splice(-1, 1)[0];
            const path = parts.join("\\");
            const targetFile = file.rootProject.findFileFromNamespace(encodeToGIMIString(path));
            const targetVar = targetFile?.findGlobalVariable(encodeToGIMIString(name));
            if (!targetVar) {
                return;
            }
            return [{
                targetUri: targetFile!.uri,
                targetRange: targetVar.range,
                originSelectionRange: wordRange
            }];
        }

        // dont use now.
        // const lineText = line.text.trim();
        // if (lineText.toLowerCase().startsWith("filename")) {
        //     const filePathRegex = /filename *= *(.+)/;
        //     const match = lineText.match(filePathRegex);
        //     if (!match) {
        //         return;
        //     }
        //     checkRelativePathIsExist(match[1], document.uri.fsPath).then(checked => {
        //         if (!checked) {
        //             window.showErrorMessage(`ERROR: The path '${match[1]}' does not exist.`);
        //         }
        //     });
        // }

        // maybe a outer section
        wordRange = document.getWordRangeAtPosition(position, /[\w.]+(?:\\[\w.]+)+/);
        if (wordRange) {
            const word = document.getText(wordRange);
            console.log("get word", word);
            return;
        }

        // maybe a inter section
        wordRange = document.getWordRangeAtPosition(position, /(?<!\[)\b[\w.]+\b(?!\])/);
        if (wordRange) {
            const word = document.getText(wordRange);
            // console.log("get word", word);
            const section = file.findSection(encodeToGIMIString(word));
            if (!section) {
                return;
            }
            return [{
                targetUri: file.uri,
                targetRange: section.titleRange,
                originSelectionRange: wordRange
            }]
        }

        // console.log("Stop at here");
        return;
    }
}