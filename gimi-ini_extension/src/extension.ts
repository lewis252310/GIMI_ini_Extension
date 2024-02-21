
// Maybe need change import from '*' to 'what need', not very like a lot 'vscode.' prefix
import * as vscode from 'vscode';


/**
 * A simple section positioning feasibility test. __!!! Without any optimization !!!__
 */
function isInTextureOverrideSection(document: vscode.TextDocument, position: vscode.Position): boolean {
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
function getHoverMessage(document: vscode.TextDocument, position: vscode.Position): string | undefined {
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


export function activate(context: vscode.ExtensionContext) {
	console.log('GIMI ini extension has been activated.')
	vscode.window.showInformationMessage('Hi! Here is GIMI ini extension. Until now I only support static highlight. And the default disables any syntax internal processing.');

	let disposable = vscode.commands.registerCommand('gimi-ini.helloWorld', () => {
		vscode.window.showInformationMessage('Why you know I have this command?!');
	});
	context.subscriptions.push(disposable);


	/**
	 * For now, we're not going to go any deeper into using code to build the check,
	 * so this is just a preliminary entry point.
	 */
	// let provider = vscode.languages.registerHoverProvider('gimi-ini', {
    //     provideHover(document, position, token) {
	// 		if (token.isCancellationRequested) {
    //             return;
    //         }
	// 		const message = getHoverMessage(document, position);
	// 		if (message !== undefined) {
	// 			return new vscode.Hover(message);
	// 		}
	// 		return;
    //     }
    // });
	// context.subscriptions.push(provider);
}

export function deactivate() {}
