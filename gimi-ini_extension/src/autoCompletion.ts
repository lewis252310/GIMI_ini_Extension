import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, Range, SnippetString, TextDocument, commands } from 'vscode'
import { GIMIRule, GIMIWorkspace } from './util'

export class GIMICompletionItemProvider implements CompletionItemProvider {
    // private getVarList: () => string[];

    // constructor(getVarListFunc: () => string[]) {
    //     this.getVarList = getVarListFunc;
    // }
    
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        
        console.log(`C: ${context.triggerCharacter}, T: ${context.triggerKind}`);

        const file = GIMIWorkspace.findFile(document.uri);
        if (!file) {
            return;
        }
        const prefix = document.getText(new Range(position.translate(0, -1), position));
        if (context.triggerCharacter === '$' || (context.triggerKind === 0 && prefix === '$')) {
            // const range = new Range(position.translate(0, -1), position);
            const items = file.variales.map(variable => {
                const item = new CompletionItem(variable.substring(1), CompletionItemKind.Variable);
                // item.insertText = variable.substring(1);
                // item.range = range;
                // item.filterText = 
                return item;
            })
            return new CompletionList(items, false);
        } else if (context.triggerCharacter === '[') {
            const range = new Range(position.translate(0, -1), position.translate(0, 1));
            if (position.character === 1) {
                const items = getSectionSnippets(range);
                return new CompletionList(items, false);
            }

        }

        // const items: CompletionItem[] = [];
        // const ifStatement = new CompletionItem('if', CompletionItemKind.Struct);
        // ifStatement.insertText = new SnippetString().appendText(`if `).appendTabstop(0).appendText('\n\t\nendif');
        // ifStatement.documentation = `If Statement`;
        // items.push(ifStatement);
        // const ifElseStatement = new CompletionItem('if', CompletionItemKind.Struct);
        // ifElseStatement.insertText = new SnippetString().appendText(`if `).appendTabstop(0).appendText('\n\t\nelse\n\t\nendif');
        // ifElseStatement.documentation = `If-Else Statement`;
        // items.push(ifElseStatement);
        // return items;
        // ================= if return at here, also will eat all default CompletionItem.


        // const varList = this.getVarList();

        // Type A, forEach
        // const completionItems: CompletionItem[] = [];
        // varList.forEach(varName => {
        //     const completionItem = new CompletionItem(varName, CompletionItemKind.Variable);
        //     completionItem.insertText = varName.substring(1);
        //     completionItems.push(completionItem);
        // })
        // return completionItems;
        
        // Type B, map. For me a OOP guy, this code seems super epic weird.
        // well... after 3 days coding, it looks good.
        // return varList.map(varName => {
        //     const item = new CompletionItem(varName, CompletionItemKind.Variable);
        //     item.insertText = varName.substring(1);
        //     return item;
        // });
        
        // throw new Error('Method not implemented.');
    }

    resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
        // console.log(` - resolve - ${item.label}`);
        // const _r = new CompletionItem('abcd', CompletionItemKind.Variable);
        // return item;
        throw new Error('Method not implemented.');
    }
}


