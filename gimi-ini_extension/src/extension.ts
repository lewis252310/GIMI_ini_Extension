
// Maybe need change import from '*' to 'what need', not very like a lot 'vscode.' prefix
import { ExtensionContext, window, commands, languages, workspace, RelativePattern, TextDocument } from 'vscode';

import { GIMIHoverProvider } from './hoverMessage';
import { GIMIFoldingRangeProvider } from './foldingRange';
import { GIMICompletionItemProvider } from './autoCompletion';
import { GIMIDefinitionProvider } from './definitionJump';
import { updateDiagonsticsByDocument } from './diagnostics';
import { GIMIConfiguration, GIMIWorkspace } from './util';
import { debounceA } from './debounce'

function updateUserConfiguration() {
	let parserConfig = workspace.getConfiguration('GIMIini.file').get<number>('parseingAllowedMaximumLines');
	GIMIConfiguration.parseingAllowedMaximumLines = parserConfig ? parserConfig : 1000;
	parserConfig = workspace.getConfiguration('GIMIini.file').get<number>('parseingAllowedMaximumCharacters');
	GIMIConfiguration.parseingAllowedMaximumCharacters = parserConfig ? parserConfig : 30000;
}



export function activate(context: ExtensionContext) {
	console.log('GIMI ini extension has been activated.')
	window.showInformationMessage('Hi! Here is GIMI ini extension. Until now I only support static highlight. And the default disables any syntax internal processing.');


	context.subscriptions.push(workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('GIMIini.file.parseingAllowedMaximumLines')) {
			updateUserConfiguration();
		}
		if (event.affectsConfiguration('GIMIini.file.parseingAllowedMaximumCharacters')) {
			updateUserConfiguration();
		}
	}))

	updateUserConfiguration();


	let disposable = commands.registerCommand('gimi-ini.helloWorld', () => {
		window.showInformationMessage('Why you know I have this command?!');
	});
	context.subscriptions.push(disposable);

	
	context.subscriptions.push(languages.registerFoldingRangeProvider('gimi-ini',
		new GIMIFoldingRangeProvider
	));

	context.subscriptions.push(languages.registerCompletionItemProvider('gimi-ini', 
		new GIMICompletionItemProvider,
		'$', '['
	));

	context.subscriptions.push(languages.registerDefinitionProvider('gimi-ini',
		new GIMIDefinitionProvider
	));

	context.subscriptions.push(languages.registerHoverProvider('gimi-ini',
		new GIMIHoverProvider
	));

	// languages.setLanguageConfiguration('gimi-ini', {wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\|\;\:\'\"\,\.\<\>\/\?\s]+)/g})

	const diagnosticCollection = languages.createDiagnosticCollection('gimi-ini');
	context.subscriptions.push(diagnosticCollection);

	// A very crude debounced implementation
	const debouncedOnDidChange = debounceA((document: TextDocument) => {
		GIMIWorkspace.updateFile(document.uri);
		updateDiagonsticsByDocument(document, diagnosticCollection);
	})

	const didChangeDisposable = workspace.onDidChangeTextDocument(event => {
		if (event.contentChanges.length === 0) {
			return;
		}
		debouncedOnDidChange(event.document);
		// GIMIWorkspace.updateFile(event.document.uri);
		// updateDiagonsticsByDocument(event.document, diagnosticCollection);
	})
	context.subscriptions.push(didChangeDisposable);

	context.subscriptions.push(workspace.onDidOpenTextDocument(document => {
		if (!GIMIWorkspace.findFile(document.uri)) {
			GIMIWorkspace.addFile(document.uri);
		}
	}));

	context.subscriptions.push(window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDiagonsticsByDocument(editor.document, diagnosticCollection);
		}
	}));

	if (window.activeTextEditor) {
		for (const document of workspace.textDocuments) {
			if (!GIMIWorkspace.findFile(document.uri)) {
				GIMIWorkspace.addFile(document.uri);
			}
		}
		updateDiagonsticsByDocument(window.activeTextEditor.document, diagnosticCollection);
	}

	// window.visibleTextEditors.forEach(editor => {
	// 	const document = editor.document;
	// 	const workspaceFolder = workspace.getWorkspaceFolder(document.uri);
	// 	if (!workspaceFolder) {
	// 		GIMIWorkspace.addSingleFile(document.uri);
	// 	}
	// })

	let folder = workspace.workspaceFolders?.[0];
	if (folder) {
		let pattern = new RelativePattern(folder, '**/*.ini');
		workspace.findFiles(pattern).then(files => {
			files.forEach(file => {
				GIMIWorkspace.addProjectFile(file);
			})
		})
	}

}

export function deactivate() {}
