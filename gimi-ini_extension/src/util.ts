import { TextDocument } from 'vscode'

/**
 * A function to parsing variables under the 'Constants' section of the current document
 */
export function parseDocumentVariables(document: TextDocument): string[] {
    let variables: string[] = [];
    let inConstants = false;
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const matchs = /^\[(.*)\]/i.exec(line);
        if (matchs) {
            if (matchs[1].toLowerCase() == 'Constants'.toLowerCase()) {
                inConstants = true;
            } else if (inConstants) {
                // inConstants = false;
                break;
            }
        }
        // ^(?:persist +)?(?:global)(?: +persist)? +(\$[a-z_\][\w\\]*\b) -- i
        if (inConstants && line.includes('global')) {
            const catchs = /(\$[a-z_\][\w\\]*)\b/i.exec(line);
            if (catchs) {
                variables.push(catchs[1])
            }
        }
    }
    return variables;
}