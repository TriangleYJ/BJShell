import { u } from "../../src/net/feature"

describe("피처 테스트", () => {
    it("unit(1)=1", () => {
        expect(u(1)).toBe(1)
    })
    it("unit(99)=1", () => {
        expect(u(99)).toBe(1)
    })
    it("unit(0)=0", () => {
        expect(u(0)).toBe(0)
    })
    it("unit(-1)=0", () => {
        expect(u(-1)).toBe(0)
    })
    it("unit(0.5) - error", () => {
        expect(() => {u(0.5)}).toThrowError()
    })
})