import { Diagnostic, workspace } from "vscode";


const Prefix = "GIMIini";

const ExtensionConfigurations = {
    diagnostics: {
        enable: true,
        level: "Lite"
    },
    file: {
        parseingAllowedMaximumLines: 10000,
        parseingAllowedMaximumCharacters: 50000,
        parseingDebounceInterval: 100,
    }
}

function getConfigValueByPath(path: string): Object | number | string | number | undefined {
    const keys = path.split('.');
    if (keys.length < 1) {
        console.error(`getConfigValue failed! Keys length is less then 1 (${keys.length}).`);
        return false;
    }
    let current = ExtensionConfigurations as {[x: string]: any};
    for (const k of keys) {
        if (current[k] !== undefined) {
            current = current[k]
        } else {
            return undefined
        }
    }
    return current
}

function setConfigValueByPath(path: string, value: any): boolean {
    const keys = path.split('.');
    if (keys.length < 1) {
        console.error(`setConfigValue failed! Keys length is less then 1 (${keys.length}).`);
        return false;
    }
    let current = ExtensionConfigurations as {[x: string]: any};
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined) {
            console.error(`setConfigValue failed! Path does not exist (${path}).`);
            return false;
        } else if (typeof current[key] !== "object" || current[key] === null) {
            console.error(`setConfigValue failed! Invalid path, intermediate value is not an object (${path}).`);
            return false;
        }
        current = current[key];
    }
    const finalKey = keys[keys.length - 1];
    if (current[finalKey] === undefined) {
        console.error(`setConfigValue failed! Path does not exist (${path}).`);
        return false;
    } else if (typeof current[finalKey] !== typeof value) {
        console.error(`setConfigValue failed! Type of value does not match config value (value: ${typeof value}, config: ${typeof current[finalKey]}).`);
        return false;
    }
    current[finalKey] = value;
    return true;
}

export class ConfigurationsManager {
    private static loadFromConfigurationFile(): boolean {
        const config = workspace.getConfiguration(Prefix);
        setConfigValueByPath("diagnostics.enable", config.get<boolean>("diagnostics.enable") ?? true);
        // setConfigValueByPath("file.parseingAllowedMaximumLines", config.get<number>("file.parseingAllowedMaximumLines") ?? 10000);
        // setConfigValueByPath("file.parseingAllowedMaximumCharacters", config.get<number>("file.parseingAllowedMaximumCharacters") ?? 50000);
        return true;
    }

    static settings = ExtensionConfigurations;

    static init(): boolean {
        return this.loadFromConfigurationFile();
    }
    
    // static getConfig(keyPath: string) {
    //     return getConfigValueByPath(keyPath);
    // }

    static updateAllSettings(): boolean {
        return this.loadFromConfigurationFile();
    }

    static onDidChangeConfiguration() {
        return workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(Prefix)) {
                this.updateAllSettings();
            }
        })
    }
}