import { getResponse, getProblem } from "../../src/net/parse"
import config from "../../src/config"

describe("백준 api 테스트", () => {
    it("메인 페이지 200 확인", async () => {
        const result = await getResponse('')
        expect(result.status).toBe(200)
    })
    it("문제 페이지 200 확인", async () => {
        const result = await getResponse(config.PROB + "1000")
        expect(result.status).toBe(200)
    })
    it("문제 페이지 404 확인", async () => {
        const result = await getResponse(config.PROB + "0")
        expect(result.status).toBe(404)
    })
    it("1000번 문제 파싱 확인", async () => {
        const result = await getProblem(1000)
        expect(result).toMatchObject({
            qnum: 1000,
            title: "A+B",
            parsed_date: expect.any(Date),
            stat: {
                timelimit: "2 초 ",
                memlimit: "128 MB",
            },
            input_explain: '첫째 줄에 A와 B가 주어진다. (0 < A, B < 10)',
            output_explain: '첫째 줄에 A+B를 출력한다.',
            prob: '두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.',
            testcases: [{ input: '1 2\n', output: '3\n' }],
        });
    })
})

