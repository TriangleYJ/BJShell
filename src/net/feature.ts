export function u(i: number): number {
    if (!Number.isInteger(i)) throw Error()
    if(i > 0) return 1
    return 0
}