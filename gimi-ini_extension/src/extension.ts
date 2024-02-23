
// Maybe need change import from '*' to 'what need', not very like a lot 'vscode.' prefix
import { ExtensionContext, window, commands, languages, Hover, workspace } from 'vscode';

import { getHoverMessage } from './hoverMessage';
import { GIMIFoldingRangeProvider } from './foldingRange';
import { GIMICompletionItemProvider } from './autoCompletion';
import { GIMIDefinitionProvider } from './definitionJump'
import { updateDiagonstics } from './diagnostics';
import { parseDocumentVariables } from './util';


export function activate(context: ExtensionContext) {

	let activeDocumentVariables: string[] = [];
	const getVarList = () => activeDocumentVariables;

	
	console.log('GIMI ini extension has been activated.')
	window.showInformationMessage('Hi! Here is GIMI ini extension. Until now I only support static highlight. And the default disables any syntax internal processing.');

	let disposable = commands.registerCommand('gimi-ini.helloWorld', () => {
		window.showInformationMessage('Why you know I have this command?!');
	});
	context.subscriptions.push(disposable);

	
	context.subscriptions.push(languages.registerFoldingRangeProvider('gimi-ini',
		new GIMIFoldingRangeProvider
	));

	context.subscriptions.push(languages.registerCompletionItemProvider('gimi-ini', 
		new GIMICompletionItemProvider(getVarList),
		'$'
	));

	context.subscriptions.push(languages.registerDefinitionProvider('gimi-ini',
		new GIMIDefinitionProvider
	))


	const diagnosticCollection = languages.createDiagnosticCollection('gimi-ini');
	const didChangeDisposable = workspace.onDidChangeTextDocument(event => {
		updateDiagonstics(event, diagnosticCollection);
		// this will trigger loop entire file every change event, BAD
		activeDocumentVariables = parseDocumentVariables(event.document)
	})
	context.subscriptions.push(didChangeDisposable);
	const didOpenDisposable = workspace.onDidOpenTextDocument(document => {
		updateDiagonstics(document, diagnosticCollection);
		activeDocumentVariables = parseDocumentVariables(document);
	})
	context.subscriptions.push(didOpenDisposable);
	const didChangeActiveTextEditor = window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDiagonstics(editor.document, diagnosticCollection);
			activeDocumentVariables = parseDocumentVariables(editor.document);
		}
	})
	context.subscriptions.push(didChangeActiveTextEditor);

	if (window.activeTextEditor) {
		let document = window.activeTextEditor.document
		updateDiagonstics(document, diagnosticCollection);
		activeDocumentVariables = parseDocumentVariables(document);
	}

	/**
	 * For now, we're not going to go any deeper into using code to build the check,
	 * so this is just a preliminary entry point.
	 */
	// let provider = languages.registerHoverProvider('gimi-ini', {
    //     provideHover(document, position, token) {
	// 		if (token.isCancellationRequested) {
    //             return;
    //         }
	// 		const message = getHoverMessage(document, position);
	// 		if (message !== undefined) {
	// 			return new Hover(message);
	// 		}
	// 		return;
    //     }
    // });
	// context.subscriptions.push(provider);
}

export function deactivate() {}
