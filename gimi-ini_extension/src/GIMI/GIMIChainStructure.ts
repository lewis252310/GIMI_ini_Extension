import { GIMIString } from "./GIMIString";

export abstract class ChainStructureBase {
    /**用於給 chain structure 標記 id 的成員 **不要他用也不要誤用** */
    chainId: GIMIString = "" as GIMIString;
    // constructor() {}
    abstract getIdentifierKeyPart(): GIMIString;
}

type ChainWalkDirection = "forward" | "backward";

type ChainAnchor = "HEAD" | "TAIL";

export type ChainIdentifier = GIMIString | ChainAnchor;

// type ChainRangeConfig = {
//     startAt?: GIMIString,
//     endAt?: GIMIString,
//     direction?: ChainWalkDirection
// }

interface ChainNode<U extends ChainStructureBase> {
    // data: GIMISection,
    data: U,
    prev: GIMIString | null,
    next: GIMIString | null
}

interface ChainNodeInfo<U extends ChainStructureBase> {
    node: ChainNode<U>,
    group: ChainNode<U>[],
    key: GIMIString,
    index: number
}

/**
 * appears externally as a section chain
 * so no node structure should be available externally
 */
export class GIMIChainStructure<U extends ChainStructureBase> {
    private data: Map<GIMIString, Array<ChainNode<U>>> = new Map<GIMIString, Array<ChainNode<U>>>;
    private chainHead: GIMIString | undefined = undefined;
    private chainTail: GIMIString | undefined = undefined;
    constructor() {
    }
    
    private ownIsEmpty(): boolean {
        return this.chainHead === undefined || this.chainTail === undefined;
    }

    private parseNodeId(id: GIMIString): {key: GIMIString, index: number | undefined} {
        const parts = id.split("##");
        const key = parts[0] as GIMIString;
        const idx = Number(parts[1]);
        const index = Number.isNaN(idx) ? undefined : idx;
        return {key, index};
    }

    private generateNodeId(key: GIMIString, index: number): GIMIString {
        return `${key}##${index}` as GIMIString
    }

    /**
     * try to convert ChainAnchor to internal exist identifier, if anchor not exist returned undefined
     */
    private regularizeToidentifier(chainId: ChainIdentifier): GIMIString | null {
        switch (chainId) {
            case "HEAD":
                return this.chainHead ?? null;
                break;
            case "TAIL":
                return this.chainTail ?? null;
                break;
            default:
                return chainId;
                break;
        }
    }

    /**
     * group or index faid will return undefiend, otherwise definitely succeed.
     */
    private getNodeRelation(identifier: ChainIdentifier | null): ChainNodeInfo<U> | undefined {
        if (identifier === null) {
            return undefined;
        }
        const _id = this.regularizeToidentifier(identifier);
        if (_id === null) {
            return undefined;
        }
        const {key, index = 0} = this.parseNodeId(_id);
        const group = this.data.get(key);
        if (!group || !group[index]) {
            return undefined;
        }
        return {node: group[index], group, key, index};
    }

    /**
     * not simply walking on the nodes.
     * instead, full node relation can see and used
     * 
     * `startAt` default changeHead, will processing
     * 
     * `endAt` default changeTail, will processing
     * 
     * `direction` default backward, important than `endAt`,
     * 
     * callback return a boolean for control walk continue or not, `false` will stop walking
     */
    private walkChain(config: {startAt?: ChainIdentifier, direction?: ChainWalkDirection}, callback: (nodeRelation: ChainNodeInfo<U>, index: number, identifier: GIMIString) => boolean): void {
        // if (this.ownIsEmpty()) {
        //     return;
        // }
        const {startAt = "HEAD", direction = "backward"} = config
        let chainIdx = 0;
        let currentId = this.regularizeToidentifier(startAt);
        while (currentId) {
            const currentNodeRelation = this.getNodeRelation(currentId)
            if (!currentNodeRelation) {
                break;
            }
            const result = callback(currentNodeRelation, chainIdx, currentId);
            if (result === false) {
                break;
            }
            chainIdx++;
            if (direction === "backward") {
                currentId = currentNodeRelation.node.next
            } else if (direction === "forward") {
                currentId = currentNodeRelation.node.prev
            } else {
                throw Error("WalkChain ERROR! Unknow direction enum");
            }
        }
    }

