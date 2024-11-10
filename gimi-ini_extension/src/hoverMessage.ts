
import { TextDocument, Position, HoverProvider, CancellationToken, Hover, ProviderResult, MarkdownString } from 'vscode'

import { checkRelativePathIsExist } from './util'
import { GIMIWorkspace } from './GIMI/GIMIWorkspace';
import { parseSectionTypeInfo } from './GIMI/GIMISectionTitle';
import { encodeToGIMIString } from './GIMI/GIMIString';
import { isCommentText } from './GIMI/parser';


/**
 * For now, we're not going to go any deeper into using code to build the check,
 * so this is just a preliminary entry point.
 */
export class GIMIHoverProvider implements HoverProvider{
	async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | null | undefined> {
		if (token.isCancellationRequested) {
			return;
		}
		
        const file = GIMIWorkspace.findFile(document.uri);
        if (!file) {
            return;
        }

		let wordRange = document.getWordRangeAtPosition(position, /\$\w+\b/);
        if (wordRange) {
            const word = document.getText(wordRange);
            // console.log("get word", word);
            const vari = file.findGlobalVariable(word.slice(1));
            if (!vari) {
				return new Hover(`The variable '${word}' is not exist.`, wordRange);
            }
			// const lowWord = word.toLowerCase();
			// switch (lowWord) {
			// 	case "$active":
			// 		return new Hover(`'${word}' 通常是用來辨認所屬角色是否繪製於螢幕上.`, wordRange);					
			// 	case "$swapvar":
			// 		return new Hover(`'${word}' 通常是用來表示當前切換到的變體序數.`, wordRange);					
			// 	default:
			// 		break;
			// }
        }

		wordRange = document.getWordRangeAtPosition(position, /\b[\w.]+\b/);
		if (wordRange) {
			const word = document.getText(wordRange)

			// if (word.toLowerCase() === "key") {
			// 	if (document.lineAt(position).firstNonWhitespaceCharacterIndex === wordRange.start.character) {
			// 		return new Hover("設定用於觸發的按鍵", wordRange);
			// 	} else {
			// 		return new Hover("這個關鍵字或這個單詞可能並不應該在這裡", wordRange);
			// 	}
			// }

			const secInfo = parseSectionTypeInfo(word);
			if (!secInfo.legal) {
				return;
			}
			const section = file.findSection(encodeToGIMIString(word));
			if (!section) {
				return;
			}
			const {start: secStPos} = section.range;
			if (secStPos.line < 1) {
				return;
			}

			const secDescp: string[] = [];
			const stLineIdx = section.range.start.line - 1;
			// const docsLastLIdx = document.lineCount - 1;
			for (let i = stLineIdx; i > 0; i--) {
				const line = document.lineAt(i);
				const text = line.text.trim();
				// if (line.isEmptyOrWhitespace) {
				// 	break;
				// }
				if (!isCommentText(text)) {
					break;
				}
				secDescp.push(text.slice(1));
			}
			if (secDescp.length === 0) {
				return;
			}
			const msg = new MarkdownString();
			msg.appendCodeblock(section.rawTitle, "gimi-ini");
			// msg.appendMarkdown(`${section.rawTitle}\n\n`);
			secDescp.reverse().forEach(_lTxt => {
				msg.appendMarkdown(_lTxt);
			})
			return new Hover(msg, wordRange);
		}

		// const line = document.lineAt(position.line);
		// const text = line.text.trim();
		// if (text.startsWith('filename')) {
		// 	const path = /\s*filename *= *(.+)/di.exec(line.text);
		// 	// if (!path || (path[0].length - path[1].length) + (line.text.length - text.length) > position.character) {
		// 	if (!path ) {
		// 		return;
		// 	}

		// 	const checked = await checkRelativePathIsExist(path[1], document.uri.fsPath);
		// 	if (!checked) {
		// 		const message = new MarkdownString('This path does not exist...');
		// 		return new Hover(message);
		// 	}
		// 	return;
		// }

		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);
		const section = file.findSectionFromPosition(position);
		let message = undefined;
		if (word === "hash") {
			// if (isInTextureOverrideSection(document, position)) {
			// 	message = `The value of the "hash" should be a hash value.\nYou can find the hash value from the hunting mode.`;
			// } else {
			// 	message = `⚠️The "hash" keyword should only appear in "Override" section and will only work in "Override" section.`;
			// }
			return new Hover("Haaaaaaash.");
		} else if (word === "store") {
			const msg = new MarkdownString();
			msg.appendMarkdown("**You should not use this, unless you know what are you doing for**")
			return new Hover(msg);
		} else if (word === "klee") {
			return new Hover(getASCIIMeme());
		}
		if (message !== undefined) {
			return new Hover(message);
		}
		return;
	}
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