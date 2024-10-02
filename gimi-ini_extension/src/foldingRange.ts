import { CancellationToken,
    Event, FoldingContext, FoldingRange, FoldingRangeKind, FoldingRangeProvider, ProviderResult, TextDocument } from 'vscode'
import { GIMIWorkspace } from './GIMI/GIMIWorkspace'

/**
 * A GIMI ini FoldingRangeProvider, not over the `if else` block fold check.
 */
export class GIMIFoldingRangeProvider implements FoldingRangeProvider {
    onDidChangeFoldingRanges?: Event<void> | undefined;
    provideFoldingRanges(document: TextDocument, context: FoldingContext, token: CancellationToken): ProviderResult<FoldingRange[]> {
        const _r: FoldingRange[] = [];
        const file = GIMIWorkspace.findFile(document.uri);
        if (!file) {
            return;
        }
        file.getFoldingRanges().forEach(_rng => {
            _r.push(new FoldingRange(_rng.start.line, _rng.end.line, FoldingRangeKind.Region));
        });
    //     const separators = file.getSeparators();
    //     for (let i = 0; i < separators.length; i++) {
    //         if (separators[i + 1]) {
    //             const startL = separators[i];
    //             const endL = separators[i + 1] - 2;
    //             ranges.push(new FoldingRange(startL, endL, FoldingRangeKind.Region));
    //         } else {
    //             const startL = separators[i];
    //             ranges.push(new FoldingRange(startL, document.lineCount - 1, FoldingRangeKind.Region))
    //         }
    //     }
        return _r
    }
}