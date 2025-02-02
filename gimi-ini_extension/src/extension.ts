
// Maybe need change import from '*' to 'what need', not very like a lot 'vscode.' prefix
import { ExtensionContext, window, commands, languages, workspace, RelativePattern, TextDocument, Uri, TabInputText, Range } from 'vscode';

import { GIMIHoverProvider } from './hoverMessage';
import { GIMIFoldingRangeProvider } from './foldingRange';
import { GIMICompletionItemProvider } from './autoCompletion';
import { GIMIDefinitionProvider } from './definitionJump';
import { DiagnosticsManager } from './diagnostics';
import { ConfigurationsManager } from './configurations';
import { GIMIWorkspace } from './GIMI/GIMIWorkspace';
import { debounceA } from './debounce';
import path from 'path';

function testTriggerFunc() {
	console.log('\nStart testTrigger Cmd\n');

	// GIMIWorkspace.listAllFilesId().forEach(_id => console.log(_id));
	GIMIWorkspace.listAllProjectsId().forEach(_id => console.log(_id));

	console.log('\nEnd testTrigger Cmd\n');
}

export function activate(context: ExtensionContext) {
	console.log('== GIMI ini extension has been activated. ==')
	// window.showInformationMessage('Hi! Here is GIMI ini extension. Until now I only support static highlight. And the default disables any syntax internal processing.');

	// ========================================================
	//                      Setting declare
	// ========================================================
	context.subscriptions.push(ConfigurationsManager.onDidChangeConfiguration());
	ConfigurationsManager.init();

	// ========================================================
	//                 Contributes and Listener
	// ========================================================
	let disposable = commands.registerCommand('gimi-ini.helloWorld', () => {
		window.showInformationMessage('Why you know I have this command?!');
	});
	context.subscriptions.push(disposable);
	context.subscriptions.push(commands.registerCommand('gimi-ini.testTrigger', testTriggerFunc));

	
	context.subscriptions.push(languages.registerFoldingRangeProvider('gimi-ini',
		new GIMIFoldingRangeProvider
	));

	context.subscriptions.push(languages.registerCompletionItemProvider('gimi-ini', 
		new GIMICompletionItemProvider,
		'$', '[', '\\'
	));

	context.subscriptions.push(languages.registerDefinitionProvider('gimi-ini',
		new GIMIDefinitionProvider
	));

	context.subscriptions.push(languages.registerHoverProvider('gimi-ini',
		new GIMIHoverProvider
	));

	// languages.setLanguageConfiguration('gimi-ini', {wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\|\;\:\'\"\,\.\<\>\/\?\s]+)/g})

	context.subscriptions.push(DiagnosticsManager.diagnosticCollection);

	// A very crude debounced implementation
	const debouncedOnDidChange = debounceA((document: TextDocument) => {
		// GIMIWorkspace.updateFile(document.uri);
		// updateDiagonsticsByDocument(document, diagnosticCollection);
	})

	context.subscriptions.push(workspace.onDidChangeTextDocument(event => {
		/**
		 * still dont know why there are contentChanges.length === 0 changes and under what state will be triggered
		 * NaN. i think i know why one change will trigger twice this func
		 * first trigger is before documnet change, means this is nothing happend on document
		 * looks like is provided some service for **document comparison** between change before and after.
		 * and second trigger is really have all change things
		 * but now just very simple method to block it
		 */
		if (event.contentChanges.length === 0) {
			return;
		}
		if (event.document.languageId !== 'gimi-ini') {
			return;
		}
		// debouncedOnDidChange(event.document);
		const file = GIMIWorkspace.findFile(event.document.uri);

		const start = performance.now();
		file?.update(event.document, event.contentChanges);
		const end = performance.now();
		console.log(`Timer: onChange '${path.basename(event.document.uri.path)}' cost ${(end - start).toFixed(3)} ms.`)

		event.contentChanges.forEach(_change => {
			// console.log(_change);
			// file?.update(event.document, _change);
		});

	}));

	// any textDocument open action will trigger this, also qpening from code and cmd.
	context.subscriptions.push(workspace.onDidOpenTextDocument(document => {
		const file = GIMIWorkspace.addFile(document);
	}));
	
	// any textDocument close action will trigger this, also qpening from code and cmd.
	context.subscriptions.push(workspace.onDidCloseTextDocument(document => {
		{
			// this part is try to fix rare duplicate section diagnostic errors
			// but it seems that should not rely on the document close action. 
			// so it still cannot be solved for now

			// const file = GIMIWorkspace.findFile(document.uri);
			// file && GIMIWorkspace.deleteDiagnostic(file);
		}
	}))

	// onDidChangeActiveTextEditor mean when textEditor state has any changing.
	// focus textEditor changed (trigger once), focus fileTab changed (trigger twice, from -> to).
	// context.subscriptions.push(window.onDidChangeActiveTextEditor(editor => {
	// 	if (editor) {
	// 		// updateDiagonsticsByDocument(editor.document, diagnosticCollection);
	// 	}
	// }));

	// ======== dynamic if-else block highlight ========
	// context.subscriptions.push(window.onDidChangeTextEditorSelection(event => {
	// 	GIMIIfElseBlockHighlight.update(event.textEditor, event.selections[0]?.active);
	// }))

	// ========================================================
	//                      Initialization
	// ========================================================
	workspace.textDocuments.forEach(document => {
		const state = GIMIWorkspace.addFile(document);
	})

	// if (window.activeTextEditor) {}

	// Tab for editor, seems that it's not needed at the now?
	// window.tabGroups.all.forEach(tabG => {
	// 	tabG.tabs.forEach(tab => {
	// 		if (tab.input instanceof TabInputText) {
	// 			console.log(tab.input.uri.fsPath);
	// 		}
	// 	})
	// })

	workspace.workspaceFolders?.forEach(folder => {
		let pattern = new RelativePattern(folder, '**/*.ini');
		workspace.findFiles(pattern).then(files => {
			files.forEach(file => {
				// just open it, and then throw to onDidOpenTextDocument processing
				workspace.openTextDocument(file);
			})
		})
	})
}

export function deactivate() {
	console.log('== GIMI ini extension has been deactivate. ==')
}
