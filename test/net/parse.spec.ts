import { getResponse } from "../../src/net/parse"
import config from "../../src/config"

describe("백준 api 테스트", () => {
    it("메인 페이지 200 확인", async () => {
        const result = await getResponse(config.URL)
        expect(result.status).toBe(200)
    }),
    it("문제 페이지 200 확인", async () => {
        const result = await getResponse(config.URL_PROB + "1000")
        expect(result.status).toBe(200)
    }),
    it("문제 페이지 404 확인", async () => {
        const result = await getResponse(config.URL_PROB + "0")
        expect(result.status).toBe(404)
    }),
    it("문제 리스트 페이지 200 확인", async () => {
        const result = await getResponse(config.URL_PLIST)
        expect(result.status).toBe(200)
    })
})