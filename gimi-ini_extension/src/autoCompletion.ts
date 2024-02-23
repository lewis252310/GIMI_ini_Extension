import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, TextDocument } from 'vscode'

export class GIMICompletionItemProvider implements CompletionItemProvider {
    private getVarList: () => string[];

    constructor(getVarListFunc: () => string[]) {
        this.getVarList = getVarListFunc;
    }
    
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        
        const varList = this.getVarList();

        // Type A, forEach
        // const completionItems: CompletionItem[] = [];
        // varList.forEach(varName => {
        //     const completionItem = new CompletionItem(varName, CompletionItemKind.Variable);
        //     completionItem.insertText = varName.substring(1);
        //     completionItems.push(completionItem);
        // })
        // return completionItems;
        
        // Type B, map. For me a OOP guy, this code seems super epic weird. 
        return varList.map(varName => {
            const item = new CompletionItem(varName, CompletionItemKind.Variable);
            item.insertText = varName.substring(1);
            return item;
        });
        
        // throw new Error('Method not implemented.');
    }

    resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
        throw new Error('Method not implemented.');
    }
}