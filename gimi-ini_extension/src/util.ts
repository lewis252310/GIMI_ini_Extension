import path from 'path';
import { performance } from 'perf_hooks'
import { Diagnostic, DiagnosticSeverity, Position, Range, TextDocument, TextEditor, TextLine, Uri, window, workspace } from 'vscode'
import { GIMIDiagnosticsManager } from './diagnostics'

export class GIMIConfiguration {
    static parseingAllowedMaximumLines: number;
    static parseingAllowedMaximumCharacters: number;
    static parseingDebounceInterval: number;
}

interface GIMIIdentifierInfo {
    namespace: string;
    localName: string;
    fullName: string;
    type: string;
}

// export class GIMIRule {
//     static extNameList: string[] = ['.ini'];

//     static readonly namespace = {
//         variable: '$',
//         constants: 'Constants',
//         present: 'Present',
//         key: 'Key',
//         commandList: 'CommandList',
//         textureOverride: 'TextureOverride',
//         shaderOverride: 'ShaderOverride',
//         shaderRegex: 'ShaderRegex',
//         customShader: 'CustomShader',
//         resource: 'Resource'
//     }

//     static getSectionNamespaces(): string[] {
//         return Object.values(this.namespace);
//     }

//     static getSectionNamespaceRegexStyle(): string {
//         return this.getSectionNamespaces().join('|');
//     }

//     static parseSectionTypeByName(name: string): GIMISectionType | undefined {
//         if (name.startsWith(this.namespace.constants)) {
//             return GIMISectionType.constants;
//         } else if (name.startsWith(this.namespace.present)) {
//             return GIMISectionType.present;
//         } else if (name.startsWith(this.namespace.key)) {
//             return GIMISectionType.key;
//         } else if (name.startsWith(this.namespace.commandList)) {
//             return GIMISectionType.commandList;
//         } else if (name.startsWith(this.namespace.textureOverride)) {
//             return GIMISectionType.textureOverride;
//         } else if (name.startsWith(this.namespace.shaderOverride)) {
//             return GIMISectionType.shaderOverride;
//         } else if (name.startsWith(this.namespace.shaderRegex)) {
//             return GIMISectionType.shaderRegex;
//         } else if (name.startsWith(this.namespace.customShader)) {
//             return GIMISectionType.customShader;
//         } else if (name.startsWith(this.namespace.resource)) {
//             return GIMISectionType.resource;
//         } else {
//             return undefined;
//         }
//     }

//     static getSectionNamespaceByType(type: GIMISectionType): string | undefined {
//         switch (type) {
//             case GIMISectionType.constants:
//                 return GIMIRule.namespace.constants;
//             case GIMISectionType.present:
//                 return GIMIRule.namespace.present;
//             case GIMISectionType.key:
//                 return GIMIRule.namespace.key;
//             case GIMISectionType.commandList:
//                 return GIMIRule.namespace.commandList;
//             case GIMISectionType.textureOverride:
//                 return GIMIRule.namespace.textureOverride;
//             case GIMISectionType.shaderOverride:
//                 return GIMIRule.namespace.shaderOverride;
//             case GIMISectionType.shaderRegex:
//                 return GIMIRule.namespace.shaderRegex;
//             case GIMISectionType.customShader:
//                 return GIMIRule.namespace.customShader;
//             case GIMISectionType.resource:
//                 return GIMIRule.namespace.resource;        
//             default:
//                 return undefined;
//         }
//     }

//     static generateIdentifier(type: GIMISectionType | undefined, namespace: string, name: string) {
//         const _t = type ? this.getSectionNamespaceByType(type) : 'other';
//         return `${_t}\\${namespace}#${name}`;
//     }

//     static extractFullNameFrom(path: string): string {
//         return this.parseIdentifier(path).fullName;
//     }

//     static extractNamespaceFrom(path: string): string {
//         return this.parseIdentifier(path).namespace;
//     }

//     static parseIdentifier(identifier: string): GIMIIdentifierInfo{
//         const parts = identifier.split(/[\\\#]/);
//         const localName = parts.at(-1)!;
//         const type = parts[0];
//         const fullName = type + localName;
//         const namespace = parts.slice(1, -1).join('\\');
//         return { namespace, fullName, localName, type };
//     }
// }

// enum GIMISectionType {
//     constants,
//     present,
//     key,
//     commandList,
//     textureOverride,
//     shaderOverride,
//     shaderRegex,
//     customShader,
//     resource
// }