    private cutOutNodes(): void {

    }

    get head(): U | undefined {
        return this.get("HEAD");
    }

    get tail(): U | undefined {
        return this.get("TAIL");
    }

    hasContent(): this is this & {head: U, tail: U} {
        return !this.ownIsEmpty();
    }

    isEmpty(): this is this & {head: undefined, tail: undefined} {
        return this.ownIsEmpty();
    }

    get(id: ChainIdentifier): U | undefined {
        if (this.ownIsEmpty()) {
            return undefined;
        }
        return this.getNodeRelation(id)?.node.data;
    }

    getRelation(id: ChainIdentifier): {prev?: U, current: U, next?: U} | undefined {
        if (this.ownIsEmpty()) {
            return undefined;
        }
        const currentNode = this.getNodeRelation(id)?.node;
        if (!currentNode) {
            return undefined
        }
        return {
            current: currentNode.data,
            prev: this.getNodeRelation(currentNode.prev)?.node.data,
            next: this.getNodeRelation(currentNode.next)?.node.data
        }
    }

    /**
     * i dont know why im make this func.
     * this func doesnt even look like it is used at all =_=
     */
    getGroup(id: GIMIString): U[] | undefined {
        if (this.ownIsEmpty()) {
            return undefined;
        }
        return this.getNodeRelation(id)?.group.map(_n => _n.data);
    }

    getAllGroup(): {key: GIMIString, datas: U[]}[] {
        const _r: {key: GIMIString, datas: U[]}[] = []
        this.data.forEach((nodes, key) => {
            _r.push({
                key: key,
                datas: nodes.map(_n => _n.data)
            })
        })
        return _r;
    }
    
    clear(): boolean {
        this.data.clear();
        this.chainHead = undefined;
        this.chainTail = undefined;
        return true;
    }

