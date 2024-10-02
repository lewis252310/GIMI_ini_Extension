
/**
 * 工具泛型類，只轉換指定的屬性成為必定存在
 */
type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * 工具泛型類，提取指定型別(K)的鍵
 */
type ExtractKeysOfType<T, K> = {
    [P in keyof T]: T[P] extends K ? P : never
}[keyof T];

/**
 * 工具泛型類，遞歸提取指定型別(K)的鍵
 * 
 * @see {@link ExtractKeysOfType}
 */
type ExtractNestedKeysOfType<T, K> = T extends object
    ? ExtractKeysOfType<T, K> | { [P in keyof T]: ExtractNestedKeysOfType<T[P], K> }[keyof T]
    : never;

/**
 * !!!!! ==================================== !!!!!
 * 該型別曾有造成 IDE 編譯器響應緩慢的紀錄，需要注意
 * !!!!! ==================================== !!!!!
 * 
 * 工具泛型類，枚舉 T 可用的所有成員路徑的字面量聯合型別
 * 
 * 一般用於參數的型別上，而非泛型之中
 * 
 * 假設有如下嵌套型別
 * ```
 * type ObjectA = {
 *   index: number,
 *   data: {
 *     name: string,
 *     value: Data
 *   }
 * }
 * ```
 * 則 KeyPaths<ObjectA> 可以獲得 `"index" | "data" | "data.name" | "data.value"` 字面量聯合型別
 * 
 */
// type KeyPaths<T> = 
//     T extends Array<infer U> ? `${number}` | `${number}.${KeyPaths<U>}` :
//     T extends object ? {
//         [K in keyof T]: K extends string | number | undefined | null
//         ? `${K}` | `${K}.${KeyPaths<T[K]>}`
//         : never
//     }[keyof T]
//     : never;

/**
 * 工具泛型類，抽出 array 或 object 中的某個成員的型別
 * 
 * 跟 {@link DeepKey} 重疊，但有完整提示跟單級執行，並且允許嵌套來逐步獲取內部
 */
type DeepDataTypeKProvider<T extends any[] | object> = T extends any[] ? keyof T[number] : keyof T;
type DeepDataType<T extends any[] | object, K extends DeepDataTypeKProvider<T>> =  T extends any[] ? T[number][K] : T[K];

/**
 * 工具泛型類，依據 K 的字串值來搜索對應位置的成員的類型
 * 
 * 假設有如下嵌套型別
 * ```
 * type ObjectA = {
 *   index: number,
 *   data: {
 *     name: string,
 *     value: Data
 *   }
 * }
 * ```
 * 則 DeepKey<ObjectA, "data.name"> 可以獲得 string 型別，
 * DeepKey<ObjectA, "data.value"> 可以獲得 Data 型別
 */
// type DeepKey<T, K extends string> = K extends keyof T
//     ? T[K]
//     : K extends `${infer First}.${infer Rest}`
//     ? First extends keyof T
//         ? DeepKey<T[First], Rest>
//         : never
//     : never;

/**
 * 工具泛型類，檢查 X 與 Y 是否相等
 * 
 * 允許指定要返回的實際值。
 * 
 * 當 X === Y 時會返回 A，預設 true，反之。
 * 要對結果取反則將 A = false, B = true
 * 
 * `IfEquals<string, string>` 獲得 true 型別 (string === string)
 * 
 * `IfEquals<string, number>` 獲得 false 型別 (string !== number)
 * 
 * ---
 * 
 * ->->- 實際運作邏輯理解紀錄 -<-<-
 * ```l
 * 泛型箭頭函數的 T 並不需要實際值，這邊用於比對的邏輯是一種類似複數狀態的比對。
 * 如果函數一可以分配給函數二則返回 A 反之 B
 * 這裡函數間比對的是「T 分配給 X」與「T 分配給 Y」的狀態聯合表現
 * 這個狀態聯合可以想像成 T 是一個 number | string | bigint | ... 各種可能的型別都黏在一起的超大聯合型別
 * 然後 extends 會對每一種型別比對後提出隱含的 true/false。
 * 這邊以上方的 <string, number> 為例：
 * T extends string 視同 (number | string | bigint | ...) extends string
 * 又拆分為 number extends string, string extends string, bigint extends string,....
 * 並且 extends 最終會收回這些比對結果，即一個 [false, true, false,...] 這樣概念的虛擬的複數狀態
 * 而這裡的函數間比對的值就是這一串 true/false 元組
 * 如果 X === Y 的話那這個元組會完全一樣，於是返回 A，反之。
 * ```
 */
