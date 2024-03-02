import path from 'path';
import { performance } from 'perf_hooks'
import { Diagnostic, Position, Range, TextDocument, Uri, workspace } from 'vscode'


export class GIMIConfiguration {
    static parseingAllowedMaximumLines: number;
    static parseingAllowedMaximumCharacters: number;
    static parseingDebounceInterval: number;
}

export class GIMIRule {
    static readonly sectionNamespace = {
        variable: '$',
        constants: 'Constants',
        present: 'Present',
        key: 'Key',
        commandList: 'CommandList',
        textureOverride: 'TextureOverride',
        shaderOverride: 'ShaderOverride',
        shaderRegex: 'ShaderRegex',
        customShader: 'CustomShader',
        resource: 'Resource'
    }

    static getSectionNamespaces(): string[] {
        return Object.values(this.sectionNamespace);
    }

    static getSectionNamespaceRegexStyle(): string {
        return this.getSectionNamespaces().join('|');
    }
}

enum GIMISectionType {
    variable,

}

class GIMISection {
    range: Range;
    name: string;
    ifelBlock: {
        startLine: number,
        endLine: number
    }[] = [];

    constructor(range: Range, name: string, initSource?: string[] | TextDocument) {
        this.range = range;
        this.name = name;
        if (!initSource) {
            return;
        }
        const linePoints: number[] = [];
        if (Array.isArray(initSource)) {
            linePoints.push(...GIMISection.parseByLines(initSource, range.start.line));
        } else if (typeof initSource?.fileName === 'string' && typeof initSource?.getText === 'function') {
            const lines = (initSource as TextDocument).getText(this.range).split('\n');
            linePoints.push(...GIMISection.parseByLines(lines, range.start.line))
        }
        for (let i = 0; i < linePoints.length; i += 2) {
            if (linePoints[i + 1]) {
                this.ifelBlock.push({startLine: linePoints[i], endLine: linePoints[i + 1]});
            }
        }
    }

    static parseByLines(lines: string[], offsetLine: number = 0): number[] {
        let ifelBlockPosL: number[] = [];
        let _r: number[] = [];
        for (let i = offsetLine; i < lines.length + offsetLine; i++) {
            const text = lines[i].trim().toLowerCase();
            if (text.length === 0) {
                continue;
            }
            // not use at now, this is a .trim() cuted count.
            const lineOffset = lines[i].length - text.length;
            if (text.startsWith('if')) {
                ifelBlockPosL.push(i);
            } else if (text.startsWith('else') || text.startsWith('elif')) {
                let start = ifelBlockPosL.pop();
                if (start !== undefined) {
                    _r.push(start, i);
                }
                ifelBlockPosL.push(i);
            } else if (text.startsWith('endif')) {
                let start = ifelBlockPosL.pop();
                if (start !== undefined) {
                    _r.push(start, i);
                }
            }
        }
        return _r;
    }

    updateContent(lines: string[], offsetLine?: number) {
        GIMISection.parseByLines(lines, offsetLine);
    }
}

class GIMIFile {
    uri: Uri;
    
    namespace: string;

    gimiNamespace?: string;

    isDisabled?: boolean;

    variales: string[] = [];
    
    diagnostics: Diagnostic[] = [];

    private sections: GIMISection[] = [];

    private separators: number[] = [];

    constructor(uri: Uri) {
        this.uri = uri;
        const basename = path.basename(this.uri.fsPath);
        basename.toLowerCase().startsWith('disabled') ? this.isDisabled = true : undefined;

        const fileRelativePath = workspace.asRelativePath(this.uri, true);
        if (fileRelativePath !== this.uri.fsPath) {
            this.namespace = `${fileRelativePath}`;
        } else {
            this.namespace = basename;
        }
        this.updateContent();
    }

    /**
     * For now, return always include namespace (not GIMI one!).
     * @param includeNamespace Not use now
     * @param changeToGIMINamespace Not use now
     */
    getSectionsIdentifier(includeNamespace?: boolean, changeToGIMINamespace?: boolean): string[] {
        let _r: string[] = [];
        this.sections.forEach(section => {
            _r.push(`${this.namespace}#${section}`);
        })
        return _r;
    }

    getSections(): GIMISection[] {
        return this.sections;
    }

    getSeparators(): number[] {
        return this.separators;
    }

    async updateContent() {
        const document = await workspace.openTextDocument(this.uri);
        this._parseSections(document);
        this._parseVariables(document);
    }
    
    async printVariables() {
        const document = await workspace.openTextDocument(this.uri);
        this._parseVariables(document);
    }

    private _parseIfelBlocksByLines(lines: string[]): {start: number, end: number}[] {
        const _r: {start: number, end: number}[] = [];
        for (const line of lines) {
            
        }
        return _r;
    }

