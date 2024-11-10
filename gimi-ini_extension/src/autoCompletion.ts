import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, Range, SnippetString, TextDocument, CompletionTriggerKind } from 'vscode'
import { GIMIWorkspace } from "./GIMI/GIMIWorkspace"
import { AllSections, AllSectionsKeys } from './GIMI/GIMISectionTitle';

export class GIMICompletionItemProvider implements CompletionItemProvider {
    
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        const file = GIMIWorkspace.findFile(document.uri);
        if (!file) {
            return;
        }
        const laftCahr = position.character < 2 ? undefined : document.getText(new Range(position.translate(0, -2), position.translate(0, -1)));;
        if (context.triggerCharacter === '$' || (context.triggerKind === CompletionTriggerKind.Invoke && laftCahr === '$')) {
            // const range = new Range(position.translate(0, -1), position);
            const items: CompletionItem[] = [];
            file.globalVariables.forEach(gVar => {
                items.push(new CompletionItem(gVar.rawName, CompletionItemKind.Variable));
            })
            return new CompletionList(items, false);
        } else if (context.triggerCharacter === '\\' && laftCahr === '$') {
            const items: CompletionItem[] = [];
            file.rootProject.getGlobalVariableName(document.uri).forEach(gVarN => {
                items.push(new CompletionItem(gVarN.slice(1), CompletionItemKind.Variable))
            })
            return new CompletionList(items, false);

        } else if (context.triggerCharacter === '[') {
            const line = document.lineAt(position);
            if (position.character === line.firstNonWhitespaceCharacterIndex + 1) {
                const items = getCommonSectionSnippets(position);
                return new CompletionList(items, false);
            }
        } else if (context.triggerKind === CompletionTriggerKind.Invoke && position.character > 0) {
            const laftPart = document.getText(new Range(position.with({character: 0}), position)).trim();
            if (laftPart.startsWith("r") && /^run *= */.test(laftPart)) {
                const items: CompletionItem[] = [];
                file.getTypeOfSections("CommandList").forEach(sec => {
                    items.push(new CompletionItem(sec.rawTitle.slice(1,-1), CompletionItemKind.Struct))
                })
                return items;
            }
        }
        return [];
    }

    resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
        // console.log(` - resolve - ${item.label}`);
        // const _r = new CompletionItem('abcd', CompletionItemKind.Variable);
        // return item;
        throw new Error('Method not implemented.');
    }
}


function getCommonSectionSnippets(initPos: Position): CompletionItem[] {
    const _r: CompletionItem[] = [];
    for (const key in AllSections) {
        if (!Object.prototype.hasOwnProperty.call(AllSections, key)) {
            continue;
        }
        const name = AllSections[key as AllSectionsKeys].raw;
        let insert: SnippetString | undefined = new SnippetString().appendText(`[${name}`);
        let detail: string | undefined = undefined;
        switch (name) {
            case "CommandList":
                insert.appendTabstop(1)
                .appendText(']\nif ')
                .appendTabstop(0)
                .appendText('\n\t\nelse \n\t\nendif');
                detail = 'CommandList*';
                break;
            case "Key":
                insert.appendTabstop(1).appendText(']\nkey = ').appendTabstop(0).appendText('\ncondition = ');
                detail = 'one blue button, one red button.  *wipe sweat';
                break;
            case "ShaderRegex":
                insert.appendTabstop(1).appendText(']\nshader_model = ').appendTabstop(0).appendText('\ntemps = \nrun = ');
                detail = 'Backslash: "Heeeere\'s backslash!"  *match failed';
                break;
            case "CustomShader":
                insert.appendTabstop(1).appendText(']\nblend = ').appendTabstop(0).appendText('\no0 = ');
                detail = 'CustomShader*';
                break;
            case "Resource":
                insert.appendTabstop(1).appendText(']\ntype = ').appendTabstop(0).appendText('\ndata = ');
                detail = 'source, pls?\nYou can find link in description.';
                break;
            case "Constants":
                insert.appendText(']\nglobal persist $').appendTabstop(0).appendText('\nglobal $');
                detail = 'Constants*';
                break;
            case "Present":
                insert.appendText(']\nif ').appendTabstop(0).appendText('\n\trun = \nendif');
                detail = 'Present*';
                break;
            case "TextureOverride":
                insert.appendTabstop(1).appendText(']\nhash = ').appendTabstop(0).appendText('\nmatch_first_index = 0\nrun = ');
                detail = 'why do you write textureOverride by hand??';
                break;
            case "ShaderOverride":
                insert.appendTabstop(1).appendText(']\nhash = ').appendTabstop(0).appendText('\nallow_dupliplicate_hash = yes')
                detail = 'Hash: "Take That!"  *model explosion';
                break;
            default:
                insert = undefined;
                detail = undefined;
                continue;
        }
        if (!insert || !detail) {
            continue;
        }
        const item = new CompletionItem('', CompletionItemKind.Struct);
        item.label = name;
        item.filterText = `[${name}`;
        item.detail =detail;
        item.range = new Range(initPos.translate(0, -1), initPos.translate(0, 1));
        item.documentation = `A hardcoded default ${name} section snippest.`;
        item.insertText = insert;
        _r.push(item);
    }
    return _r;
}