    /**
     * @param deleteCount for not set or not exist, will cut untill chainTail
     */
    splice(startAt: ChainIdentifier, deleteCount?: number): U[]
    splice(from: ChainIdentifier, to: ChainIdentifier, ...items: U[]): U[]
    splice(startAt: ChainIdentifier, deleteCount: number, ...items: U[]): U[]
    splice(startAt: ChainIdentifier, countOrTo?: number | ChainIdentifier, ...items: U[]): U[] {
        const _r: U[] = [];
        const cutEndCondition = countOrTo ?? -1;

        // maybe use null will be better?
        // const cutInfo: {startPrev: ChainNode<U> | null | undefined, endNext: ChainNode<U> | null | undefined} = { startPrev: undefined, endNext: undefined };
        const cutInfo: {startPrev: ChainNode<U> | undefined, endNext: ChainNode<U> | undefined} = { startPrev: undefined, endNext: undefined };
        const startAtRelation = this.getNodeRelation(startAt);
        if (!startAtRelation) {
            // if startAt is not exist, default connect elements to chainTail
            cutInfo.startPrev = this.getNodeRelation("TAIL")?.node;
            cutInfo.endNext = undefined;
        } else if (typeof cutEndCondition === "number" && cutEndCondition === 0) {
            // if cutEndCondition is `0` means no delete ltngth, just brake chain at startAt
            cutInfo.startPrev = this.getNodeRelation(startAtRelation.node.prev)?.node;
            cutInfo.endNext = startAtRelation.node;
        } else {
            // cutEndCondition is non-zero case
            const waitProcessList: Map<GIMIString, {array: ChainNode<U>[], indexes: number[]}> = new Map<GIMIString, {array: ChainNode<U>[], indexes: number[]}>;
            this.walkChain({startAt}, (nodeRel, index, id) => {
                const {node, group, key, index: nodeIdx} = nodeRel
                const procEle = (() => {
                    const _l = waitProcessList.get(key);
                    if (!_l) {
                        const _g = {array: group, indexes: []}
                        waitProcessList.set(key, _g);
                        return _g;
                    }
                    return _l;
                })();
                procEle.indexes.push(nodeIdx);
                _r.push(node.data);
                if (index === 0) {
                    cutInfo.startPrev = this.getNodeRelation(node.prev)?.node;
                }
                if ((typeof cutEndCondition === "number" && index === cutEndCondition - 1) ||
                    (typeof cutEndCondition === "string" && node.data.chainId === cutEndCondition)) {
                    cutInfo.endNext = this.getNodeRelation(node.next)?.node;
                    return false;
                }
                return true;
            });
            waitProcessList.forEach((value, key) => {
                // 先排序從大到小 避免影響前面的 index
                const indexes = value.indexes.sort((a, b) => b - a);
                indexes.forEach(_idx => value.array.splice(_idx, 1));
                if (value.array.length === 0) {
                    this.data.delete(key);
                } else {
                    for (let i = indexes.at(-1)!; i < value.array.length; i++) {
                        const _node = value.array[i];
                        _node.data.chainId = this.generateNodeId(key, i);
                        const _prev = this.getNodeRelation(_node.prev)?.node;
                        _prev && (_prev.next = _node.data.chainId)
                        const _next = this.getNodeRelation(_node.next)?.node;
                        _next && (_next.prev = _node.data.chainId)
                    }
                }
            });
        }
        const spliceInfo: {start: ChainNode<U> | undefined, end: ChainNode<U> | undefined} = {start: undefined, end: undefined};
        if (items.length === 0) {
            spliceInfo.start = cutInfo.endNext;
            spliceInfo.end = cutInfo.startPrev;
        } else {
            let lastNodeInfo: ChainNode<U> | undefined = undefined;
            items.forEach((ele, eleIdx) => {
                const _node: ChainNode<U> = { data: ele, prev: null, next: null };
                const key = ele.getIdentifierKeyPart();
                const group: ChainNode<U>[] = (() => {
                    const arr = this.data.get(key);
                    if (!arr) {
                        const _g: ChainNode<U>[] = [];
                        this.data.set(key, _g);
                        return _g;                    
                    } else {
                        return arr;
                    }
                })();
                const identifier = this.generateNodeId(key, group.length);
                ele.chainId = identifier;
                if (eleIdx === 0) {
                    spliceInfo.start = _node;
                }
                if (eleIdx === items.length - 1) {
                    spliceInfo.end = _node;
                }
                if (lastNodeInfo) {
                    lastNodeInfo.next = identifier;
                    _node.prev = lastNodeInfo.data.chainId;
                }
                lastNodeInfo = _node;
                group.push(_node);
            });
        }
        // if (!spliceInfo.start || !spliceInfo.end) {
        //     throw Error("ChainStructure ERROR! spliceInfo incomplete. cant complete the operation.");
        // }
        if (!cutInfo.startPrev) {
            // startAt is chainHead, so prev is `null` and need update chainHead
            spliceInfo.start && (spliceInfo.start.prev = null);
            this.chainHead = spliceInfo.start?.data.chainId;
        } else {
            cutInfo.startPrev.next = spliceInfo.start?.data.chainId ?? null;
            spliceInfo.start && (spliceInfo.start.prev = cutInfo.startPrev.data.chainId);
        }
        // throw Error("ChainStructure ERROR! cutInfo.startPrev and spliceInfo.start are not exist. cant complete the operation.");

        if (!cutInfo.endNext) {
            // cut end point is chainTain, so next is `null` and need update chainTail
            spliceInfo.end && (spliceInfo.end.next = null);
            this.chainTail = spliceInfo.end?.data.chainId;
        } else {
            cutInfo.endNext.prev = spliceInfo.end?.data.chainId ?? null;
            spliceInfo.end && (spliceInfo.end.next = cutInfo.endNext.data.chainId);
        }
        _r.forEach(ele => ele.chainId = "" as GIMIString);
        return _r;
    }

    /**
     * removes first element from chain and returns it. if the chain is empty, undefined is returned and the chain is not modified.
     */
    shift(): U | undefined {
        if (this.ownIsEmpty()) {
            return undefined;
        }
        return this.splice(this.chainHead!, 1)[0];
    }
    
    /**
     * inserts new elements at the start of chain, and returns whether operation successful or not.
     */
    unshift(item: U): boolean {
        if (this.ownIsEmpty()) {
            return false
        }
        const result = this.splice(this.chainHead!, 0, item);
        return result.length === 0 ? true : false;
    }

    unshiftMany(items: U[]): boolean {
        if (items.some(it => it.chainId !== "")) {
            // found any id exist, fail to processing 
            return false;
        }
        const result = this.splice(this.chainHead!, 0, ...items);
        return result.length === 0 ? true : false;
    }

