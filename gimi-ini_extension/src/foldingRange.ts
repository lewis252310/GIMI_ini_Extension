import { CancellationToken,
    Event, FoldingContext, FoldingRange, FoldingRangeKind, FoldingRangeProvider, ProviderResult, TextDocument } from 'vscode'

/**
 * A GIMI ini FoldingRangeProvider, not over the `if else` block fold check.
 */
export class GIMIFoldingRangeProvider implements FoldingRangeProvider {
    onDidChangeFoldingRanges?: Event<void> | undefined;
    provideFoldingRanges(document: TextDocument, context: FoldingContext, token: CancellationToken): ProviderResult<FoldingRange[]> {
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
            const line = document.lineAt(i).text;
            
            // section floding range logic A
            // if (sectionTitleRegxe.test(line)) {
            //     let start = i;
            //     do {
            //         i++
            //     } while (i < document.lineCount && !sectionTitleRegxe.test(document.lineAt(i).text));
            //     let iBack = --i;
            //     while (emptyLineRegex.test(document.lineAt(iBack).text)) {
            //         iBack--;
            //     }
            //     let end = iBack;
            //     ranges.push(new FoldingRange(start, end, FoldingRangeKind.Region))
            // }
            
            // section floding range logic B
            // last section will not work correctly
            if (sectionTitleRegex.test(line) || i == document.lineCount - 1) {
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
            } else if (emptyLineRegex.test(line)) {
                if (i - nearestNonEmptyLine == 1) {
                    nearestEmptyLine = i;
                }
            } else if (commentRegex.test(line)) {
                nearestNonEmptyLine = i;
                furthestComment = i;
            } else {
                nearestNonEmptyLine = i;
            }

            // `if else` block folding range logic
            if (/^([ \t]*)?if/i.test(line)) {
                ifBlockStarts.push(i);
            } else if (/^([ \t]*)?else( if)?/i.test(line)) {
                let start = ifBlockStarts.pop();
                if (start !== undefined) {
                    ranges.push(new FoldingRange(start, (i - 1), FoldingRangeKind.Region))
                }
                ifBlockStarts.push(i);
            } else if (/^([ \t]*)?endif/.test(line)) {
                let start = ifBlockStarts.pop();
                if (start !== undefined) {
                    ranges.push(new FoldingRange(start, (i - 1), FoldingRangeKind.Region))
                }
            }
        }
        // throw new Error('Method not implemented.');
        return ranges;
    }
}