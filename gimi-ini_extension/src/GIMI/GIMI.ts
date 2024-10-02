import { Range, Uri, workspace } from "vscode";
import * as pathUtil from "path";
import { AsNumber, Indices, Expand } from "../TSutil"
import { LowString, GIMIString, encodeToGIMIString } from "./GIMIString"
import { GIMIUnit } from "./GIMIUnit";
import { GIMIVariable } from "./GIMIVariable";
import { GIMIWorkspace } from "./GIMIWorkspace";
import { GIMIProject } from "./GIMIProject";
import { GIMIFile } from "./GIMIFile";
import { AllSections, AllSectionsKeys, parseSectionTypeInfo, SectionType } from "./GIMISectionTitle";

/**
 * Follow URL rules.
 * Unknown, empty or undefined situations are all replaced by 'undefined'.
 * All input values will be translated.
 * 
 * ```i
 * project:/d:/project%20path/foldder
 * └──┬──┘ └──────────┬───────────┘
 * unitType          path
 * 
 * file:/d:/project%20foldder/path/file.ini
 * └┬─┘ └────────────────┬──────────────┘
 * unitType             path
 * 
 * variable:/d:/p/f.ini:commandlisttexturea.0/$localvar
 * └──┬───┘ └────┬────┘ └─────────┬─────────┘ └───┬───┘
 * unitType     path           section          g_var
 * 
 * variable:/d:/p/f.ini:$localvar
 * └──┬───┘ └────┬────┘ └───┬───┘
 * unitType     path      g_var
 * ```
 */
export type GIMIIdentifier = GIMIString;

/**
 * type `undefined` for any undefined type
 */
export enum GIMIUnitType {
    undefined = -1,
    project,
    file,
    section,
    variable
}

type GIMIUriSectionT = {
    readonly fullName: LowString,
    readonly type: SectionType,
}

/**
 * Invoke in INI: `CommandList\some\path\of\file.ini\ChangeTexture.0`
 * 
 * Invoke with namespace in INI: `CommandList\name\space\of\ChangeTexture.0`
 * 
 * Section name in INI: `CommandListcmdsChangeTexture.0`
 * 
 * Interial identifier: `section://some path/of/file.ini#commandlistcmdschangetexture.0`
 * 
 * @see {@link GIMIIdentifier}
 */
export class GIMIUri {
    /**
     * See {@link GIMIUnitType UnitType}, Used to assist in determining whether the uri conforms to the format.
     * 
     * Or when call {@link GIMIUri.toIdentifier toIdentifier}, this will using if not get specify type parameter. 
     */
    readonly unitType: GIMIUnitType;
    /**
     * file/folder based path, can directly use {@link Uri Uri} for conversion.
     * 
     * if is {@link GIMIUnitType.project Project} type, should been a folder
     * 
     * `/d:/some/project/root`
     * 
     * if is {@link GIMIUnitType.file File} type, should been a file
     * 
     * `/d:/some/path/of/file.ini`
     */
    readonly path: LowString;
    /**
     * if not get ref project, then wil undefiend
     * 
     * `name\space\of` of `CommandList\name\space\of\Example.0`
     */
    readonly namespace: LowString;
    /**
     * object of section info, if {@link GIMIUri.section.type} is undefined mean this section maybe is errored
     * 
     * name: of section without section prefix,
     * 
     * `example.0` of `CommandListExample.0`
     * 
     * `example.1` of `CommandList\some\namespace\Example.1`
     * 
     * `commandlist` {@link Section} of `CommandListExample.0`
     * 
     * `TextureOverride` {@link Section} of `TextureOverride\some\namespace\Example.1`
     */
    readonly section?: GIMIUriSectionT
    /**
     * global variable work at the same level as section
     * so if have global variable, section will always be ignored
     */
    readonly globalVariable?: LowString;

