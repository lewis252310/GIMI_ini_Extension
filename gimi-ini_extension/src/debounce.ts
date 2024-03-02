
export function debounceA(func: Function) {
    let timeoutID: NodeJS.Timeout | null = null;
    return function(...args: any[]) {
        if (timeoutID) {
            clearTimeout(timeoutID);
        }
        timeoutID = setTimeout(() => {
            func(...args);
        }, 200);
    }
}

export function debounceB<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const _r = function(...args: Parameters<T>): void {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    }
    return _r as T;
}