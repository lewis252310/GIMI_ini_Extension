import path from "path";
import { languages, TextDocument, Uri, workspace } from "vscode";
import { GIMIIdentifier, GIMIRule } from "./GIMI";
import { GIMIFile } from "./GIMIFile";
import { GIMIProject } from "./GIMIProject";

export class GIMIWorkspace {

    private static projects: GIMIProject[] = [];
    static readonly diagnosticCollection = languages.createDiagnosticCollection('gimi-ini');

    static print(msg: string): void {
        console.log(` >_ Workspace: ${msg}`)
    }
    /**
     * check uri have specify extname.
     * 
     * @see {@link GIMIRule.EXTNAME_INI}
     */
    static checkFile(uri: Uri): boolean {
        return path.extname(uri.fsPath) === GIMIRule.EXTNAME_INI
    }

    static listAllProjectsId(): GIMIIdentifier[] {
        return this.projects.map(project => project.GIMIuri.toIdentifier());
    }

    static listAllFilesId(): GIMIIdentifier[] {
        return this.projects.flatMap(_p => _p.listAllFilesId());
    }

    /**
     * Adds a file to a project, automatically creating the project if it does not exist.
     * Returns false if the file is a standalone file outside any workspace.
     */
    static addFile(document: TextDocument, toProject?: GIMIProject): GIMIFile | undefined {
        const uri = document.uri;
        if (!this.checkFile(uri)) {
            this.print(`addFile ${uri.fsPath} failed. not corrent extname.`)
            return undefined;
        } else if (this.findFile(uri)) {
            this.print(`addFile ${uri.fsPath} failed. current file already exists.`)
            return undefined;
        }
        let project = toProject ?? this.findProject(uri);
        if (!project) {
            const workspacePath = workspace.getWorkspaceFolder(uri);
            const projectUri = workspacePath ? workspacePath.uri : uri
            project = new GIMIProject(projectUri, !workspacePath);
            this.projects.push(project);
        } else if (project.isSingleFile && project.getExistFilesCount() > 0) {
            this.print(`addFile ${uri.fsPath} failed. this is a single file project.`)
            return undefined;
        }
        const start = performance.now();
        const file = new GIMIFile(document, project);
        const end = performance.now();
        console.log(`Timer _> file '${path.basename(uri.path)}' cost ${(end - start).toFixed(3)} ms.`)
        // const secs = file.sections.reduce((acc, item) => {
        //     const key = item.type ? AllSections[item.type] : 'undefined';
        //     if (!(key in acc)) {
        //         acc[key] = 1
        //     }
        //     acc[key] += 1;
        //     return acc
        // }, {} as {[x: string]: any})
        // console.log(secs);
        const state = project.addFile(file);
        this.print(`addFile ${uri.fsPath}\n - state: ${state}.`)
        return file;
    }

    static findFile(uri: Uri, atProject?: GIMIProject): GIMIFile | undefined {
        const usageProject = atProject ?? this.findProject(uri);
        return usageProject?.findFile(uri);
    }

    static removeFile(uri: Uri, atProject?: GIMIProject): boolean {
        const usageProject = atProject ?? this.findProject(uri);
        return !!usageProject?.removeFile(uri);
    }
    
    /**
     * add project instance
     */
    static addProject(project: GIMIProject): boolean {
        if (this.findProject(project.uri)) {
            return false;
        } else {
            this.projects.push(project);
            return true;
        }
    }

    /**
     * find belong project from uri.
     */
    static findProject(uri: Uri): GIMIProject | undefined {
        // if worksapce not found, back to input uri. because no worksapce item maybe a single file project
        const usageUri = workspace.getWorkspaceFolder(uri)?.uri ?? uri;        
        return this.projects.find(_p => {
            return _p.uri.fsPath === usageUri.fsPath;
        })
    }

    static removeProject(uri: Uri): boolean {
        const idxToRemove = this.projects.findIndex(project => project.uri.fsPath === uri.fsPath)
        if (idxToRemove) {
            this.projects.splice(idxToRemove, 1);
            return true
        }
        return false
    }

    static updateDiagnosticCollection(file: GIMIFile): boolean {
        this.diagnosticCollection.set(file.uri, file.getAllDiagnostics());
        return true;
    }
}