// class GIMISectionName {
//     name: string;

//     constructor(name: string) {
//         this.name = name;
//     }

//     getLocalName(): string {
//         const _u = this.name.split('\\');
//         return `${_u[0]}${_u.at(-1)}`;
//     }

//     getNameSpace(): string {
//         const _u = this.name.split('\\');
//         return _u.slice(1, -1).join('\\');
//     }
// }

// class GIMIIfElseBlock {
//     startLine: number;
//     endLine: number;
//     level: number;
//     constructor(startL: number, endL: number, level: number) {
//         this.startLine = startL;
//         this.endLine = endL;
//         this.level = level;
//     }
// }

// class GIMISection {
//     range: Range;
//     name: string;
//     type: GIMISectionType | undefined;
//     ifelBlock: GIMIIfElseBlock[] = [];

//     parentDiagnostics: () => Diagnostic[];

//     constructor(range: Range, name: string, parentDiagnostics: () => Diagnostic[], initSource?: string[] | TextDocument) {
//         this.range = range;
//         this.name = name.toLowerCase();
//         this.parentDiagnostics = parentDiagnostics;
//         this.type = GIMIRule.parseSectionTypeByName(this.name);
//         if (!initSource) {
//             return;
//         }
//         const linePoints: number[] = (() => {
//             if (Array.isArray(initSource)) {
//                  return GIMISection.parseByLines(initSource, range.start.line);
//             } else if (typeof initSource?.fileName === 'string' && typeof initSource?.getText === 'function') {
//                 const lines = (initSource as TextDocument).getText(this.range).split('\n');
//                 return GIMISection.parseByLines(lines, range.start.line);
//             }
//             return [];
//         })();
//         for (let i = 0; i < linePoints.length; i += 3) {
//             if (linePoints[i + 1] && linePoints[i + 2]) {
//                 this.ifelBlock.push(new GIMIIfElseBlock(linePoints[i], linePoints[i + 1], linePoints[i + 2]));
//                 // this.ifelBlock.push({startLine: linePoints[i], endLine: linePoints[i + 1]});
//             }
//         }
//     }

//     static parseByLines(lines: string[], offsetLine: number = 0): number[] {
//         let ifelBlockPosL: number[] = [];
//         let ifelBlockLV: number = -1;
//         let _r: number[] = [];
//         for (let i = 0; i < lines.length ; i++) {
//             const realLineIndex = i + offsetLine;
//             const text = lines[i].trim().toLowerCase();
//             if (text.length === 0 && text.startsWith(';')) {
//                 continue;
//             }
//             // not use at now, this is a .trim() cuted count.
//             const lineOffset = lines[i].length - text.length;
//             if (text.startsWith('if')) {
//                 ifelBlockPosL.push(realLineIndex);
//                 ifelBlockLV++;
//             } else if (text.startsWith('else') || text.startsWith('elif')) {
//                 let start = ifelBlockPosL.pop();
//                 if (start !== undefined) {
//                     _r.push(start, realLineIndex - 1, ifelBlockLV);
//                 }
//                 ifelBlockPosL.push(realLineIndex);
//             } else if (text.startsWith('endif')) {
//                 let start = ifelBlockPosL.pop();
//                 if (start !== undefined) {
//                     _r.push(start, realLineIndex - 1, ifelBlockLV);
//                     ifelBlockLV--;
//                 }
//             }
//         }
//         return _r;
//     }

//     updateContent(lines: string[], offsetLine?: number) {
//         GIMISection.parseByLines(lines, offsetLine);
//     }
// }

// class GIMIFile {
//     uri: Uri;
    
//     namespace: string;

//     gimiNamespace?: string;

//     isDisabled?: boolean;

//     variales: string[] = [];
    
//     diagnostics: Diagnostic[] = [];

//     private sectionMap: Map<string, GIMISection> = new Map<string, GIMISection>();

//     private sectionArray: string[] = [];

//     private sectionChain: number[] = [];

//     private separators: number[] = [];

//     constructor(uri: Uri) {
//         this.uri = uri;
//         const basename = path.basename(this.uri.fsPath);
//         basename.toLowerCase().startsWith('disabled') ? this.isDisabled = true : undefined;

//         const fileRelativePath = workspace.asRelativePath(this.uri, true);
//         if (fileRelativePath !== this.uri.fsPath) {
//             this.namespace = `${fileRelativePath}`;
//         } else {
//             this.namespace = basename;
//         }
//         this.updateContent();
//     }

