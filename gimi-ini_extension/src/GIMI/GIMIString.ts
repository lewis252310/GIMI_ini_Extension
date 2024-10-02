
export type GIMIString = string & { __state: 'encoded' }

export function encodeToGIMIString(input: string): GIMIString {
    return encodeURI(input.toLowerCase().replace('\\', '/')) as GIMIString
    // return encodeURI(input.toLowerCase()) as GIMIString
    // return encodeURI(fastToLowerCase(input).replace('\\', '/')) as GIMIString
}

function fastToLowerCase(str: string): string {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        // 只轉換大寫字母 A-Z
        if (code >= 65 && code <= 90) {
            result += String.fromCharCode(code + 32);
        } else {
            result += str[i];
        }
    }
    return result;
}

function isGIMIString(input: string): input is GIMIString {
    return input === (encodeToGIMIString(input) as string)
}

/**
 * Lower case and encode string for GIMI internal
 */
export class LowString {
    /**
     * Raw / Original string when instance was created.
     */
    readonly raw: string;
    /**
     * Really internal usable string, call from class method {@link LowString.encode encode}.
     */
    private _enc: GIMIString | undefined;
    private _deepEncode?: string;
    
    constructor(raw: string, enc?: GIMIString) {
        this.raw = raw;
        this._enc = enc;
    }

    get enc(): GIMIString {
        if (this._enc === undefined) {
            this._enc = LowString.encode(this.raw);
        }
        return this._enc;
    }

    /**
     * Deep encode from {@link LowString.raw raw} member. Lazy initializing and evaluation
     */
    get deepEncode(): string {
        if (this._deepEncode === undefined) {
            this._deepEncode = LowString.deepEncode(this.raw);
        }
        return this._deepEncode;
    }

    substring(start: number, end?: number, source?: 'raw' | 'enc'): LowString {
        if (!source || source === 'raw') {
            return LowString.build(this.raw.substring(start, end))
        } else {
            return LowString.build(this.enc.substring(start, end), this.enc.substring(start, end));
        }
    }

    split(separator: string, source: 'raw' | 'enc' = 'raw', limit?: number): LowString[] {
        const usingString = source === 'raw' ? this.raw : this.enc;
        return usingString.split(separator).map(part => LowString.build(part));
    }
    
    static build(input: string): LowString;
    static build(raw: string, enc: string): LowString;
    static build(rawOrIn: string, enc?: string): LowString {
        if (!enc) {
            return new LowString(rawOrIn, LowString.encode(rawOrIn));
        } else {
            return new LowString(rawOrIn, enc as GIMIString);
        }
    }

    static combine(items: (LowString | string)[], separator?: string): LowString {
        return this.build(items.map(item => {
            // typeof item === 'string' ? item : item.raw
            item instanceof LowString ? item.raw : item;
        }).join(separator))
    }

    /**
     * Use build-in `encodeURI` to encode, and without `\`
     */
    static encode(rawStr: string): GIMIString {
        // return rawStr.toLowerCase().split('\\').map(encodeURI).join('\\') as GIMIString;
        // return encodeURI(rawStr.toLowerCase().replace('\\', '/')) as GIMIString;
        return encodeToGIMIString(rawStr);
    }

    /**
     * Same as {@link LowString.encode encode} but will encode `\`
     */
    static deepEncode(rawStr: string): GIMIString {
        return encodeURI(rawStr.toLowerCase()) as GIMIString;
    }

    [Symbol.toPrimitive](hint: string) {
        if (hint == 'number') {
            return NaN
        }
        return this.enc
    }
}

function extractUsableString(input: string | LowString) {
    return typeof input === 'string' ? input.toLowerCase() : input.enc;
}

function LowStringBuilderB<T extends string | number | boolean | null | undefined>(item: T): LowString {
    let _r: string;
    if (typeof item === 'string') {
        _r = item;
    // } else if (typeof item === 'number' || typeof item === 'bigint' || typeof item === 'symbol') {
    } else if (typeof item === 'boolean' || item === null || item === undefined) {
        _r = `${item}`;
    } else if (['number', 'bigint', 'symbol'].includes(typeof item)) {
        _r = item.toString();
    // } else if (typeof item === 'symbol') {
    //     _r = item.toString();
    } else {
        throw new Error('Unsupported type');
    }
    return LowString.build(_r);
}

function AnythingBuilder<T, U>(
    input: T,
    // path: KeyPaths<T>,
    path: string,
    converter: (value: any) => U
): T {
    const nodes = path.split(".");
    let current: any = input;
    // 依照 keys 將 current 定位到正確成員上
    for (const node in nodes) {
        if (current[node] === undefined) {
            throw new Error(`Key path "${path}" is invalid at "${node}"`)
        }
        current = current[node]
    }
    // 應用轉換
    current = converter(current);
    return input;
}

type WithLowStrings<T, K extends keyof T> = Omit<T, K> & { [P in K]: LowString };
type NonObject = string | number | boolean | null | undefined;

function LowStringBuilder(item: NonObject): LowString;
// function LowStringBuilder<T extends NonObject>(item: T): LowString;
function LowStringBuilder<T extends object, K extends keyof T>(item: T, keys?: K[]): WithLowStrings<T, K>;
function LowStringBuilder(item: any, keys?: string[]): any {
    if (typeof item !== 'object' || item === null || item === undefined) {
        return LowStringBuilderB(item);
    }
    // const _ks = keys ?? (Object.keys(item).filter((key) => typeof item[key as keyof T] === 'string') as K[]);
    const _ks = keys ?? (Object.keys(item));
    const _r = { ...item };
    _ks.forEach(key => {
        const _v = item[key];
        if (['string', 'number', 'boolean'].includes(typeof _v) || _v === null || _v === undefined) {
            (_r as any)[key] = LowStringBuilderB(_v);
        }
    })
    return _r;
}