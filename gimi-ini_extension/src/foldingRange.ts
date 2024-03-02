import { CancellationToken,
    Event, FoldingContext, FoldingRange, FoldingRangeKind, FoldingRangeProvider, ProviderResult, TextDocument } from 'vscode'
import { GIMIWorkspace, Timer } from './util'
import path from 'path';

/**
 * A GIMI ini FoldingRangeProvider, not over the `if else` block fold check.
 */
export class GIMIFoldingRangeProvider implements FoldingRangeProvider {
    onDidChangeFoldingRanges?: Event<void> | undefined;
    provideFoldingRanges(document: TextDocument, context: FoldingContext, token: CancellationToken): ProviderResult<FoldingRange[]> {
        let ranges: FoldingRange[] = [];
        const file = GIMIWorkspace.findFile(document.uri);
        if (!file) {
            return;
        }
        file.getSections().forEach(section => {
            const startL = section.range.start.line;
            const endL = section.range.end.line;
            ranges.push(new FoldingRange(startL, endL, FoldingRangeKind.Region));
            section.ifelBlock.forEach(block => {
                ranges.push(new FoldingRange(block.startLine, block.endLine, FoldingRangeKind.Region));
            });
        });
        const separators = file.getSeparators();
        for (let i = 0; i < separators.length; i++) {
            if (separators[i + 1]) {
                const startL = separators[i];
                const endL = separators[i + 1] - 2;
                ranges.push(new FoldingRange(startL, endL, FoldingRangeKind.Region));
            }
        }
        return ranges;
    }

    provideFoldingRanges__(document: TextDocument, context: FoldingContext, token: CancellationToken): ProviderResult<FoldingRange[]> {
        const timer: Timer = new Timer(`fold ${path.basename(document.uri.fsPath)}: `, true);
        let ranges: FoldingRange[] = [];
        const sectionTitleRegex = new RegExp(`^\\[.*\\]`, 'i');
        const emptyLineRegex = new RegExp(`^[ \\t]*$`, 'i');
        const commentRegex = new RegExp(`^([ \\t]+)?;`, 'i');
        let sectionStart: number = NaN;
        let nearestNonEmptyLine: number = NaN;
        let nearestEmptyLine: number = NaN;
        let furthestComment: number = NaN;
        let ifBlockStarts: number[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();
            if (sectionTitleRegex.test(text) || i == document.lineCount - 1) {
                if (Number.isNaN(sectionStart)) {
                    sectionStart = i;
                } else {
                    let start = sectionStart;
                    let end = 0;
                    if (i - furthestComment == 1) {
                        end = nearestEmptyLine - 1;
                    } else if (i == document.lineCount - 1 && i - nearestNonEmptyLine == 1) {
                        end = nearestNonEmptyLine + 1;
                    } else {
                        end = nearestNonEmptyLine;
                    }
                    ranges.push(new FoldingRange(start, end, FoldingRangeKind.Region));
                    // ????
                    // ifBlockStarts = []
                    ifBlockStarts.length = 0;
                    sectionStart = i;
                }
                continue;
            } else if (line.isEmptyOrWhitespace) {
                if (i - nearestNonEmptyLine == 1) {
                    nearestEmptyLine = i;
                }
                continue;
            } else if (text.startsWith(';')) {
                nearestNonEmptyLine = i;
                furthestComment = i;
                continue;
            } else {
                nearestNonEmptyLine = i;
            }

            // `if else` block folding range logic
            if (/^if/i.test(text)) {
                ifBlockStarts.push(i);
            } else if (/^else( if)?|elif/i.test(text)) {
                let start = ifBlockStarts.pop();
                if (start !== undefined) {
                    ranges.push(new FoldingRange(start, (i - 1), FoldingRangeKind.Region))
                }
                ifBlockStarts.push(i);
            } else if (/^endif/.test(text)) {
                let start = ifBlockStarts.pop();
                if (start !== undefined) {
                    ranges.push(new FoldingRange(start, (i - 1), FoldingRangeKind.Region))
                }
            }
        }
        // throw new Error('Method not implemented.');
        timer.end();
        return ranges;
    }
}