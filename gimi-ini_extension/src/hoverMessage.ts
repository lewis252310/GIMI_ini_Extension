
import { TextDocument, Position, HoverProvider, CancellationToken, Hover, ProviderResult } from 'vscode'


/**
 * For now, we're not going to go any deeper into using code to build the check,
 * so this is just a preliminary entry point.
 */
export class GIMIHoverProvider implements HoverProvider{
	provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
		if (token.isCancellationRequested) {
			return;
		}
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);
		let message = undefined;
		if (word === 'hash') {
			// if (isInTextureOverrideSection(document, position)) {
			// 	message = `The value of the 'hash' should be a hash value.\nYou can find the hash value from the hunting mode.`;
			// } else {
			// 	message = `⚠️The 'hash' keyword should only appear in 'Override' section and will only work in 'Override' section.`;
			// }
			return new Hover('Hehehehe...');
		} else if (word === 'store') {
			return new Hover(`You should not use this, unless you know what are you doing for`);
		}
		
		if (message !== undefined) {
			return new Hover(message);
		}
		// throw new Error('Method not implemented.');
		return;
	}
}


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