    constructor({type, path, namespace, section, globalVariable}:
        {type: GIMIUnitType, path: LowString, namespace?: LowString, section?: GIMIUriSectionT, globalVariable?: LowString}
    ) {
        this.unitType = GIMIUnitType[type] === undefined ? GIMIUnitType.undefined : type;
        // this.name = name;
        this.path = (() => {
            let _p = path.raw;
            if (_p.startsWith('/')) {
                _p = '/' + _p; 
            }
            if (_p.endsWith('/')) {
                _p = _p.slice(0, -1)
            }
            return LowString.build(_p);
        })();
        this.namespace = namespace ? namespace : new LowString('');
        this.section = section;
        this.globalVariable = globalVariable;
        if (this.unitType !== GIMIUnitType.section && this.section) {
            throw Error('GIMIUri ERROR! not a section type but found a section definition.');
        } else if (this.unitType === GIMIUnitType.section && !this.section) {
            throw Error('GIMIUri ERROR! is a section type but not have section definition.');
        }
    }

    /**
     * `CommandListExample.0`
     */
    static iniSectionName(fullName: string, documentUri: Uri): GIMIUri {
        const path = LowString.build(documentUri.path);
        const _fn = LowString.build(fullName);
        const _st = parseSectionTypeInfo(_fn.enc);
        const section: GIMIUriSectionT = { type: _st.type, fullName: _fn };
        const file = GIMIWorkspace.findFile(documentUri);
        const namespace = file?.namespace && new LowString(file.namespace);
        return new GIMIUri({type: GIMIUnitType.section, path, section, namespace});
    }

    /**
     * automatically determine which type of invoke function should be used.
     * 
     * Recognized format:
     * 
     * `Local Resource.dds`
     * 
     * `.\Local Resource.dds`
     * 
     * `typeA\Resource.dds`
     * 
     * `.\typeA\Resource.dds`
     * 
     * `$swapvar`
     * 
     * `$\name\space\of\swapvar`
     * 
     * `$\name\some\path\of\file.ini\swapvar`  **really? file call?**
     * 
     * `SectionType\name_space\BaseName.0`
     * 
     * `CommandList\name\space\of\ChangeTexture.0`
     * 
     * `CommandList\some\path\of\file.ini\ChangeTexture.0` **seriously? file call again? WT...**
     */
    static iniInvoke(invoke: string, documentUri: Uri, refProject?: GIMIProject): GIMIUri {
        if (invoke.startsWith('$')) {
            // 變數調用或變數本身
            return GIMIUri.iniVariableInvoke(invoke, documentUri, refProject);
        } else if (invoke.startsWith('.')) {
            // 文件調用
            return GIMIUri.iniFileInvoke(invoke, documentUri, refProject)
        }
        const invokeParts = invoke.split('\\');
        if (invokeParts.length === 1) {
            // 同資料夾文件調用
            return GIMIUri.iniFileInvoke(invoke, documentUri, refProject)
        } else if (invokeParts.length === 2) {
            // 是文件調用
            return GIMIUri.iniFileInvoke(invoke, documentUri, refProject)
        } else {
            const section = parseSectionTypeInfo(LowString.build(invokeParts[0]).enc);
            if (section) {
                // section 調用
                return GIMIUri.iniSectionInvoke(invoke, section.type, refProject)
            } else {
                // 文件調用
                return GIMIUri.iniFileInvoke(invoke, documentUri, refProject)
            }
        }
    }