//     /**
//      * For now, return always include namespace (not GIMI one!).
//      * @param excludeNamespace Not use now
//      * @param changeToGIMINamespace Not use now
//      */
//     getSectionIdentifiers(specifyType?: GIMISectionType, changeToGIMINamespace?: boolean, excludeNamespace?: boolean): string[] {
//         const sections = this.getSections(specifyType);
//         const namespace = (() => {
//             if (changeToGIMINamespace && this.gimiNamespace) {
//                 return this.gimiNamespace;
//             } else {
//                 return this.namespace;
//             }
//         })()
//         return sections.map(section => {
//             return GIMIRule.generateIdentifier(section.type, namespace, section.name);
//         });
//     }

//     getSections(specifyType?: GIMISectionType): GIMISection[] {
//         const sections = Array.from(this.sectionMap.values());
//         if (!specifyType) {
//             return sections;
//         }
//         return sections.filter(section => {
//             section.type === specifyType;
//         })
//     }

//     getSectionByNameOrIdentifier(nameOrIdentifier: string): GIMISection | undefined {
//         const name = (() => {
//             if (nameOrIdentifier.includes('\\')) {
//                 return nameOrIdentifier.split('\\').at(-1)?.toLowerCase();
//             } else {
//                 return nameOrIdentifier.toLowerCase();
//             }
//         })()
//         if (name) {
//             return this.sectionMap.get(name);
//         }
//         return undefined;
//     }

//     getSectionChain(): number[] {
//         return this.sectionChain;
//     }

//     getSeparators(): number[] {
//         return this.separators;
//     }

//     async updateContent() {
//         const document = await workspace.openTextDocument(this.uri);
//         this.diagnostics.length = 0;
//         this._parseSections(document);
//         this._updateSectionChainData();
//         this._updateGIMINamespace(document);
//         this._parseVariables(document);
//         GIMIDiagnosticsManager.getInstance().addDiagnostic(this.uri, this.diagnostics);
//     }

//     private _getdiagnostics() {
//         return this.diagnostics;
//     }
    
//     private _updateSectionChainData() {
//         this.sectionChain.length = 0;
//         let lastPoint = 0;
//         this.sectionArray.forEach(key => {
//             const section = this.sectionMap.get(key);
//             if (section) {
//                 const start = section.range.start.line;
//                 const end = section.range.end.line;
//                 const delta = start - lastPoint;
//                 lastPoint = end;
//                 const length = end - start + 1;
//                 this.sectionChain.push(delta, length);
//             }
//         })
//     }

//     private _parseSections(document: TextDocument) {
//         this.sectionArray.length = 0;
//         this.separators.length = 0;

//         let constantsCount = 0;
//         let presentCount = 0;

//         let lastSectionInfo: {line: number, name: string | undefined} = {line: -1, name: ''};

//         for (let i = 0; i < document.lineCount; i++) {
//             const isLastLine = i === document.lineCount - 1;
//             const line = document.lineAt(i);
//             const text = line.text.trim();
//             if (text.includes(';') && !isLastLine) {                
//                 if (text.startsWith(';')) {
//                     if (!text.includes('--------')) {
//                         continue;
//                     }
//                     if (document.lineAt(i - 1).isEmptyOrWhitespace && document.lineAt(i + 1).isEmptyOrWhitespace) {                    
//                         this.separators.push(i);
//                     }
//                     continue;
//                 } else {
//                     this.diagnostics.push(new Diagnostic(
//                         line.range,
//                         'Comments must be on a separate line. Continuation after codes is illegal.',
//                         DiagnosticSeverity.Error
//                     ));
//                 }
//             }
//             const matchs = /^\[(.+)\]/.exec(text);
//             const name = (() => {
//                 let _r = undefined;
//                 if (matchs && matchs[1]) {
//                     _r = matchs[1];
//                     if (_r.toLowerCase() === 'constants') {
//                         _r = `${_r}.${constantsCount}`;
//                         constantsCount++;
//                     } else if (_r.toLowerCase() === 'present') {
//                         _r = `${_r}.${presentCount}`;
//                         presentCount++;
//                     }
//                 }
//                 return _r;
//             })();
//             if (name || isLastLine) {
//                 if (lastSectionInfo.line === -1) {
//                     lastSectionInfo = {line: i, name: name};
//                     continue;
//                 }
//                 let endPosL = i;
//                 let endPosC = line.text.length;
//                 const backStartLine = !isLastLine ? i - 1 : i;
//                 for (let j = backStartLine; j > lastSectionInfo.line; j--) {
//                     const backLine = document.lineAt(j);
//                     endPosL = j;
//                     endPosC = backLine.text.length;
//                     if (backLine.isEmptyOrWhitespace || j === this.separators.at(-1)) {
//                         continue;
//                     } else if (!backLine.text.trim().startsWith(';')) {
//                         break;
//                     } else if (j !== document.lineCount - 1 && document.lineAt(j + 1).isEmptyOrWhitespace) {
//                         break;
//                     }
//                 }
//                 if (lastSectionInfo.name !== undefined) {                    
//                     const range = new Range(new Position(lastSectionInfo.line, 0), new Position(endPosL, endPosC))
//                     const section = new GIMISection(range, lastSectionInfo.name, this._getdiagnostics, document);
//                     this.sectionArray.push(section.name);
//                     this.sectionMap.set(section.name, section);
//                     for (const p of this.separators) {
//                         if (range.contains(new Position(p, 1))) {
//                             this.separators.pop();
//                             continue;
//                         } else {
//                             break;
//                         }
//                     }
//                 }
//                 lastSectionInfo = {line: i, name: name};
//             }
//         }
//     }

