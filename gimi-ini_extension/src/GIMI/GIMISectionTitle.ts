import { encodeToGIMIString, GIMIString } from "./GIMIString";

/**另一種可能的設定格式? 但似乎就沒那麼明確了 */
// const SectionConfigs = {
//     CommandLists: [
//         {name: 'ShaderOverride', isPrefix: true},
//         {name: 'ShaderRegex', isPrefix: true},
//     ],
//     Regular: [
//         {name: 'Key', isPrefix: true},
//         {name: 'Preset', isPrefix: true},
//         {name: 'Include', isPrefix: true},
//     ],
//     AllowLinesWithoutEquals: [
//         {name: 'Profile', isPrefix: false},
//         {name: 'ShaderRegex', isPrefix: true}
//     ]
// } as const
// type AllSectionsKeys = {
//         [K in keyof typeof SectionConfigs]: (typeof SectionConfigs[K][number]['name'])
//     }[keyof typeof SectionConfigs];
// type CmdListSecsKeys = typeof SectionConfigs.CommandLists[number]['name'];


const CommandListSectionsConfig = [
	{name: 'ShaderOverride', isPrefix: true},
	{name: 'ShaderRegex', isPrefix: true},
	{name: 'TextureOverride', isPrefix: true},
	{name: 'CustomShader', isPrefix: true},
	{name: 'CommandList', isPrefix: true},
	{name: 'BuiltInCustomShader', isPrefix: true},
	{name: 'BuiltInCommandList', isPrefix: true},
	{name: 'Present', isPrefix: false},
	{name: 'ClearRenderTargetView', isPrefix: false},
	{name: 'ClearDepthStencilView', isPrefix: false},
	{name: 'ClearUnorderedAccessViewUint', isPrefix: false},
	{name: 'ClearUnorderedAccessViewFloat', isPrefix: false},
	{name: 'Constants', isPrefix: false}
] as const
type CmdListSecsKeys = typeof CommandListSectionsConfig[number]['name'];

const RegularSectionsConfig = [
	{name: 'Logging', isPrefix: false},
	{name: 'System', isPrefix: false},
	{name: 'Device', isPrefix: false},
	{name: 'Stereo', isPrefix: false},
	{name: 'Rendering', isPrefix: false},
	{name: 'Hunting', isPrefix: false},
	{name: 'Profile', isPrefix: false},
	{name: 'ConvergenceMap', isPrefix: false},
	{name: 'Resource', isPrefix: true},
	{name: 'Key', isPrefix: true},
	{name: 'Preset', isPrefix: true},
	{name: 'Include', isPrefix: true},
	{name: 'Loader', isPrefix: false}
] as const
type RegSecsKeys = typeof RegularSectionsConfig[number]['name'];

// const AllowLinesWithoutEqualsConfig = [
// 	{name: 'Profile', isPrefix: false},
// 	{name: 'ShaderRegex', isPrefix: true}
// ] as const
const AllowLinesWithoutEqualsConfig = [ 'Profile', 'ShaderRegex' ] as const
type NonINIComfSecsKeys = typeof AllowLinesWithoutEqualsConfig[number];

const AllSectionsConfig = [...CommandListSectionsConfig, ...RegularSectionsConfig] as const
type AllSectionsConfigT = typeof AllSectionsConfig;
export type AllSectionsKeys = AllSectionsConfigT[number]['name']
type AllSectionsConfigIdx = Exclude<keyof AllSectionsConfigT, keyof [] | symbol> extends `${infer N extends number}` ? N : never;
type LowerAllSectionsKeys = Lowercase<AllSectionsKeys>

type SectionRuleGroups = 'CommandList' | 'Regular' | 'AllowLinesWithoutEquals';

// const PrefixSectionsConfig = AllSectionsConfig.filter(_sec => {_sec.isPrefix})
// type PrefixSectionsKeys = Extract<AllSectionsConfigT[number], {isPrefix: true}>['name'];

// type AllSectionsMapping = {
//     [K in AllSectionsKeys]: {
//         [I in AllSectionsConfigIdx]: AllSectionsConfigT[I]['name'] extends K ? I : never
//     }[AllSectionsConfigIdx];
// };
// type CmdListSecsMapping = Pick<AllSectionsMapping, CmdListSecsKeys>;
// type RegSecsMapping = Pick<AllSectionsMapping, RegSecsKeys>;
// type NonINIComfSecsMapping = Pick<AllSectionsMapping, NonINIComfSecsKeys>;
// type PrefixSectionMapping = Pick<AllSectionsMapping, PrefixSectionsKeys>;

