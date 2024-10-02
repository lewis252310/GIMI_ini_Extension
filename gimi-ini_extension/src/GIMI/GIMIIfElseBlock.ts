import { Range } from "vscode";
import { GIMIIdentifier } from "./GIMI";
import { GIMIUnit } from "./GIMIUnit";

// ifElBlock#<sectionINIInvoke>/nest.<num>_no.<num>:
// export class GIMIIfElseBlock extends GIMIUnit {
//     nestLevel: number;
//     type: 'toend' | 'notend' | 'missend';
//     constructor(identifier: GIMIIdentifier, range: Range, nestLv: number, parent?: GIMIIdentifier, children?: GIMIIdentifier[]) {
//         super(identifier, range, parent, children);
//         this.nestLevel = nestLv;
//     }
// }