//     private _updateGIMINamespace(document: TextDocument) {
//         const checkEndLine = (() => {
//             if (this.sectionArray.length < 1 || this.sectionChain.length < 2) {
//                 return document.lineCount;
//             } else {
//                 return this.sectionChain[0];
//             }
//         })()
//         this.gimiNamespace = undefined;
//         for (let i = 0; i < checkEndLine; i++) {
//             const line = document.lineAt(i).text;
//             const text = line.trim();
//             const textOffset = line.length - text.length;
//             const match = /^namespace *\= *([\w\\\.]+)/i.exec(text);
//             if (match && match[1]) {
//                 if (!this.gimiNamespace) {
//                     this.gimiNamespace = match[1];
//                 } else {
//                     this.diagnostics.push(new Diagnostic(
//                         new Range(new Position(i, textOffset), new Position(i, line.length - 1)),
//                         `Not allowed to declare namespace more then once.`,
//                         DiagnosticSeverity.Error
//                     ));
//                 }
//             }
//         }
//     }

//     private _parseVariables(document: TextDocument) {
//         this.variales.length = 0;
//         const targets = this.sectionArray.filter(section => {
//             return section.includes('constants');
//         });
//         targets.forEach(target => {
//             const section = this.sectionMap.get(target);
//             if (section) {
//                 for (let i = section.range.start.line + 1; i <= section.range.end.line; i++) {
//                     const line = document.lineAt(i);
//                     const text = line.text.trim();
//                     const textOffset = line.text.length - text.length;
//                     if (line.isEmptyOrWhitespace || text.startsWith(';')) {
//                         continue;
//                     }
//                     const matchs = /^(?:persist +)?global(?: +persist)? +(\$[\w]+)/i.exec(text);
//                     if (matchs && matchs[1]) {
//                         this.variales.push(matchs[1]);
//                     } else {
//                         this.diagnostics.push(new Diagnostic(
//                             new Range(new Position(i, textOffset), new Position(i, line.text.length - 1)),
//                             `Variable declaration syntax error. Only allowed 'global' and 'presist' keyword.`,
//                             DiagnosticSeverity.Error
//                         ));
//                     }
//                 }
//             }
//         });
//     }
// }

// class GIMIProject {
//     root: Uri;
//     files: GIMIFile[] = [];
//     sections:  Map<string, GIMISection> = new Map<string, GIMISection>();
//     constructor(root: Uri) {
//         this.root = root;
//     }
// }

// export class GIMIWorkspace {

//     private static projects: GIMIProject[] = [];
    
//     private static singleFiles: GIMIFile[] = [];

//     static checkFile(uri: Uri): boolean {
//         return GIMIRule.extNameList.includes(path.extname(uri.fsPath))
//     }

//     static addFile(uri: Uri): boolean {
//         if (!this.checkFile(uri)) {
//             return false;
//         }
//         const workspacePath = workspace.getWorkspaceFolder(uri);
//         if (!workspacePath) {
//             this.singleFiles.push(new GIMIFile(uri));
//             return true;
//         }
//         let targetProject = this.findProject(workspacePath.uri);

