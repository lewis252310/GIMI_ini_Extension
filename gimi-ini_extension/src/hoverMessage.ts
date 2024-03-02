
import { TextDocument, Position, HoverProvider, CancellationToken, Hover, ProviderResult, MarkdownString } from 'vscode'

import { checkRelativePathIsExist } from './util'


/**
 * For now, we're not going to go any deeper into using code to build the check,
 * so this is just a preliminary entry point.
 */
export class GIMIHoverProvider implements HoverProvider{
	async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | null | undefined> {
		if (token.isCancellationRequested) {
			return;
		}
		const line = document.lineAt(position.line);
		const text = line.text.trim();
		if (text.startsWith('filename')) {
			const path = /filename *= *(.+)/i.exec(line.text);
			if (!path || (path[0].length - path[1].length) + (line.text.length - text.length) > position.character) {
				return;
			}

			const checked = await checkRelativePathIsExist(path[1], document.uri.fsPath);
			if (!checked) {
				const message = new MarkdownString('This path does not exist...');
				return new Hover(message);
			}
			return;
		} else if (text.includes('\\')) {
			const word = document.getText(document.getWordRangeAtPosition(position, /[\$\\\.\w]+/));
			if (word.includes('\\')) {
				return new Hover('Tips! When section call cannot jump it means that path is not found.');
			}
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

/**
 * Tell me, Why you want to read the source code?
 */
function getASCIIMeme(): MarkdownString {
	const meme = new MarkdownString();
	meme.isTrusted = true;
	meme.appendText('You say whaaaat?\n')
		.appendText('⠠⠀⠄⣗⡁⠀⠀⠀⢀⢴⢽⢹⢪⡺⡸⣪⢺⡸⣪⢺⡸⣪⢺⡸⣪⢺⡸⣪⢺⡸⡜⣜⢜⢞⢟⣧⣆⢀⠀⠀')
		.appendText('⣇⡂⢑⢯⣧⠀⡠⣴⡳⡝⡎⡧⡳⡱⡝⣜⢮⣺⣼⣾⡾⣷⢷⡿⣮⣞⣮⣞⡼⣜⢎⢮⡪⡇⣗⢝⢿⣵⡂⠀')
		.appendText('⠟⣷⣆⢫⢻⣮⡎⡗⣝⢜⡕⣇⢯⣺⣵⣟⡿⣽⣗⣯⢿⢽⢯⣻⣽⣺⣳⢯⢿⡵⣿⢵⢕⣝⢜⢎⢧⢻⢿⣦')
		.appendText('⠀⠈⢟⣧⣓⢿⣯⡞⣜⢵⢽⡾⣟⣯⢷⡯⣯⢷⣳⢯⢿⢽⣫⣗⣗⣗⢯⢯⣗⡯⣟⡿⣿⣞⡮⡳⡱⣣⢫⣻')
		.appendText('⠀⠀⡰⣻⡻⣷⣵⢿⣾⣟⣿⣻⡽⣯⢿⢽⢯⢿⢽⡽⣯⣻⣞⢾⣺⢾⣝⣗⡷⣯⢷⣻⣿⠯⡻⣷⡹⣸⢱⡪')
		.appendText('⠀⠰⣹⢕⡕⡗⡽⣻⣯⣿⣿⢾⡻⠯⠿⡻⢿⢻⠿⡽⡷⡿⡾⡿⡽⡷⢟⠾⠻⠫⠋⢃⠁⠄⠠⢙⢿⡮⡪⡮')
		.appendText('⠀⡪⣗⡕⣇⢯⡾⡋⠌⢈⠫⠿⢾⡆⡡⠀⠂⠠⠐⢀⠈⠠⠈⠄⠂⠠⠀⡐⢀⣂⠁⠄⠐⢀⠁⠠⠈⢿⣷⣝')
		.appendText('⠀⡪⣗⢕⣗⡿⢁⠠⠀⠂⠠⠀⠡⠨⡮⠈⠐⠀⢂⠀⠂⢁⠐⠀⠌⠀⠂⡀⢮⢺⡂⠂⡁⠠⠀⡁⠐⢀⢫⣷')
		.appendText('⠀⠈⠗⢵⣟⠡⠀⠄⠂⠁⠄⠁⢌⡾⢽⠄⡁⠌⠀⠄⠁⠄⢀⠡⠀⡁⡢⣾⠃⠂⣻⠠⠐⠀⡁⠠⠈⡀⠐⣿')
		.appendText('⠀⠀⠀⣟⢆⠀⢂⠐⠈⠠⠨⣾⣿⢌⠺⣗⠄⠐⢀⣂⢁⠐⢠⢠⠂⣔⡽⡣⣨⡔⠨⣇⠌⠀⠄⠂⠐⠀⠂⣽')
		.appendText('⠀⠀⠀⣽⡃⠄⠂⢀⠡⠐⢈⡽⢿⣿⣮⢺⣣⢨⡢⡿⡖⣨⣞⢿⣻⡞⣱⣾⡿⠁⠂⡳⢀⠁⡐⠈⡀⠡⢐⣽')
		.appendText('⠲⡒⠄⢾⣗⠠⠈⡀⠄⣢⢦⣻⢔⡹⡻⡮⠷⣗⠁⣺⡯⠎⠂⠘⢏⣪⣿⠏⡂⣄⣂⣗⠄⠂⠠⠐⠀⡐⣸⣿')
		.appendText('⡤⡀⡀⠸⣷⡂⡐⢤⡏⠊⠈⠈⠘⢘⢦⢃⠁⠈⠀⠊⠃⠐⠈⠀⢀⢫⠗⠕⠉⠈⠈⠘⢝⡮⡀⠂⡁⣰⡿⠃')
		.appendText('⠑⠉⠺⡸⠽⣗⢔⢽⠊⠀⣠⣄⡀⠀⠨⣳⠁⡀⠁⡀⠂⠀⠂⠈⢀⢧⡁⠀⣰⣴⡅⠀⠠⢯⡢⣰⣾⡏⡃⠐')
		.appendText('⠀⣠⣒⢨⢬⢺⢪⢯⡊⠀⠻⠏⠀⠀⠀⣽⠮⢶⢷⠾⡾⠾⡗⠷⠷⡟⡞⣄⢈⠊⠁⣀⢮⣟⢾⣿⠹⢿⣶⡠')
		.appendText('⡽⣺⡼⡝⡎⡎⡎⡆⡇⣅⢤⣢⢦⡮⣞⡧⣀⢀⠀⠀⠀⠀⡀⡠⣄⢦⢫⢪⢷⡺⣺⢽⢹⢰⢱⢩⢯⡌⠙⢿')
		.appendText('⡪⡇⡇⡇⡇⡇⡇⣇⢧⡏⠃⠈⠈⢝⣮⢪⢹⢱⢛⢎⢏⢏⠎⡇⡣⡪⡪⣪⠓⠀⢮⡪⡪⡪⡪⡪⡪⡺⣅⠂')
		.appendText('⢜⢳⢵⢵⢕⣗⢟⠺⢫⡠⠐⠀⠂⠀⠹⣪⢎⡪⡪⡸⡰⡑⡕⢕⣕⢵⠫⠂⢀⠈⠪⣇⢇⢇⢇⢇⢇⢕⢕⡇')
		.appendText('⡇⡈⠨⢈⢪⠣⠀⠀⠈⠸⠸⢔⢄⢈⠀⡀⠑⠕⢵⠮⠮⠞⠞⠋⠊⠁⢀⠠⠀⡀⠄⠫⣮⢪⢪⢪⢪⠪⡒⡇')
		.appendText('⡳⡐⡀⢂⢏⠀⠀⠀⠀⠀⠀⠀⠈⠈⠪⠒⠵⠰⡰⢤⡨⡰⡠⡡⡢⠕⠴⠘⠈⠀⠀⠀⠈⠓⠧⢧⢶⠡⠑⠀')
	return meme;
}