type IfEquals<X, Y, A = true, B = false> = 
    (<T>() => T extends X ? 1 : 2) extends 
    (<T>() => T extends Y ? 1 : 2) ? A : B;

/**
 * 工具泛型類，檢查 T 是否是一個 readonly Array 或 readonly object
 * 
 * 如果原型別等於減 rd 後型別，即無 rd 可減，即原型別非 readonly，故 {@link IfEquals} 之 A 抄近路直接返回 false，反之。
 */
type IsReadonly<T extends any[] | object> = 
    T extends readonly any[] ? true :
    { [K in keyof T]: IfEquals<
        { [P in K]: T[K] },
        { -readonly [P in K]: T[K] },
        false,
        true >
    }[keyof T];
    
/**
 * 工具泛型類，檢查 T 是否是一個純數字字串。
 * 
 * 涵蓋整數、非整數、正數、負數，但不包括非十進位、字面量分數、格式化字面量數
 */
export type IsNumberString<T extends string> =
    T extends `${number}` ? true : false;

/**
 * 工具泛型類，嘗試將 T 轉換為一個 number 型別。
 * 
 * 跟 {@link IsNumberString} 有點重疊，但 AsNumber 的返回值是一個「字面量為數字，行別為 number，解釋器視為 number」的型別
 * 在某些情況中會比 IsNumberString 有更好的使用性
 */
export type AsNumber<T extends string> = 
    T extends `${infer N extends number}` ? N : T;


/**
 * 工具泛型類，抽出 readonly Array 的所有 index 的字面量聯合(string)
 */
export type Indices<T extends readonly any[]> = Exclude<keyof T, keyof [] | symbol>

/**
 * 工具泛型類，抽出 readonly Array 的陣列長度
 * 
 * 被註釋的是其他變體如：沒有檢查 length 的型別、直接返回 length 的值
 */
// type ReadonlyArrayLenght<T extends readonly any[]> = T['length']
// type ReadonlyArrayLenght<T extends readonly any[]> = T extends { length: infer L } ? L : never
type ReadonlyArrayLenght<T extends readonly any[]> = T extends { length: number } ? T['length'] : never

/**
 * 工具泛型類，強制 TS 解析器計算 T 的實際/最終值
 * 
 * 通常用在想要顯示聯合類型的實際值的時候
 * 
 * 至於為什麼不是單純的 { [K in keyof T]: T[K] } 還沒找到正確答案
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;


/**
 * 工具泛型類，從給定的 Array T 中生成 name-index 鍵值對
 */
type GenNameIdxPairObj<T extends readonly {name: string}[]> = {
    [K in Indices<T> as T[K] extends {name: infer N} ? Extract<N, string> : never]: AsNumber<K>
}

/**
 * 工具泛型類，從給定的 Array T 中生成 index-U 鍵值對
 */
type GenNumUPairObj<T extends readonly any[], U> = {
    [K in AsNumber<Indices<T>>]: U
}

/**
 * 工具泛型類，合併 {@link GenNameIdxPairObj} 與 {@link GenNumUPairObj}
 */
type MixNameIdxAndNumUObj<T extends readonly any[], U> = GenNameIdxPairObj<T> & GenNumUPairObj<T, U>;


/**
 * 這一陀可以計算聯合型別的聯合數量
 * 我完全不知道這東西到底是怎麼運作的 但它確實可以用
 * 這東西似乎就是把聯合轉換成元組的一種可行方式
 * 雖然不確定原因 但連合轉元組的操作是被標記說**不應該使用**的
 */
// type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
// type LastOf<T> = UnionToIntersection<T extends any ? (x: T) => void : never> extends (x: infer L) => void ? L : never;
// type UnionToTuple<T, L = LastOf<T>, N = [T] extends [never] ? true : false> = true extends N ? [] : [...UnionToTuple<Exclude<T, L>>, L];
// type LengthOfUnion<T> = UnionToTuple<T>['length'];
// type LengthOfTestUnion = LengthOfUnion<'a' | 'b' | 'c'>; // LengthOfTestUnion 會是 3
