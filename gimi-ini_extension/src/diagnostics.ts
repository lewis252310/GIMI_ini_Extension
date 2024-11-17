import { languages, DiagnosticCollection, Diagnostic, Uri, Range, DiagnosticSeverity } from 'vscode'
import { ConfigurationsManager } from './configurations'

export type TempDiagnostic = {
    relRng: Range,
    info: string,
    lv: DiagnosticSeverity
}

enum DiagnosticLevel {
    Close,
    Liet,
    Detail
}

const DiagnosticSettings = {
    "global.unexpectedWord": true,
    "condition": true,
    "condition.ifelse": true,
    "section.key.unknowType": true,
}

type DiagnosticSettingKeys = keyof typeof DiagnosticSettings;

export class DiagnosticsManager {
    private static get mainEnableState() {
        return ConfigurationsManager.settings.diagnostics.enable;
    };

	static readonly diagnosticCollection: DiagnosticCollection = languages.createDiagnosticCollection("gimi-ini");

    static getSetting(key: DiagnosticSettingKeys): boolean | undefined {
        return DiagnosticSettings[key]
    }

    static setSetting(key: DiagnosticSettingKeys, value: any): boolean {
        if (DiagnosticSettings[key] === undefined) {
            console.error(`Diagnostics setting key ${key} is not exist!`);
            return false;                
        }
        DiagnosticSettings[key] = value;
        return true;
    }

    static runDiagnostics(type: DiagnosticSettingKeys, tempDiags: TempDiagnostic[], callBack: () => Range | undefined): void {
        if (this.mainEnableState === false || this.getSetting(type) === false) {
            return;
        }
        const diagRng = callBack();
        if (!diagRng) {
            return;
        }
        // tempDiags.push ;
        return;
    }
}