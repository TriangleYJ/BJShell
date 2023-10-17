
describe("BJ Shell 테스트", () => {
    describe.skip("[Manual test] exec 커맨드 테스트", () => {
        it("exec read hello; echo hello;", () => {})
        it("exec sleep 2; echo 1; sleep 2; echo 2;", () => {})
        it("exec sleep 2; echo 1; <Ctrl+C> sleep 2; echo 2;", () => {})
        it("exec zsh;", () => {})
    })

    describe.skip("[Manual test] test 커맨드 테스트", () => {
        // TODO: set to real test
        const test_2525_py = `
        # 2525
        import time
        a, b = map(int, input().split())
        c = int(input())
        ## time.sleep(3)
        m = (b + c) % 60
        h = (a + ((b + c) // 60)) % 24
        #### if(m == 0):
        ####    m = 60
        print(h, m)
        `
        it("잘못된 경로 지정", () => {"Test #0 #1 #2: Error! ⚠ ... [Errno 2] No such file or directory"})
        it("주석 미제거", () => {"Test #0 #1 #2: Timeout! ⏰ ( > 2 sec )"})
        it("## 주석 제거", () => {"Test #1 : Failed! ❌ Expected: 19 0 Actual: 19 60"})
        it("##, #### 주석 제거", () => {"All testcase passed! 🎉"})
    })
})