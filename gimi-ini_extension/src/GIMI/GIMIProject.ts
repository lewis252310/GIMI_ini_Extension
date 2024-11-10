import { Range, TextDocument, TextDocumentContentChangeEvent, Uri, workspace } from "vscode";
import pathUtil from "path";
import { GIMIIdentifier, GIMIUri, GIMIRule, GIMIUnitType } from "./GIMI";
import { GIMIFile } from "./GIMIFile";
import { GIMISection } from "./GIMISection";
import { GIMIVariable } from "./GIMIVariable";
import { LowString, GIMIString } from "./GIMIString"

type PathNamespacePair = {
    readonly path: LowString,
    readonly namespace: LowString | undefined
}

export class GIMIProject {
    readonly uri: Uri;
    readonly GIMIuri: GIMIUri;
    readonly isSingleFile: boolean;
    readonly _files: Map<GIMIIdentifier, GIMIFile> = new Map<GIMIIdentifier, GIMIFile>();
    // readonly sections: Map<GIMIIdentifier, GIMISection> = new Map<GIMIIdentifier, GIMISection>();
    // readonly variables: Map<GIMIIdentifier, GIMIVariable> = new Map<GIMIIdentifier, GIMIVariable>();
    private readonly pathNamespacePair: Map<GIMIString, PathNamespacePair> = new Map<GIMIString, PathNamespacePair>();

    constructor(uri: Uri, isSingleFile?: boolean, GIMIuri?: GIMIUri) {
        this.uri = uri;
        if (isSingleFile && !pathUtil.extname(uri.path)) {
            throw Error('Porject build error. is single file but not found extname');
        } else if (!isSingleFile && pathUtil.extname(uri.path)) {
            throw Error('Porject build error. is not single file but found extname');
        }
        this.isSingleFile = Boolean(isSingleFile);
        this.GIMIuri = GIMIuri ?? GIMIUri.uri(uri, GIMIUnitType.project);
    }

    get files(): GIMIFile[] {
        return Array.from(this._files.values());
    }

    /**
     * project level based global variable
     */
    get variable(): GIMIVariable[] {
        return this.files.flatMap(_f => _f.globalVariables);
    }

    /**
     * get all existing namespaces.
     */
    get namespaces(): GIMIString[] {
        return this.files.reduce((acc, _f) => {
            if (_f.namespace) {
                acc.push(_f.namespace);
            }
            return acc;
        }, [] as GIMIString[]);
    }

    listAllFilesId(): GIMIIdentifier[] {
        return Array.from(this._files.keys());
    }
    /**
     * if is add a file type, please use {@link GIMIProject.addFile addFile} function
     */
    // addUnit(unit: GIMIUnit): boolean {
    //     const identifier = unit.GIMIuri.toIdentifier()
    //     if (this.getUnit(identifier)) {
    //         return false;
    //     }
    //     if (unit instanceof GIMIFile) {
    //         if (this.isSingleFile && this.files.size > 0) {
    //             // because singleFile project should just have 1 file.
    //             return false;
    //         }
    //         this.files.set(identifier, unit);
    //         return true;
    //     } else if (unit instanceof GIMISection) {
    //         this.sections.set(identifier, unit);
    //         return true;
    //     } else if (unit instanceof GIMIVariable) {
    //         this.variables.set(identifier, unit);
    //         return true;
    //     } else {
    //         throw Error('Not support Unit struck. need check internal code.');
    //     }
    // }
    // getUnit(identifier: GIMIIdentifier, withType?: ('file' | 'section' | 'variable')[]): GIMIUnit | undefined {
    //     const usageRange = withType ?? ['file', 'section', 'variable']
    //     let _r: GIMIUnit | undefined = undefined;
    //     if (!_r && usageRange.includes('file')) {
    //         _r = this.files.get(identifier)
    //     }
    //     if (!_r && usageRange.includes('section')) {
    //         this.sections.get(identifier)
    //     }
    //     if (!_r && usageRange.includes('variable')) {
    //         this.variables.get(identifier)
    //     }
    //     return _r;
    // }
    // removeUnit(identifier: GIMIIdentifier): boolean {
    //     return this.files.delete(identifier) || this.sections.delete(identifier) || this.variables.delete(identifier)
    // }
    // updateUnit(): boolean {
    //     return false;
    // }
    getExistFilesCount(): number {
        return this._files.size;
    }
    /**
     * a fast way to add file? i dont think soo. file is a base level in worksapce. so maybe should only add in project
     * anyway workspace can get project from uri
     */
    addFile(file: GIMIFile, overwrite: boolean = false): boolean {
        const uri = file.uri;
        const compPathStr = this.isSingleFile ? uri.path : workspace.getWorkspaceFolder(uri)?.uri.path;
        if (compPathStr !== this.uri.path) {
            // if not the same workspace, just do nothing.
            return false;            
        }
        if (this.isSingleFile && this._files.size > 0) {
            // for non-workspace project, more then 1 file is impossible
            return false;
        }
        if (!overwrite && this._files.has(file.name)) {
            return false;
        }
        this._files.set(file.name, file);

        // const namespace = file.GIMINamespace ? LowString.build(file.GIMINamespace) : undefined
        // this.setNamespacePathPair(LowString.build(uri.path), namespace);

        return true;
    }
    findFile(uri: Uri): GIMIFile | undefined {
        const name = LowString.build(pathUtil.basename(uri.path)).enc
        return this._files.get(name);
    }
    removeFile(uri: Uri): boolean {
        const name = LowString.build(pathUtil.basename(uri.path)).enc
        return this._files.delete(name);
    }