    /**
     * push section to tail of chain, if identifier of section is not empty string will push failed 
     */
    push(item: U): boolean {
        if (item.chainId !== "") {
            // means this item has been in the chain
            return false;
        }
        this.splice("" as GIMIString, 0, item);
        return true;
    }

    pushMany(items: U[]): boolean {
        if (items.some(it => it.chainId !== "")) {
            // found any id exist, fail to processing 
            return false;
        }
        this.splice("" as GIMIString, 0, ...items);
        return true;
    }
    
    pushB(item: U): boolean {
        if (item.chainId !== "") {
            // this item maybe has been in chain, do not do anything
            return false;
        }
        const _node: ChainNode<U> = { data: item, prev: null, next: null };
        const key = item.getIdentifierKeyPart();
        const group: ChainNode<U>[] = (() => {
            const _g = this.data.get(key);
            if (!_g) {
                const new_g: ChainNode<U>[] = [];
                this.data.set(key, new_g);
                return new_g;                    
            } else {
                return _g;
            }
        })()
        const identifier = this.generateNodeId(key, group.length);
        item.chainId = identifier;
        group.push(_node);
        if (this.ownIsEmpty()) {
            this.chainHead = identifier;
            this.chainTail = identifier;
        } else {
            const tailNodeRelaiton = this.getNodeRelation(this.chainTail!);
            if (!tailNodeRelaiton) {
                // throw new Error("Push failed! the tail id exist but tail node instance is not exist");
                console.error("Push failed! the tail id exist but tail node instance is not exist");
                return false;
            }
            tailNodeRelaiton.node.next = identifier;
            _node.prev = this.chainTail!;
            this.chainTail = identifier;
        }
        return true;
    }

    pop(): U | undefined {
        if (!this.chainTail) {
            return undefined;
        }
        return this.splice(this.chainTail, 1)[0];
    }

    remove(identifier: GIMIString): boolean {
        const result = this.splice(identifier, 1)
        return Boolean(result.length !== 0);
    }

    forEach(callback: (section: U, index: number) => void): void {
        if (this.ownIsEmpty()) {
            return;
        }
        this.walkChain({}, (nodeRelation, index) => {
            callback(nodeRelation.node.data, index);
            return true;
        })
    }

    map<R>(callback: (section: U, index: number) => R): R[] {
        const _r: R[] = [];
        this.forEach((section, index) => {
            _r.push(callback(section, index));
        });
        return _r;
    }

    /**
     * walk on sections, can call prev section and next section
     * 
     * prev and next in sections of callback func is basic on chain node realtion.
     */
    walk(config: {startAt?: ChainIdentifier, direction?: ChainWalkDirection}, callback: (sections: {prev?: U, current: U, next?: U}, index: number) => boolean | void): void {
        if (this.ownIsEmpty() || config.startAt === "") {
            return;
        }
        const forOuter: {prev?: U, current?: U, next?: U} = {}
        let walkIndex = 0;
        let continueWalk: boolean = false;
        this.walkChain(config, (nodeRelation, index) => {
            if (config.direction === "forward") {
                forOuter.next = forOuter.current;
                forOuter.current = forOuter.prev;
                forOuter.prev = nodeRelation.node.data;                
            } else {
                forOuter.prev = forOuter.current;
                forOuter.current = forOuter.next;
                forOuter.next = nodeRelation.node.data;
            }
            if (index === 0) {
                forOuter.current = this.getNodeRelation(config.direction === "forward" ? nodeRelation.node.next : nodeRelation.node.prev)?.node.data;
                return true;
            }
            // here for `.current` exist condition is because walk will one node slower than walkChain
            // more readable code is `if (index !== 0)`
            if (forOuter.current) {
                const result = callback({
                    prev: forOuter.prev, current: forOuter.current, next: forOuter.next
                }, walkIndex++);
                continueWalk = result === false ? false : true;
                if (continueWalk === false) {
                    return false;
                }
            }
            return true;
        });
        if (continueWalk && config.direction === "forward" && forOuter.prev) {
            // no need to implement the translation of forOuter, because this is already the last one.
            callback({prev: undefined, current: forOuter.prev, next: forOuter.current}, walkIndex)
        } else if (continueWalk && forOuter.next) {
            // no need to implement the translation of forOuter, because this is already the last one.
            callback({prev: forOuter.current, current: forOuter.next, next: undefined}, walkIndex)
        }
    }
}