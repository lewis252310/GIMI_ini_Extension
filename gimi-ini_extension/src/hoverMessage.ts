
import { TextDocument, Position } from 'vscode'


/**
 * A simple section positioning feasibility test. __!!! Without any optimization !!!__
 */
function isInTextureOverrideSection(document: TextDocument, position: Position): boolean {
    const sectionRegex = new RegExp(`\\[TextureOverride.+\\]`, 'i');
	for (let i = position.line; i >= 0; i--) {
        const lineText = document.lineAt(i).text;
        if (lineText.includes('[') && lineText.includes(']')) {
            if (sectionRegex.test(lineText)) {
				return true;
			} else {
				break;
			}
        } else if (position.line - i >= 200) {
			break;
		}
    }
    return false;
}

/**
 * A simple hover message provider feasibility test. __!!! Without any optimization !!!__
 */
export function getHoverMessage(document: TextDocument, position: Position): string | undefined {
	const range = document.getWordRangeAtPosition(position);
	const word = document.getText(range);
	if (word === 'hash') {
		if (isInTextureOverrideSection(document, position)) {
			return `The value of the 'hash' should be a hash value.\nYou can find the hash value from the hunting mode.`;
		} else {
			return `⚠️The 'hash' keyword should only appear in 'Override' section and will only work in 'Override' section.`;
		}
	}
	return undefined;
}