    /**
     * section invoke. commonly used for util ini (like `help.ini`, `debug_cb.ini`, `ORfix.ini`)
     * 
     * `CommandList\some\path\of\file.ini\ChangeTexture.0`  **EPIC** No One Will Write Like That.
     * 
     * `CommandList\name\space\of\ChangeTexture.0`
     */
    static iniSectionInvoke(invoke: string, sectieType: SectionType, refProject?: GIMIProject): GIMIUri {
        const invokeParts = LowString.build(invoke).split('\\', 'raw')
        if (invokeParts.length <= 2) {
            throw new Error(`iniSectionInvoke() ERROR! invoke parts lenght should not less than 3.\n\t  -> ${invoke}`);            
        }
        const section: GIMIUriSectionT = {
            fullName: LowString.combine([invokeParts[0], invokeParts.at(-1)!], ''),
            type: sectieType
        }
        // if (!section.type) {
        //     throw new Error(`iniSectionInvoke() ERROR! section should not been empyt.\n\t  -> ${invoke}`);
        // }
        const path = LowString.combine(invokeParts.slice(1, -1), '\\');
        const file = refProject?.findFileFromNamespace(path.enc);
        const namespace = file?.namespace && new LowString(file.namespace);
        return new GIMIUri({type: GIMIUnitType.section, path, section, namespace});
    }

    /**
     * variable invoke
     * 
     * `$\name\some\path\of\file.ini\swapvar`  **EPIC** No One Will Write Like That.
     * 
     * `$\name\space\of\swapvar`
     */
    static iniVariableInvoke(invoke: string, documentUri: Uri, refProject?: GIMIProject): GIMIUri {
        if (!invoke.startsWith('$')) {
            throw new Error(`iniVariableInvoke() ERROR! input does not have corrent prefix (starts with $).\n\t  -> ${invoke}`);
        }
        const invokeParts = LowString.build(invoke).split('\\', 'raw')
        if (invokeParts.length <= 2) {
            throw new Error(`iniVariableInvoke() ERROR! invoke parts lenght should not less than 3.\n\t  -> ${invoke}`);            
        }
        const path = LowString.combine(invokeParts.slice(1, -1), '\\');
        const file = refProject?.findFileFromNamespace(path.enc);
        const namespace = file?.namespace && new LowString(file.namespace);
        return new GIMIUri({type: GIMIUnitType.variable, path, namespace});
    }

    /**
     * Named for file invoke, but more commonly used for resource invoke
     * 
     * `.\207 normal top3 noskirt stocking pants shoes notails\TingyunB.ib`
     */
    static iniFileInvoke(invoke: string, documentUri: Uri, refProject?: GIMIProject): GIMIUri {
        if (!pathUtil.extname(invoke)) {
            throw new Error(`iniFileInvoke() ERROR! input does not have corrent extname (missing extname).\n\t  -> ${invoke}`);
        }
        const targetUri = Uri.joinPath(documentUri, invoke)
        const path = LowString.build(targetUri.path);
        return new GIMIUri({type: GIMIUnitType.file, path});
    }

    /**
     * See {@link GIMIIdentifier}
     */
    static identifier(id: GIMIIdentifier): GIMIUri {
        const idParts = id.split(':');
        if (idParts.length <= 2) {
            throw new Error(`identifier() ERROR! lenght of idParts less than 3.\n\t  -> ${id}`);
        }
        const typeStr = idParts[0], pathStr = idParts.slice(1,3).join(':'), detailStr = idParts[3];
        const type = GIMIRule.unitTypeFromString(typeStr);
        const path = LowString.build(pathStr);
        let section: GIMIUriSectionT | undefined;
        let globalVariable: LowString | undefined;
        const file = GIMIWorkspace.findFile(Uri.file(pathStr))
        const namespace = file?.namespace && new LowString(file.namespace);
        if (detailStr) {
            if (detailStr.startsWith('$')) {
                // 是 global 變數
                globalVariable = LowString.build(detailStr);
                section = undefined;
            } else {
                const detailParts = detailStr.split('/');
                const sectionType = parseSectionTypeInfo(detailParts[0] as GIMIString).type;
                if (!section) {
                    // 未註冊的 section 名稱
                    section = { fullName: LowString.build(detailStr), type: undefined }
                } else if (detailParts[1] && detailParts[1].startsWith('$')) {
                    // section 內的變數
                    section = { fullName: LowString.build(detailParts[1]), type: sectionType }
                } else {
                    throw new Error(`identifier() ERROR! unknown identifier format.\n\t  -> ${id}`);
                }
            }
        }
        return new GIMIUri({type, path, section, namespace, globalVariable});
    }