//         if (!targetProject) {
//             this.addProject(workspacePath.uri);
//             targetProject = this.findProject(workspacePath.uri);
//         }
//         if (targetProject) {
//             targetProject.files.push(new GIMIFile(uri));
//             return true;
//         }
//         return false;
//     }

//     static addProject(root: Uri): boolean {
//         if (this.findProject(root)) {
//             return false;
//         } else {
//             this.projects.push(new GIMIProject(root));
//             return true;
//         }
//     }

//     static findProject(root: Uri): GIMIProject | undefined {
//         return this.projects.find(project => {
//             return project.root.fsPath === root.fsPath;
//         })
//     }

//     static findFile(uri: Uri): GIMIFile | undefined {
//         const workspacePath = workspace.getWorkspaceFolder(uri);
//         if (!workspacePath) {
//             return this.singleFiles.find(file => {
//                 return file.uri.fsPath === uri.fsPath;
//             })
//         } else {
//             return this.findProject(workspacePath.uri)?.files.find(file => {
//                 return file.uri.fsPath === uri.fsPath;
//             });
//         }
//     }

//     static getProjectFiles(folder: Uri): GIMIFile[] | undefined {
//         return this.findProject(folder)?.files;
//     }

//     static updateFile(uri: Uri) {
//         this.findFile(uri)?.updateContent();
//     }
// }

export function isDocumenOpen(uri: Uri): boolean {
    for (const document of workspace.textDocuments) {
        if (document.uri.fsPath === uri.fsPath) {
            return true;
        }
    }
    return false;
}

export async function getDocumentByUr(uri: Uri): Promise<TextDocument> {
    const openedDocument = workspace.textDocuments.find(document => {
        document.uri.fsPath === uri.fsPath;
    })
    if (openedDocument) {
        return openedDocument;
    } else {
        return await workspace.openTextDocument(uri);
    }
}

function extractLineDetails(line: TextLine): {line: TextLine, text: string, textOffset: number} {
    const text = line.text.trim();
    const textOffset = line.text.length - text.length;
    return { line, text, textOffset };
}

export function setTextDecorations(editor: TextEditor) {
    const colors = ['#C586C0', '#DAE026', '#4FC1FF'];
    const ranges: Range[][] = new Array(colors.length).fill(null).map(() => []);
    const document = editor.document;
    let ifelBlockPosL: number[] = [];
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text.trim().toLowerCase();
        const textOffset = line.text.length - text.length;
        if (text.startsWith('i') || text.startsWith('e')) {
            let match = /^(if)/i.exec(text);
            if (match) {
                ifelBlockPosL.push(i);
                const start = new Position(i, match.index + textOffset);
                const end = start.translate(0, match[1].length);
                ranges[ifelBlockPosL.length % colors.length].push(new Range(start, end));
                continue;
            }
            match = /^(else(?: +if)?|elif)/i.exec(text);
            if (match) {
                const start = new Position(i, match.index + textOffset);
                const end = start.translate(0, match[1].length);
                ranges[ifelBlockPosL.length % colors.length].push(new Range(start, end));
                continue;
            }
            match = /^(endif)/i.exec(text);
            if (match) {
                const start = new Position(i, match.index + textOffset);
                const end = start.translate(0, match[1].length);
                ranges[ifelBlockPosL.length % colors.length].push(new Range(start, end));
                ifelBlockPosL.pop();
                continue;
            }
        }
    }
    ranges.forEach((subRanges, index) => {
        const decorationType = window.createTextEditorDecorationType({
            color: colors[index],
            // backgroundColor: 'rgba(255,0,0,0.3)'
        })    
        editor.setDecorations(decorationType, subRanges);
    })
}