// type GenerateEnumT<T> = T & {
//     [K in keyof T as T[K] extends number ? T[K] : never]: K
// } & {
//     [x: string]: AllSectionsConfigIdx
// } & {
//     [x: number]: AllSectionsKeys
// }

export type SectionType = AllSectionsKeys | undefined;

type SectionDataT = {
    readonly name: LowerAllSectionsKeys;
    readonly raw: AllSectionsKeys;
    readonly isPrefix: boolean;
    readonly groups: SectionRuleGroups[]
}

type AllSectionsEnumT = {
    [K in AllSectionsKeys]: SectionDataT
};
// type AllSectionsEnumT = GenerateEnumT<AllSectionsMapping>;
// type AllSectionsEnumT = {
//     [K in AllSectionsKeys | AllSectionsConfigIdx]: K extends AllSectionsKeys ? {
//         [I in AllSectionsConfigIdx]: AllSectionsConfigT[I]['name'] extends K ? I : never
//     }[AllSectionsConfigIdx] : K extends AllSectionsConfigIdx ? {
//         [I in AllSectionsKeys]: AllSectionsConfigT[K]['name'] extends I ? I : never
//     }[AllSectionsKeys] : never;
// };
// type CmdListSecsEnumT = GenerateEnumT<CmdListSecsMapping>;
// type RegSecsEnumT = GenerateEnumT<RegSecsMapping>;
// type NonINIComfSecsEnumT = GenerateEnumT<NonINIComfSecsMapping>;
// type PrefixSectionsEnumT = GenerateEnumT<PrefixSectionMapping>;

// type VirtualEnumNumber = AllSectionsConfigIdx | number & { __flag: 'enum' }
// export type SectionEnumNumber = VirtualEnumNumber | undefined

// type AllSectionsDataT = {
//     [K in LowerAllSectionsKeys]: SectionDataT
// }

// const AllSectionsData = AllSectionsConfig.reduce((acc, item) => {
//     const key = item.name.toLowerCase() as LowerAllSectionsKeys
//     if (!(key in acc)) {
//         acc[key] = {name: key as GIMIString, raw: item.name, isPrefix: item.isPrefix};
//     }
//     return acc
// }, {} as AllSectionsDataT)

export const AllSections = AllSectionsConfig.reduce((acc, item, idx) => {
    const key = item.name
    if (!(key in acc)) {
        const groups: SectionRuleGroups[] = [];
        CommandListSectionsConfig.some(it => it.name === key) && groups.push("CommandList");
        RegularSectionsConfig.some(it => it.name === key) && groups.push("Regular");
        AllowLinesWithoutEqualsConfig.some(it => it === key) && groups.push("AllowLinesWithoutEquals");
        acc[key] = {
            name: key.toLowerCase() as LowerAllSectionsKeys,
            raw: key,
            isPrefix: item.isPrefix,
            groups
        }
    }
    // if (!(item.name in acc)) {
    //     acc[item.name as string] = idx as AllSectionsConfigIdx;
    //     acc[idx] = item.name;
    // }
    return acc
}, {} as AllSectionsEnumT)

// function generatorOneselfEnum<T extends CmdListSecsEnumT | RegSecsEnumT | NonINIComfSecsEnumT>(input: typeof CommandListSectionsConfig | typeof RegularSectionsConfig | typeof AllowLinesWithoutEqualsConfig) {
// function generatorOneselfEnum<T extends Partial<AllSectionsEnumT>>(input: readonly (typeof AllSectionsConfig[number])[]) {
// function generatorOneselfEnum<T extends Partial<AllSectionsEnumT>>(input: ReadonlyArray<typeof AllSectionsConfig[number]>) {
//     const _r = input.reduce((acc, item, idx) => {
//         const key = item.name;
//         if (!(key in acc) && key in AllSections) {
//             acc[key] = AllSections[key];
//             acc[idx] = AllSections[AllSections[key]] as Extract<AllSectionsKeys, T>;
//         }
//         return acc;
//     }, {} as T);
//     return _r;
// };
// const CmdListSections = generatorOneselfEnum<CmdListSecsEnumT>(CommandListSectionsConfig);
// const RegularSections = generatorOneselfEnum<RegSecsEnumT>(RegularSectionsConfig);
// const NonINIComfSections = generatorOneselfEnum<NonINIComfSecsEnumT>(AllowLinesWithoutEqualsConfig);
// const PrefixSections = generatorOneselfEnum(PrefixSectionsConfig);

// export function getSectionConfig(key: AllSectionsKeys | SectionEnumNumber | (string & {})): SectionDataT | undefined {
//     if (key === undefined) {
//         return undefined
//     }
//     const _k = typeof key === 'number' ? AllSections[key] : key
//     return AllSectionsData[_k.toLowerCase() as LowerAllSectionsKeys];
// }

