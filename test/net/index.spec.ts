import { getResponse } from "@/net/fetch"
import { getProblem } from "@/net/parse"
import { User } from "@/net/user"
import config from "@/config"
import dotenv from "dotenv"
dotenv.config()

describe("백준 api - 파싱 테스트", () => {
    it("메인 페이지 200 확인", async () => {
        const result = await getResponse('')
        expect(result.status).toBe(200)
    })
    it("문제 페이지 200 확인", async () => {
        const result = await getResponse(`${config.PROB}1000`)
        expect(result.status).toBe(200)
    })
    it("문제 페이지 404 확인", async () => {
        const result = await getResponse(`${config.PROB}`)
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
        })
    })
    it("2557번 문제 파싱 확인 (예제 입력 없음)", async () => {
        const result = await getProblem(2557)
        expect(result).toMatchObject({
            qnum: 2557,
            title: "Hello World",
            parsed_date: expect.any(Date),
            stat: {
                timelimit: '1 초 ',
                memlimit: '128 MB',
            },
            testcases: [
                { input: '', output: 'Hello World!' }
            ],
        })
    })
    it("2918번 문제 파싱 확인 (여러 개의 예제)", async () => {
        const result = await getProblem(2918)
        expect(result).toMatchObject({
            qnum: 2918,
            title: "Arrange",
            parsed_date: expect.any(Date),
            stat: {
                timelimit: '1 초 ',
                memlimit: '128 MB',
            },
            testcases: [
                { input: '2 1\n2 1\n1 2\n', output: '1\n1\n' },
                { input: '3 2\n2 1 3\n1 3\n2 3\n', output: '3\n2\n1\n2\n' },
                {
                    input: '5 5 \n1 2 3 4 5 \n1 5 \n2 5 \n1 4 \n1 1 \n3 5\n',
                    output: '0\n'
                }],
        })
    })
})

describe.only("백준 api - 로그인 및 제출 테스트", () => {
    if(process.env.BJ_token === undefined) throw new Error("BJ_token not found. Hint: create .env file and add BJ_token")

    const user = new User(process.env.BJ_token || "")
    if(process.env.BJ_autologin) user.setAutologin(process.env.BJ_autologin)

    it("로그인 200 확인", async () => {
        expect(await user.checkLogin()).toBe(200)
    })
    it("유저 이름 확인", async () => {
        expect(await user.getUsername()).toBe(process.env.BJ_username)
    })
})