import { languages, DiagnosticCollection, Diagnostic, Uri } from 'vscode'

export class GIMIDiagnosticsManager {
    private static instance: GIMIDiagnosticsManager;

	private diagnosticCollection: DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = languages.createDiagnosticCollection('gimi-ini');
    }

    static getInstance(): GIMIDiagnosticsManager {
        if (!GIMIDiagnosticsManager.instance) {
            GIMIDiagnosticsManager.instance = new GIMIDiagnosticsManager();
        }
        return GIMIDiagnosticsManager.instance;
    }

    getDiagnosticCollection() {
        return this.diagnosticCollection;
    }

    addDiagnostic(uri: Uri, diagnostics: Diagnostic[]): void {
        this.diagnosticCollection.set(uri, diagnostics);
    }

    clearDiagnostics(uri?: Uri): void {
        if (uri) {
            this.diagnosticCollection.delete(uri);
        } else {
            this.diagnosticCollection.clear();
        }
    }
}