export function getSectionConfig(type: SectionType): SectionDataT | undefined {
    if (!type) {
        return undefined;
    }
    return AllSections[type]
}

type SectionTypeAnalysisResult = {
    type: SectionType,
    
}

/**
 * automatic trim() and clean start "[" and end "]"
 * 
 * `type`: section internal type
 * 
 * `isPrefix`: section is prefix type or not. **undefined type treated as non-Prefix so always be false** (because prefix is anything?)
 * 
 * `belongGroups`: parsed section type is belong what rule group
 * 
 * `name`: parsed section title string without prefix, for undefined type also be full input string
 * 
 * `legal`: boolean for this parsed as legal or not, exa. [isPrefix type but have name] or [non-Prefix type but miss name] will be `false`
 */
export function parseSectionTypeInfo(text: string): {type: SectionType, isPrefix: boolean, belongGroups: SectionRuleGroups[], name: GIMIString, legal: boolean} {
    const lowTxt = (() => {
        let _r = text.trim().toLowerCase();
        return _r.slice((_r.startsWith("[") ? 1 : 0), (_r.endsWith("]") ? -1 : undefined));
    })();
    const secConfig = Object.values(AllSections).find(_k => {
        return lowTxt.startsWith(_k.name);
    });
    if (!secConfig) {
        return {type: undefined, isPrefix: true, belongGroups: [], name: lowTxt as GIMIString, legal: false};
    }
    const { name: typeLowStr, raw: type, isPrefix, groups } = secConfig
    const name = lowTxt.replace(typeLowStr, "") as GIMIString;
    const legal = (() => {
        if (isPrefix) {
            return name === "" ? false : true;
        } else {
            return name === "" ? true : false;
        }
    })();
    return {type, isPrefix, belongGroups: groups, name, legal};
}

/**undefiend enum type will treated as non-Prefix type*/
export function isPrefixSection(type: SectionType): boolean {
    return type === undefined ? false : AllSections[type].isPrefix
    // return Boolean(getSectionConfig(type)?.isPrefix)
}

export function isCommandListSection(type: SectionType): boolean {
    return type === undefined ? false : AllSections[type].groups.some(g => g === "CommandList");
}

export function isRegularSection(type: SectionType): boolean {
    const arar = AllSections[type!]
    return type === undefined ? false : AllSections[type].groups.some(g => g === "Regular");
}

export function isNonINIComfSection(type: SectionType): boolean {
    return type === undefined ? false : AllSections[type].groups.some(g => g === "AllowLinesWithoutEquals");
}

/**
 * `flags` are not work yet, need more improvement
 */
// export function findMatchedSection(input: string, flags?: ('CommandList' | 'Regular' | 'NonINIComformant')[]): SectionEnumNumber {
//     const _lowInput = input.toLowerCase();
//     const matched = Object.values(AllSectionsData).find(_k => {
//         return _lowInput.startsWith(_k.name);
//     })?.raw
//     return matched ? AllSections[matched] : undefined;

//     // const _lowInput = input.toLowerCase();
//     // const allSecsIdx = AllSections[_lowInput as Exclude<AllSectionsKeys, undefined>]
//     // return allSecsIdx !== undefined ? AllSections[allSecsIdx].name.enc as AllSectionsKeys : undefined;

//     // const range: {name: Exclude<AllSectionsKeys, undefined>, isPrefix: boolean}[] = [];
//     // if (!flags) {
//     //     range.push(...AllSectionsConfig)
//     // } else {
//     //     if (flags.includes('CommandList')) {
//     //         range.push(...CommandListSectionsConfig);
//     //     }
//     //     if (flags.includes('Regular')) {
//     //         range.push(...RegularSectionsConfig);
//     //     }
//     //     if (flags.includes('NonINIComformant')) {
//     //         range.push(...AllowLinesWithoutEqualsConfig);
//     //     }
//     // }
//     // const matched = range.find(({name, isPrefix}) => {
//     //     // const _lowName = name.toLowerCase()
//     //     // if (isPrefix) {
//     //     //     return input.startsWith(_lowName)
//     //     // } else {
//     //     //     return input === _lowName || input.startsWith(`${_lowName}.`)
//     //     // }

//     //     // if (isPrefix) {
//     //     //     return input.localeCompare(name, undefined, { sensitivity: 'base' }) === 0
//     //     //         || input.startsWith(`${name}.`, input.length - name.length - 1)
//     //     // } else {
//     //     //     return input.localeCompare(name, undefined, { sensitivity: 'base' }) === 0
//     //     //         || input.startsWith(`${name}.`)
//     //     // }
//     // })
//     // return matched ? matched.name : undefined
// }