    findNamespaceFromUri(uri: Uri): GIMIString | undefined {
        return this.files.find(_f => {
            return _f.uri.path === uri.path;
        })?.namespace
    }
    findFileFromNamespace(namespace: GIMIString): GIMIFile | undefined {
        return this.files.find(_f => {
            return _f.namespace === namespace;
        })
    }
    /**
     * 
     * @param fromFile call from which file, will pass this file's variable
     */
    getGlobalVariableName(fromFile: Uri): string[] {
        const _r: string[] = [];
        this.files.forEach(file => {
            if (file.uri.path === fromFile.path) {
                return;
            } else if (file.namespace === undefined) {
                return;
            } else {
                file.globalVariables.forEach(gVar => {
                    _r.push(`\\${file.namespaceRaw}\\${gVar.rawName}`);
                })
            }
        })
        return _r;
    }

    // setNamespacePathPair(path: LowString, namespace: LowString | undefined): PathNamespacePair | undefined {
    //     if (path.enc === '') {
    //         throw Error('Path can\'t be empty string');
    //     } else if (!path.enc.endsWith(GIMIRule.EXTNAME_INI)) {
    //         throw Error('Path missing extname. Can\'t use.');
    //     } else if (path.enc === namespace?.enc) {
    //         throw Error('Path missing extname. Can\'t use.');
    //     }
    //     const pairInstance: PathNamespacePair = {path, namespace}
    //     this.pathNamespacePair.set(path.enc, pairInstance);
    //     if (namespace) {
    //         this.pathNamespacePair.set(namespace.enc, pairInstance);
    //     }
    //     return this.pathNamespacePair.get(path.enc)
    // }
    // getNamespacePathPair(input: GIMIString): PathNamespacePair | undefined {
    //     return this.pathNamespacePair.get(input);
    // }
    // updataNamespacePathPair(rawPair: PathNamespacePair, newPair: PathNamespacePair): PathNamespacePair | undefined {
    //     if (newPair.path.enc === '') {
    //         throw Error('Path can\'t be empty string');
    //     }
    //     const pairGet = this.pathNamespacePair.get(rawPair.path.enc);
    //     if (!pairGet) {
    //         throw Error(`rawPair.path '${rawPair.path.enc}' not found in data.`);
    //     } else if (rawPair.path.enc !== pairGet.path.enc || rawPair.namespace?.enc !== pairGet.namespace?.enc) {
    //         throw Error('rawPair and dataPair are not the same');
    //     }
    //     this.pathNamespacePair.delete(pairGet.path.enc);
    //     if (pairGet.namespace) {
    //         this.pathNamespacePair.delete(pairGet.namespace.enc);
    //     }
    //     return this.setNamespacePathPair(newPair.path, newPair.namespace);
    // }
    // deleteNamespacePathPair(input: GIMIString): boolean {
    //     const pair = this.getNamespacePathPair(input);
    //     if (!pair) {
    //         return false;
    //     }
    //     const deletePathKey = this.pathNamespacePair.delete(pair.path.enc);
    //     const deletenamespaceKey = pair.namespace ? this.pathNamespacePair.delete(pair.namespace.enc) : true;
    //     return deletePathKey && deletenamespaceKey;
    // }
    // getAncestorsOf(id: GIMIUri | GIMIIdentifier, limit?: number): GIMIUnit[] {
    //     id = typeof id === 'string' ? id : id.toIdentifier();
    //     limit = Math.min(limit || 16, 16);
    //     const _r: GIMIUnit[] = [];
    //     let currentUnit = this.getUnit(id);
    //     while (currentUnit && currentUnit.parent && _r.length < limit) {
    //         currentUnit = this.getUnit(currentUnit.parent);
    //         if (currentUnit) {
    //             _r.push(currentUnit);
    //         }
    //     }
    //     return _r;
    // }
    // getDescendantsOf(id: GIMIUri | GIMIIdentifier): GIMIUnit[] {
    //     return [];
    // }
    // getVariablesOf(id: GIMIUri | GIMIIdentifier): GIMIVariable[] {
    //     id = typeof id === 'string' ? id : id.toIdentifier();
    //     return this.getUnit(id)?.children?.filter(childId => GIMIRule.isVariable(childId))
    //         .map(variableId => this.getUnit(variableId))
    //         .filter((unit): unit is GIMIVariable => unit !== undefined) || [];
    // }
    // getParentSctionOf(id: GIMIUri | GIMIIdentifier): GIMISection | undefined {
    //     return this._findParentByCondition(id, unit => !!unit && unit instanceof GIMISection) as GIMISection;
    // }
    // getParentFileOf(id: GIMIUri | GIMIIdentifier): GIMIFile | undefined {
    //     return this._findParentByCondition(id, unit => !!unit && unit instanceof GIMIFile) as GIMIFile;
    // }
    // getParentIfElBlockOf(id: GIMIUnitDescriptor | string): GIMIIfElseBlock {
    //     return this._findParentByCondition(id, unit => !!unit && unit instanceof GIMIIfElseBlock) as GIMIIfElseBlock;
    // }
    // private _findParentByCondition(id: GIMIUri | GIMIIdentifier, condition: (unit: GIMIUnit | undefined) => boolean): GIMIUnit | undefined {
    //     id = typeof id === 'string' ? id : id.toIdentifier();
    //     let currenntUnit = this.getUnit(id);
    //     for (let i = 0; i < 16 && currenntUnit && currenntUnit.parent; i++) {
    //         currenntUnit = this.getUnit(currenntUnit.parent);
    //         if (condition(currenntUnit)) {
    //             return currenntUnit;
    //         }
    //     }
    //     return undefined;
    // }
}