export class GIMIIfElseBlockHighlight {
    static decorations: any[] = [];
    static update(editor: TextEditor, position: Position) {
        if (this.decorations.length > 0) {
            this.clear(editor);
        }
        const document = editor.document;
        const posiL = position.line;
        let startL = -1
        for (let i = posiL; i > posiL - 50; i--) {
            const line = document.lineAt(i);
            const text = line.text.trim().toLowerCase();
            if (text.startsWith('if')) {
                startL = i;
                break;
            }
        }
        if (startL === -1) {
            return;
        }
        let ifElseBlockRange = undefined;
        const ifElseBlockLs: number[] = [];
        for (let i = posiL; i < posiL + 50; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim().toLowerCase();
            if (text.startsWith('if')) {
                ifElseBlockLs.push(i);
                continue;
            }
            if (text.startsWith('else') || text.startsWith('endif')) {
                ifElseBlockLs.pop();
                if (ifElseBlockLs.length === 0) {
                    ifElseBlockRange = new Range(new Position(startL, 0), new Position(i, 0));
                    break;
                }
            }
        }
        if (!ifElseBlockRange) {
            return;
        }
        const decorationType = window.createTextEditorDecorationType({
            // border: '2px solid #FF0000',
            // borderRadius: '4px',
            isWholeLine: true,
            backgroundColor: '#BC8F8F33'
        })
        this.decorations.push(decorationType)
        editor.setDecorations(decorationType, [ifElseBlockRange]);
    }

    static clear(editor: TextEditor) {
        this.decorations.forEach(decoration => {
            editor.setDecorations(decoration, [])
        })
        this.decorations.length = 0;
    }
}

/**
 * check target item does exist or not.
 * @param target full path of target folder or file
 * @param current full path of current folder or file
 */
export async function checkRelativePathIsExist(target: string, current: Uri | string): Promise<boolean> {
    if (current instanceof Uri) {
        current = current.fsPath;
    }
    const currentFolderPath: string = (() => {
        if (path.basename(current).includes('.')) {
            return path.dirname(current)
        }
        return current;
    })();
    const targetRelativePath = path.normalize(target);
    // const nextFolder = targetRelativePath.split(path.sep)[0];
    // const nextFolderPath = path.join(currentFolderPath, nextFolder);
    // workspace.fs.stat(Uri.file(nextFolderPath)).then(
    //     () => undefined,
    //     () => {                    
    //         console.log('folder is not found');
    //     }
    // );
    const targetPath = path.join(currentFolderPath, targetRelativePath);
    try {
        await workspace.fs.stat(Uri.file(targetPath));
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Not use now
 * A function to parsing variables under the 'Constants' section of the current document
 */
export function parseDocumentVariables(document: TextDocument): string[] {
    let variables: string[] = [];
    let inConstants = false;
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        const matchs = /^\[(.*)\]/i.exec(line);
        if (matchs) {
            if (matchs[1].toLowerCase() == 'Constants'.toLowerCase()) {
                inConstants = true;
            } else if (inConstants) {
                // inConstants = false;
                break;
            }
        }
        // ^(?:persist +)?(?:global)(?: +persist)? +(\$[a-z_\][\w\\]*\b) -- i
        if (inConstants && line.includes('global')) {
            const catchs = /(\$[a-z_\][\w\\]*)\b/i.exec(line);
            if (catchs) {
                variables.push(catchs[1])
            }
        }
    }
    return variables;
}

export class Timer {
    private startTime: number = NaN;
    private prefix: string = ' = Timer: ';
    private enableMsg: boolean = true;

    constructor(prefix?: string, noStartEndMsg?: boolean, manualStart?: boolean) {
        prefix !== undefined ? this.prefix = prefix : undefined;
        noStartEndMsg !== undefined ? this.enableMsg = !noStartEndMsg : undefined;
        if (!manualStart) {
            this.start();
        }
    }
    
    /**
     * Return true if successful set start time, otherwise.
     */
    start(): boolean {
        if (Number.isNaN(this.startTime)) {
            this.startTime = performance.now();
            this.enableMsg ? console.log(`${this.prefix}Start timer -> ${this.startTime}`) : undefined;
            return true;
        }
        return false;
    }

    /**
     * Return true if successful re-start time, otherwise.
     */
    restart(): boolean {
        if (Number.isNaN(this.startTime)) {
            return false;
        }
        this.startTime = performance.now();
        return true;
    }
    
    end(print: boolean = true): number {
        if (Number.isNaN(this.startTime)) {
            print ? console.log(`${this.prefix}Not start yet.`) : undefined;
            return 0;
        }
        const endTime = performance.now()
        const timespand = endTime - this.startTime;
        if (print) {
            this.enableMsg ? console.log(`${this.prefix}End timer -> ${endTime}`) : undefined;
            console.log(`${this.prefix}Timespand -> ${timespand.toFixed(4).slice(0, -1)} ms`)
        }
        return timespand;
    }

    reset(): boolean {
        this.startTime = NaN;
        return true;
    }
}