    /**
     * if uri not has workspaceFolder, also been a file type
     * 
     * if uri has workspace, will check if extname is exist then file type else project type
     * `extname ? file : project`
     * 
     */
    static uri(rawUri: Uri, unitType?: GIMIUnitType): GIMIUri {
        let type: GIMIUnitType;
        if (unitType !== undefined) {
            type = unitType
        } else {
            const workspaceFolder = workspace.getWorkspaceFolder(rawUri);
            const extname = pathUtil.extname(rawUri.path)
            if (workspaceFolder) {
                type = extname ? GIMIUnitType.file : GIMIUnitType.project;
            } else {
                type = GIMIUnitType.file
            }
        }
        const path = LowString.build(rawUri.path);
        const file = GIMIWorkspace.findFile(rawUri);
        const namespace = file?.namespace && new LowString(file.namespace);
        return new GIMIUri({type, path, namespace});
    }

    with(change: {type?: GIMIUnitType, path?: LowString, section?: GIMIUriSectionT, namespace?: LowString, globalVariable?: LowString}): GIMIUri {
        return new GIMIUri({
            type: change.type ?? this.unitType,
            path: change.path ?? this.path,
            section: change.section ?? this.section,
            namespace: change.namespace ?? this.namespace,
            globalVariable: change.globalVariable ?? this.globalVariable
        });
    }

    toIdentifier(specifyUnitType?: GIMIUnitType): GIMIIdentifier {
        const _spfType = specifyUnitType ?? this.unitType;
        if ([GIMIUnitType.file, GIMIUnitType.project].includes(_spfType)) {
            return `${GIMIUnitType[_spfType]}:${this.path}` as GIMIIdentifier
        } else if (_spfType === GIMIUnitType.section) {
            return `${GIMIUnitType[_spfType]}:${this.path}:${this.section}` as GIMIIdentifier
        } else if (_spfType === GIMIUnitType.variable) {
            // if (!this.section || ['Constants', undefined].includes(this.section.type)) {
            if (!this.section || this.section.type === undefined || this.section.type === "Constants") {
                return `${GIMIUnitType[_spfType]}:${this.path}:${this.globalVariable}` as GIMIIdentifier
            }
            return `${GIMIUnitType[_spfType]}:${this.path}:${this.section}/${this.globalVariable}` as GIMIIdentifier
        } else {
            return `${GIMIUnitType[_spfType]}:${this.path}:${this.section}/${this.globalVariable}` as GIMIIdentifier
        }
    }

}

export class GIMIRule {
    static readonly SEPARATOR_UNITTYPE = ':';
    static readonly SEPARATOR_INVOKE = '\\';
    static readonly SEPARATOR_ATTACHINFO = '#';
    static readonly EXTNAME_INI: string = '.ini';
    static readonly EXTNAME_RESOURCE: string[] = ['.dds', '.jpg', '.buf', '.ib'];
    private static unitToString = {
        [GIMIUnitType.undefined]: 'undefined',
        [GIMIUnitType.project]: 'project',
        [GIMIUnitType.file]: 'file',
        [GIMIUnitType.section]: 'section',
        [GIMIUnitType.variable]: 'variable'
    }
    private static stringToUnit = Object.entries(this.unitToString).reduce((acc, [key, value]) => {
        acc[value] = Number(key);
        return acc;
    }, {} as { [key: string]: GIMIUnitType });

    static stringFromUnitType(prefixType: GIMIUnitType): string {
        const str = this.unitToString[prefixType];
        return str !== undefined ? str : this.unitToString[GIMIUnitType.undefined];
    }
    static unitTypeFromString(str: string): GIMIUnitType {
        const type = this.stringToUnit[str];
        return type !== undefined ? type : GIMIUnitType.undefined;
    }
}