function getSectionSnippets(initRange: Range): CompletionItem[] {
    const _r: CompletionItem[] = [];
    GIMIRule.getSectionNamespaces().forEach(name => {
        const insert = new SnippetString().appendText(`[${name}`)
        const item = new CompletionItem('', CompletionItemKind.Struct);
        item.label = name;
        item.filterText = `[${name}`;
        item.range = initRange;
        item.documentation = `A hardcoded default ${name} section snippest.`;
        switch (name) {
            case GIMIRule.sectionNamespace.commandList:
                insert.appendTabstop(1).appendText(']\nif ').appendTabstop(0).appendText('\n\t\nelse \n\t\nendif');
                item.detail = 'CommandList*';
                break;
            case GIMIRule.sectionNamespace.constants:
                insert.appendText(']\nglobal persist $').appendTabstop(0).appendText('\nglobal $');
                item.detail = 'Constants*';
                break;
            case GIMIRule.sectionNamespace.present:
                insert.appendText(']\nif ').appendTabstop(0).appendText('\n\trun = \nendif');
                item.detail = 'Present*';
                break;
            case GIMIRule.sectionNamespace.key:
                insert.appendTabstop(1).appendText(']\nkey = ').appendTabstop(0).appendText('\ncondition = ');
                item.detail = 'one blue button, one red button.  *wipe sweat';
                break;
            case GIMIRule.sectionNamespace.resource:
                insert.appendTabstop(1).appendText(']\ntype = ').appendTabstop(0).appendText('\ndata = ');
                item.detail = 'source, pls?\nYou can find link in description.';
                break;
            case GIMIRule.sectionNamespace.textureOverride:
                insert.appendTabstop(1).appendText(']\nhash = ').appendTabstop(0).appendText('\nmatch_first_index = 0\nrun = ');
                item.detail = 'why do you write textureOverride by hand??';
                break;
            case GIMIRule.sectionNamespace.shaderOverride:
                insert.appendTabstop(1).appendText(']\nhash = ').appendTabstop(0).appendText('\nallow_dupliplicate_hash = yes')
                item.detail = 'Hash: "Take That!"  *model explosion';
                break;
            case GIMIRule.sectionNamespace.shaderRegex:
                insert.appendTabstop(1).appendText(']\nshader_model = ').appendTabstop(0).appendText('\ntemps = \nrun = ');
                item.detail = 'Backslash: "Heeeere\'s backslash!"  *match failed';
                break;
            case GIMIRule.sectionNamespace.customShader:
                insert.appendTabstop(1).appendText(']\nblend = ').appendTabstop(0).appendText('\no0 = ');
                item.detail = 'CustomShader*';
                break;
            default:
                item.label = 'Bruh--';
                item.sortText = 'zzz';
                item.detail = 'why this thing will display here?';
                break;
        }
        item.insertText = insert;
        _r.push(item);
    })
    return _r
}


class NotUsedCompletionItemProvider implements CompletionItemProvider {
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        console.log(`C: ${context.triggerCharacter}, T: ${context.triggerKind}`);

        const _r: CompletionItem[] = [];
        const cursorBefore = document.lineAt(position).text.substring(0, position.character);
        console.log(cursorBefore);
        if (cursorBefore.toLowerCase().endsWith('[comm')) {
            const range = new Range(new Position(position.line, position.character - 5), position);
            const insert = new SnippetString()
                .appendText('[CommandList')
                .appendTabstop(1)
                .appendText(']\n')
                .appendText('if\n\t\nelse\n\t\nendif');
            const item = new CompletionItem(GIMIRule.sectionNamespace.commandList, CompletionItemKind.Struct);
            item.range = range;
            item.insertText = insert;
            item.filterText = '[commandlist';
            item.documentation = `A hardcoded cmd list snippest. It should only show after typing '[comm'`;
            _r.push(item);
        } else if (cursorBefore.toLowerCase().endsWith('[reso')) {
            const range = new Range(new Position(position.line, position.character - 5), position);
            const insert = new SnippetString()
                .appendText('[Resource')
                .appendTabstop(1)
                .appendText(']\n')
                .appendText('file = ')
                .appendTabstop(2);
            const item = new CompletionItem('resource', CompletionItemKind.Struct);
            item.range = range;
            item.insertText = insert;
            item.filterText = '[resource';
            item.documentation = `A hardcoded resource snippest. It should only show after typing '[reso'`;
            _r.push(item);
        }
        

        // ======================================================================
        // This .push() can destroy the native CompletionItems.
        //     (vscode text remeber type, that will make input stack at 'isIncomplete = false' state of CompletionList).
        // But the disadvantage is that there will trigger .provideCompletionItems() every sub- input
        _r.push(new CompletionItem(' ', CompletionItemKind.Text));
        // ======================================================================

        return new CompletionList(_r, true);
    }

    
    resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
        throw new Error('Method not implemented.');
    }
    
}