    // last section will error, lost endline enter.
    private _parseSections(document: TextDocument): GIMISection[] | undefined {
        // const timer: Timer = new Timer(`pars ${path.basename(document.uri.fsPath)}: `, true);
        this.sections = [];
        const _r: GIMISection[] = [];
        let lastSectionInfo: {line: number, name: string} = {line: -1, name: ''}
        let commentPartPointLine: number[] = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;
            if (text.includes('--------') && text.trim().startsWith(';')) {
                if (document.lineAt(i - 1).isEmptyOrWhitespace && document.lineAt(i + 1).isEmptyOrWhitespace) {                    
                    commentPartPointLine.push(i);
                }
                continue;
            }
            if (this.sections.length === 0 && !this.gimiNamespace) {
                const match = /namespace *\= *([\w\\\.]+)/i.exec(text);
                this.gimiNamespace = match?.[1];
                continue;
            }
            const matchs = /^\[(.+)\]/.exec(text);
            if (matchs && matchs[1]) {
                if (lastSectionInfo.line === -1) {
                    lastSectionInfo = {line: i, name: matchs[1]};
                    continue;
                }
                let endPosL = i;
                let endPosC = line.text.length;
                for (let j = i - 1; j > lastSectionInfo.line; j--) {
                    const backLine = document.lineAt(j);
                    endPosL = j;
                    endPosC = backLine.text.length;
                    if (backLine.isEmptyOrWhitespace || backLine.text.includes('--------')) {
                        continue;
                    } else if (!backLine.text.trim().startsWith(';')) {
                        break;
                    }
                    if (document.lineAt(j + 1).isEmptyOrWhitespace) {
                        break;
                    }
                }
                const range = new Range(new Position(lastSectionInfo.line, 0),new Position(endPosL, endPosC))
                const section = new GIMISection(range, lastSectionInfo.name);
                let ifelBlockPosL: number[] = [];
                const content = document.getText(range).split('\n')
                for (let j = lastSectionInfo.line; j <= endPosL; j++) {
                    const content = document.lineAt(j).text.trim().toLowerCase();
                    if (content.startsWith('if')) {
                        ifelBlockPosL.push(j);
                    } else if (content.startsWith('else') || content.startsWith('elif')) {
                        let start = ifelBlockPosL.pop();
                        if (start !== undefined) {
                            section.ifelBlock.push({startLine: start, endLine: j - 1});
                        }
                        ifelBlockPosL.push(j);
                    } else if (content.startsWith('endif')) {
                        let start = ifelBlockPosL.pop();
                        if (start !== undefined) {
                            section.ifelBlock.push({startLine: start, endLine: j - 1});
                        }
                    }
                }
                _r.push(section);
                lastSectionInfo = {line: i, name: matchs[1]};
                for (const point of commentPartPointLine) {
                    if (_r.at(-1)?.range.contains(new Position(point, 1))) {
                        commentPartPointLine.pop();
                        continue;
                    } else {
                        break;
                    }
                }
            }
        }
        this.sections.push(..._r);
        this.separators = [];
        this.separators.push(...commentPartPointLine);
        // timer.end();
        return;
    }

    // for now we will may lost secened+ 'constants' section, need more work
    private _parseVariables(document: TextDocument) {
        this.variales.length = 0;
        for (const section of this.sections) {
            if (section.name.toLowerCase().includes('constants')) {
                let startLine = section.range.start.line;
                let endLine = section.range.end.line;
                for (let i = startLine; i <= endLine; i++) {
                    const line = document.lineAt(i);
                    const text = line.text.toLowerCase();
                    if (line.isEmptyOrWhitespace || text.includes('\\') || !text.includes('$')) {
                        continue;
                    }
                    const matchs = /^global(?: +persist)? +(\$[\w]+)/i.exec(text);
                    if (matchs && matchs[1]) {
                        // console.log(matchs);
                        this.variales.push(matchs[1]);
                    }
                }
                break;
            }
        }
    }
}

export class GIMIWorkspace {
    
    private static projectFiles: GIMIFile[] = [];
    
    private static singleFiles: GIMIFile[] = [];

    static extNameList: string[] = ['.ini'];

    static checkFile(uri: Uri): boolean {
        if (this.extNameList.includes(path.extname(uri.fsPath))) {
            return true;
        }
        return false;
    }

    static addCheckProjectFile(uri: Uri): boolean {
        if (this.findFile(uri)) {
            return false;
        } else {
            this.projectFiles.push(new GIMIFile(uri));
            console.log(` - added project file '${path.basename(uri.fsPath)}'`)
            return true;
        }
    }

    static addProjectFile(uri: Uri): boolean {
        if (this.checkFile(uri)) {
            return this.addCheckProjectFile(uri);
        } else {
            return false;
        }
    }

    static addCheckSingleFile(uri: Uri): boolean {
        if (this.findFile(uri)) {
            return false;
        } else {
            this.singleFiles.push(new GIMIFile(uri));
            console.log(` - added single file '${path.basename(uri.fsPath)}'`)
            return true;
        }
    }

    static addSingleFile(uri: Uri): boolean {
        if (this.checkFile(uri)) {
            return this.addCheckSingleFile(uri);
        } else {
            return false;
        }
    }

    static addFile(uri: Uri): boolean {
        if (workspace.getWorkspaceFolder(uri)) {
            return this.addProjectFile(uri);
        } else {
            return this.addSingleFile(uri);
        }
    }

    static addCheckFile(uri: Uri): boolean {
        if (workspace.getWorkspaceFolder(uri)) {
            return this.addCheckProjectFile(uri);
        } else {
            return this.addCheckSingleFile(uri);
        }
    }

    static findFileInProject(uri: Uri): GIMIFile | undefined {
        for (const file of this.projectFiles) {
            if (file.uri.fsPath == uri.fsPath) {
                return file;
            }
        }
        return undefined;
    }

    static findFileInSingle(uri: Uri): GIMIFile | undefined {
        for (const file of this.singleFiles) {
            if (file.uri.fsPath == uri.fsPath) {
                return file;
            }
        }
        return undefined;
    }

    static findFile(uri: Uri): GIMIFile | undefined {
        let file = this.findFileInProject(uri);
        if (file) {
            return file
        }
        file = this.findFileInSingle(uri);
        if (file) {
            return file;
        }
        return undefined;
    }

    static getProjectFiles(): GIMIFile[] {
        return this.projectFiles;
    }

    static updateFile(uri: Uri) {
        this.findFile(uri)?.updateContent();
    }
}

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