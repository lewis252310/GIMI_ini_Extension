
import { CancellationToken, DocumentSemanticTokensProvider, Event, ProviderResult, SemanticTokens, SemanticTokensBuilder, SemanticTokensEdits, SemanticTokensLegend, TextDocument } from 'vscode'

/**
 * Looks like is not just useing DocumentSemanticTokensProvider
 */
export class GIMIDocumentSemanticTokensProvider implements DocumentSemanticTokensProvider {
    onDidChangeSemanticTokens?: Event<void> | undefined;

    private static tokenTypes = ['comment', 'string', 'keyword', 'number', 'namespace'];

    private static tokenModifiers = ['declaration', 'documentation', 'readonly', 'static', 'abstract'];

    static getTokensLegend(): SemanticTokensLegend {
        return new SemanticTokensLegend(this.tokenTypes, this.tokenModifiers);
    }

    provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): ProviderResult<SemanticTokens> {
        const builder = new SemanticTokensBuilder();

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();
            const textOffset = line.text.length - text.length;
            if (text.toLowerCase().startsWith('if') || text.toLowerCase().startsWith('else') || text.toLowerCase().startsWith('endif')) {
                const match = /^(if|else( if)?|endif)/i.exec(text);
                if (!match) {
                    continue;
                }
                builder.push(i, match.index, match[1].length, 0, 8);
            }
            
        }

        return builder.build();
        // throw new Error('Method not implemented.');
    }

    provideDocumentSemanticTokensEdits?(document: TextDocument, previousResultId: string, token: CancellationToken): ProviderResult<SemanticTokens | SemanticTokensEdits> {
        throw new Error('Method not implemented.');
    }
}