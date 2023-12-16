import { BJShell } from "."
import fs from "fs/promises"
import { existsSync } from "fs"
import chalk from "chalk"
import conf from '@/config'
import { spawn, exec, spawnSync } from 'child_process'
import { getLanguages, getProblem, getProblemSet, language, problem, setLanguageCommentMark } from '@/net/parse'
import { parseTestCasesFromLocal, readTemplateFromLocal } from '@/storage/filereader'
import { writeFile, writeMDFile, writeMainTmp } from '@/storage/filewriter'
import { table } from 'table'
import chokidar from 'chokidar'
import { loadFromLocal, saveToLocal } from "@/storage/localstorage"

interface Command {
    desc: string
    alias?: string
    func: () => Promise<void> | void
    important?: boolean
}

export default function acquireAllCommands(that: BJShell, cmd: string, arg: string[]): { [key: string]: Command } {

    async function ls() {
        try {
            const files = await fs.readdir(process.cwd())
            let output = ""
            for (const file of files) {
                const isDir = (await fs.stat(file)).isDirectory()
                output += `${isDir ? chalk.blue(file) : file}   `
            }
            console.log(output)
        } catch (e) {
            if (e instanceof Error) console.log(e.message)
            else console.log(e)
        }
    }

    function cd() {
        try {
            const path = arg[0] ?? ""
            process.chdir(path)
        } catch (e) {
            if (e instanceof Error) console.log(e.message)
            else console.log(e)
        }
    }

    async function logout() {
        await that.user.setToken("")
        await that.user.setAutologin("")
        that.setLoginLock(0)
        console.log("로그아웃 되었습니다.")
    }

    async function set(num?: number) {
        let val = num
        if(val === undefined) {
            if (arg.length === 0 && that.user.getQnum() !== 0) val = that.user.getQnum()
            else {
                const tmp_val = parseInt(arg[0])
                if (!isNaN(tmp_val) && tmp_val >= 0) val = tmp_val
            }
            if (!val) {
                console.log("set <question number>")
                return
            }
        }
        const lang = that.findLang()
        if (!lang) {
            console.log("lang 명령어를 통해 먼저 언어를 선택해 주세요.")
            return
        }
        const question = await getProblem(val, that.user.getCookies())
        if (question === null) {
            console.log("유효하지 않은 문제 번호입니다!")
            return
        }
        // ASSERT val is valid qnum
        await that.user.setQnum(val)
        console.log(`문제가 ${chalk.yellow(val + ". " + question.title)}로 설정되었습니다.`)

        let cmark = lang.commentmark ?? ""
        if (!cmark) {
            const result = await new Promise((resolveFunc) => {
                that.r.question("현재 언어의 주석 문자를 모르겠습니다. 주석 문자를 입력해 주세요. 만약 입력을 안할경우, 문제 정보 헤더가 생성되지 않습니다. \n", (answer) => {
                    resolveFunc(answer)
                })
            })
            cmark = result as string
            setLanguageCommentMark(lang.num, cmark)
        }
        const username = await that.user.getUsername()
        const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60 * 1000);
        const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
        const kr_curr = new Date(utc + (KR_TIME_DIFF));
        const commentHeader = cmark ? `${cmark}
${cmark}        ${question.qnum}. ${question.title} <${conf.URL}${conf.PROB}${question.qnum}>
${cmark}        
${cmark}        By: ${username} <${conf.URL}${conf.USER}${username}>
${cmark}        Language: ${lang.name ?? ""}
${cmark}        Created at: ${kr_curr.toLocaleString()}
${cmark}        
${cmark}        Auto-generated by BJShell
${cmark}
`
            : ""
        await writeMDFile(question)
        const extension = lang.extension ?? ""
        const filepath = `${process.cwd()}/${question.qnum}${extension}`
        const langTemplate = (await readTemplateFromLocal(extension)) ?? ""

        if (await writeFile(filepath, commentHeader + langTemplate)) console.log(`${chalk.green(filepath)}에 새로운 답안 파일을 생성했습니다.`)
        else console.log("파일이 존재합니다! 이전 파일을 불러옵니다.")
        exec(`code ${filepath}`)
    }

    function show() {
        exec(`code ${conf.MDPATH}`)
        if (that.firstshow) {
            that.firstshow = false
                console.log("VSCode에 문제 파일을 열었습니다.")
                console.log("※ 만약 문제 MD 파일이 바뀌지 않는다면, ... 버튼을 클릭 후 'Refresh Preview' 버튼을 클릭해 주세요." )
                console.log("※ 만약 미리보기가 아닌 코드가 보인다면 VSCode 상에서 다음 설정을 진행해 주세요.")
                console.log(`
1. "Ctrl+Shift+P" 를 누르세요
2. "Preferences: Open User Settings (JSON) 를 클릭하세요."
3. json 파일의 마지막 } 이전에 다음 코드를 복사해서 붙여넣으세요.
    , // don't forget the comma
    "workbench.editorAssociations": {   
        "*.md": "vscode.markdown.preview.editor",
    }
`)
        }
    }

    async function execInBJ() {
        if (arg.length === 0) {
            console.log("exec <command>")
            return
        }
        // https://velog.io/@dev2820/nodejs%EC%9D%98-%EC%9E%90%EC%8B%9D%ED%94%84%EB%A1%9C%EC%84%B8%EC%8A%A4
        // https://kisaragi-hiu.com/nodejs-cmd/
        // FIXME: stdio full sync

        const command = arg.join(' ')
        that.r.setPrompt('')
        that.cp = spawn(command, [], { shell: true })
        await new Promise((resolveFunc) => {
            that.cp!.stdout?.on("data", (x: string) => {
                process.stdout.write(x.toString());
            });
            that.cp!.stderr?.on("data", (x: string) => {
                process.stderr.write(x.toString());
            });
            that.cp!.on("exit", (code: number) => {
                resolveFunc(code);
            });
        });
        that.cp = null
    }

    async function _checkInfo(): Promise<[problem, language] | null> {
        const question = await getProblem(that.user.getQnum())
        if (question === null) {
            console.log("유효하지 않은 문제 번호입니다!")
            return null
        }
        const lang = that.findLang()
        if (lang === undefined) {
            console.log("lang 명령어를 통해 먼저 언어를 선택해 주세요.")
            return null
        }
        return [question, lang]
    }

    async function test(hideTitle?: boolean) {
        const info = await _checkInfo()
        if (!info) return
        const [question, lang] = info
        if (!hideTitle) console.log(`===== 테스트: ${question.qnum}. ${question.title} =====`)
        let success: number = 0
        const extension = lang.extension ?? ""
        const filepath = `${process.cwd()}/${question.qnum}${extension}`
        if (!await writeMainTmp(filepath, extension)) return

        // ask compile
        // const doCompile = await new Promise((resolveFunc) => {
        //     that.r.question("Compile? (y/n) ", (answer) => {
        //         resolveFunc(answer === 'y')
        //     })
        // })
        if (lang.compile && !lang.run.includes('Main' + extension)) {
            const result = spawnSync(lang.compile.split(" ")[0], [...lang.compile.split(" ").slice(1)], {
                cwd: conf.TESTPATH
            })
            if (result.status !== 0) {
                console.log(`${lang.compile}: ${chalk.red("컴파일 에러!")}`)
                console.log(result.stderr?.toString())
                return
            }
        }

        const localtestcases = await parseTestCasesFromLocal(filepath)
        const testcases = [...question.testcases, ...localtestcases]
        for (const i in testcases) {
            const prefix = parseInt(i) >= question.testcases.length ? "(커스텀) 테스트 #" : "테스트 #"
            const t = testcases[i]
            const expected = t.output.replace(/\r\n/g, '\n')
            // default timelimit: stat.timelimit * 2
            // TODO: timelimit from language
            const timelimit: number = parseInt((question.stat.timelimit.match(/\d+/) ?? ["2"])[0]) * 2
            // FIXME: javascript error - using /dev/stdin returns ENXIO: no such device or address, open '/dev/stdin'
            const result = spawnSync(lang.run.split(" ")[0], [...lang.run.split(" ").slice(1)], {
                input: t.input,
                cwd: conf.TESTPATH,
                timeout: timelimit * 1000
            })
            if (result.signal === "SIGTERM") console.log(chalk.red(`${prefix}${i} : 시간 초과! ⏰ ( > ${timelimit} sec )`))
            else if (result.status !== 0) {
                console.log(chalk.red(`${prefix}${i} : 에러! ⚠`))
                console.log(result.stderr?.toString())
            } else {
                const actual = String(result.stdout).replace(/\r\n/g, '\n')
                if (actual.trim() == expected.trim()) {
                    console.log(chalk.green(`${prefix}${i} : 통과! ✅`))
                    success += 1
                }
                else {
                    console.log(chalk.red(`${prefix}${i} : 실패! ❌`))
                    console.log(`예상 정답: ${expected.trim()}`);
                    console.log(`실행 결과: ${actual.trim()}`);
                }
            }
        }
        if (success === testcases.length) console.log(chalk.green("모든 테스트를 통과했습니다! 🎉"))
        else console.log(chalk.yellow(`${success} / ${testcases.length} 개의 테스트를 통과했습니다.`));
    }

    async function testWatch() {
        const info = await _checkInfo()
        if (!info) return
        const [question, lang] = info
        console.log(`===== Test: ${question.qnum}. ${question.title} =====`)
        const extension = lang.extension ?? ""
        const filepath = `${process.cwd()}/${question.qnum}${extension}`

        if (!existsSync(filepath)) {
            console.log("파일이 존재하지 않습니다!")
            return
        }

        await new Promise((resolveFunc) => {
            console.log(filepath)
            const monitor = chokidar.watch(filepath, { persistent: true })
            that.monitor = monitor
            monitor.on("change", async function (f) {
                if (f.includes(`${question.qnum}${extension}`)) {
                    console.log()
                    console.log(chalk.yellow(`파일 ${f.split("/").pop()} 가 변동되었습니다. 다시 테스트 합니다...`))
                    await test(true)
                }
            })
            resolveFunc(0)
        })

        that.changelineModeToKeypress(async (key, data) => {
            if (data.name === 'x') {
                await that.revertlineModeFromKeypress()
            } else if (data.name === 'b') {
                console.log()
                await submit()
            }
        })

        await test(true)
        console.log()
        console.log(chalk.yellow("파일이 변동될 때까지 감시합니다..."))
        console.log(chalk.yellow("만약 감시를 중단하고 싶다면, Ctrl+C를 누르거나 x를 입력하십시오."))
    }

    async function lang() {
        if (arg[0] == 'list') {
            const rawint = parseInt(arg[1])
            const col_num = isNaN(rawint) ? 3 : rawint
            const data = []
            const langs = await getLanguages()
            for (let i = 0; i < langs.length; i += col_num) {
                const row = []
                for (let j = 0; j < col_num; j++) {
                    row.push(langs[i + j]?.name ?? "")
                    row.push(langs[i + j]?.extension ?? "")
                    row.push(langs[i + j]?.num ?? "")
                }
                data.push(row)
            }
            console.log(table(data, { drawVerticalLine: i => i % 3 === 0 }))
            console.log(`원하는 언어를 사용하기 위해서 ${chalk.blueBright("lang <language number>")}를 타이핑하세요.`)
            console.log(`언어를 사용하기 전에, 자동으로 불러온 언어 설정이 유효한지 확인하세요. 그렇지 않으면, ${chalk.blueBright(conf.LANGPATH)} 파일의 \`compile\` 과 \`run\` 명령어를 수동으로 바꿔주셔야 합니다.`)
            return
        }
        if (arg.length !== 1 || isNaN(parseInt(arg[0]))) {
            console.log("lang <language number>")
            console.log("언어 목록을 보고 싶다면 lang list를 타이핑하세요.")
            return
        } else if (!that.findLang(parseInt(arg[0]))) {
            console.log("유효하지 않은 언어 번호입니다.")
            return
        }
        await that.user.setLang(parseInt(arg[0]))
    }

    async function submit() {
        const info = await _checkInfo()
        if (!info) return
        const [question, _] = info
        that.r.pause()
        try {
            console.log(`===== 제출: ${question!.qnum}. ${question!.title} =====`)
            const filepath = `${process.cwd()}/${that.user.getQnum()}${that.findLang()?.extension ?? ""}`
            const code = await fs.readFile(filepath, 'utf-8')
            const subId = await that.user.submit(code)
            if (subId === -1) return
            console.log(`문제를 제출했습니다!`)
            for (let sec = 0; sec < 60; sec++) {
                const result = await that.user.submitStatus(subId)
                if (result === null) {
                    console.log(`제출번호 ${subId} 결과를 가져오는데 실패했습니다.`)
                    return
                }
                const result_num = parseInt(result.result)
                if (isNaN(result_num)) {
                    console.log(`제출번호 ${subId} 결과를 파싱하는데 실패했습니다.`)
                    return
                }
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                if (result_num >= 4) {
                    const info = result_num === 4 ?
                        `${chalk.green(result.result_name)} | Time: ${result.time} ms | Memory: ${result.memory} KB` :
                        `${chalk.red(result.result_name)}`
                    console.log(info)
                    const username = await that.user.getUsername()
                    const langcode = that.findLang()?.num
                    console.log(`\n=> ${conf.URL}status?problem_id=${question!.qnum}&user_id=${username}&language_id=${langcode}&result_id=-1`)
                    break
                }
                process.stdout.write(`${result.result_name} (${sec} s passed)`); // end the line
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        } catch (e) {
            if (e instanceof Error) console.log(e.message)
            else console.log(e)
        } finally {
            that.r.resume()
        }
    }


    async function probset() {
        // if(arg[0] == )
        switch(arg[0]) {
            case 'set':
            case 's': {
                if(arg.length == 1) {
                    console.log("probset set <number>")
                    return
                }
                const probsObj = await loadFromLocal("ps")
                if(!probsObj) {
                    console.log("저장된 문제 셋이 없습니다.")
                    return
                }
                const val = parseInt(arg[1])
                if (isNaN(val) || val < 0 || val >= probsObj.probset.length) {
                    console.log("probset set <number>")
                    return
                }
                await set(probsObj.probset[val][0])
                break
            }
            case 'clear':
            case 'c': {
                await saveToLocal("ps", undefined)
                console.log("문제 셋을 초기화했습니다.")
                break
            }
            case 'next':
            case 'n': {
                const probsObj = await loadFromLocal("ps")
                if(!probsObj) {
                    console.log("저장된 문제 셋이 없습니다.")
                    return
                }
                const qnum = that.user.getQnum()
                const idx = probsObj.probset.findIndex((x: [number, string]) => x[0] == qnum)
                if(idx == -1) {
                    console.log("현재 문제가 저장된 문제 셋에 없습니다.")
                    return
                }
                if(idx == probsObj.probset.length - 1) {
                    console.log("마지막 문제입니다.")
                    return
                }
                await set(probsObj.probset[idx + 1][0])
                break
            }
            case 'prev':
            case 'p': {
                const probsObj = await loadFromLocal("ps")
                if(!probsObj) {
                    console.log("저장된 문제 셋이 없습니다.")
                    return
                }
                const qnum = that.user.getQnum()
                const idx = probsObj.probset.findIndex((x: [number, string]) => x[0] == qnum)
                if(idx == -1) {
                    console.log("현재 문제가 저장된 문제 셋에 없습니다.")
                    return
                }
                if(idx == 0) {
                    console.log("첫번째 문제입니다.")
                    return
                }
                await set(probsObj.probset[idx - 1][0])
                break
            }
            case 'list':
            case 'l': {
                const probsObj = await loadFromLocal("ps")
                if(!probsObj) {
                    console.log("저장된 문제 셋이 없습니다.")
                    return
                }
                const data = []
                data.push(["번호", "제목"])
                console.log(`${probsObj.title}: 문제 ${probsObj.probset.length}개`)
                for(const prob of probsObj.probset) {
                    const qnum = prob[0]
                    const title = prob[1]
                    if(qnum == that.user.getQnum()) {
                        data.push([chalk.green(qnum), chalk.green(title)])
                    } else {
                        data.push([qnum, title])
                    }
                }
                console.log(table(data))
                break
            }
            default: {
                const urlReg = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
                if(!urlReg.test(arg[0])) {
                    console.log("올바른 URL이 아닙니다.")
                    return
                }
                const probset = await getProblemSet(arg[0])
                if(probset.length == 0) {
                    console.log("문제가 없습니다.")
                    return
                }
                const probsetTitle = arg[1] ? arg.slice(1).join(' ') : 'My Problem Set'
                const probsObj = {
                    title: probsetTitle,
                    probset
                }
                await saveToLocal("ps", probsObj)
                console.log(`${probsetTitle}: 문제 ${probset.length}개를 저장했습니다.`)
                console.log("첫번째 문제를 불러오고 있습니다...")

                await set(probset[0][0])
                break
            }
        }

    }

    function help(commands: { [key: string]: Command }) {
        if (arg[0] == 'all') {
            const data = []
            data.push(["단축어", "명령어", "설명"])
            for (const key in commands) {
                const cmd = commands[key]
                data.push([cmd.alias ?? "", key, cmd.desc])
            }
            console.log(table(data))
        } if (arg[0] == 'testcase')  {
            console.log(
`${chalk.yellow("커스텀 테스트 케이스 문법 설명")}
각 언어의 주석에 <BJTestcase> </BJTestcase> 태그 를 삽입합니다. 해당 태그 밖에 있는 테스트케이스는 무시됩니다.
주석의 종류(라인, 블록)는 상관없으며 , 태그의 대소문자는 구분하지 않습니다.
해당 태그 안에 있는 일반 문자들은 무시됩니다. 테스트케이스를 설명하는데 사용할 수 있습니다.
해당 태그 안에 다음과 같은 방식으로 테스트케이스 입출력 쌍을 추가할 수 있습니다.
    << 와 -- 사이에 있는 문자(개행문자 포함)는 입력으로, >> 와 -- 는 출력 결과로 인식됩니다.
    << 혹은 -- 다음에 오는 문자는 <<, -- 와 반드시 들여쓰기 공백 (탭) 개수를 일치시켜야 합니다.
    << (input) -- (output) >> 가 하나의 테스트케이스이며, 태그에 여러개의 테스트케이스를 추가할 수 있습니다.
커스텀 테스트케이스 실행 결과에 (커스텀) 이라는 접두어가 붙습니다.

${chalk.green(`예시) 1000.py

"""
<BJTestcase>
1. 음수가 포함된 덧셈
    <<
    -1 1
    --
    0
    >>

2. 큰수의 덧셈
    <<
    999999999999 1
    ---
    1000000000000
    >>
</BJTestcase>
"""
a, b = map(int, input().split())
print(a + b)
`)}
`
            )
        } else if (arg.length === 0) {
            const data = []
            data.push(["단축어", "명령어", "설명"])
            for (const key in commands) {
                const cmd = commands[key]
                if(cmd.important) data.push([cmd.alias ?? "", key, cmd.desc])
            }
            console.log(table(data))
            console.log("모든 명령어를 보려면 'help all' 를 타이핑하세요.")
            console.log("커스텀 테스트케이스 문법을 보려면 'help testcase' 를 타이핑하세요.")
        }
        
    }


    const commands = {
        "help": {
            // desc: "Show help.",
            desc: "명령어를 보여줍니다. 전체 명령어를 보려면 'help all' 을 타이핑하세요.",
            func: () => help(commands),
            alias: "h",
            important: true
        },
        "exit": {
            desc: "BJ Shell을 종료합니다.",
            func: () => { that.r.close() },
            alias: "x"
        },
        "pwd": {
            desc: "현재 디렉토리를 보여줍니다.",
            func: () => { console.log(process.cwd()) }
        },
        "ls": {
            desc: "현재 디렉토리의 파일 목록을 보여줍니다.",
            func: ls
        },
        "cd": {
            desc: "디렉토리를 이동합니다. (cd <path>)",
            func: cd
        },
        "logout": {
            desc: "BJ Shell을 로그아웃합니다.",
            func: logout
        },
        "set": {
            desc: `VSCode에서 문제 번호를 설정하고 답안 파일을 새로 만들거나 엽니다.
또한 문제 파일을 업데이트합니다. 인수가 없으면 현재 문제 번호를 설정합니다.
.bjshell/Template/Main.*에 템플릿 파일이 있으면 파일을 만들 때 템플릿을 로드합니다.
사용법: set <question number> or set`,
            func: set,
            alias: "s",
            important: true
        },
        "show": {
            desc: "VSCode에서 문제 파일(problem.md)을 엽니다.",
            func: show,
            alias: "o",
            important: true
        },
        "unset": {
            desc: "현재 문제 번호를 초기화합니다.",
            func: async () => { await that.user.setQnum(0) }
        },
        "exec": {
            desc: `외부 프로세스를 실행합니다. (ex. exec python3 Main.py) (ex. e rm *.py)
SIGINT(Ctrl+C)만 처리됩니다. 파이프 등 복잡한 쉘 기능은 지원하지 않습니다.
사용법: exec <command>`,
            func: execInBJ,
            alias: "e"
        },
        "test": {
            desc: `문제에서 제공하는 테스트케이스를 사용하여 코드를 테스트합니다.
테스트케이스는 문제 파일(problem.md)에 기록되어 있습니다.
또한, 답안 파일에 커스텀 테스트케이스를 추가할 수 있습니다. (자세한 내용은 "help testcase" 를 참고하세요.)`,
            func: test,
            alias: "t",
        },
        "watch": {
            desc: `test 명령어와 동일하지만, 파일 변동을 감지하여 자동으로 테스트를 재실행합니다.
watch 모드에서는 "b" 와 "x" 명령어를 사용할 수 있습니다.
b: 즉시 제출합니다. (submit 명령어와 동일)
x: watch 모드를 종료합니다. (Ctrl + C 와 동일)`,
            func: testWatch,
            alias: "w",
            important: true
        },
        "lang": {
            desc: `사용 가능한 언어를 보여줍니다. 언어를 설정하려면 lang <언어 번호> 를 타이핑하세요.
사용법: lang list or lang list <column number>
사용법: lang <language number>`,
            func: lang,
            alias: "l",
            important: true
        },
        "submit": {
            desc: `현재 문제 번호와 언어를 사용하여 BOJ에 코드를 제출합니다.`,
            func: submit,
            alias: "b",
            important: true
        },
        "google": {
            desc: `현재 문제를 구글에서 검색합니다. (링크 제공)`,
            func: () => console.log(`https://www.google.com/search?q=%EB%B0%B1%EC%A4%80+${that.user.getQnum()}+${encodeURIComponent(that.findLang()?.name ?? "")}`),
            alias: "g",
        },
        "probset": {
            desc: `URL로부터 백준 문제들을 불러옵니다.
사용법:
probset <url> <title?> - url 내 존재하는 백준문제 하이퍼링크들을 파싱해 title 이름으로 문제 셋을 지정합니다.
probset set <number> (or probset s) - n번째 문제를 선택합니다.
probset clear (or probset c)- 저장된 문제 셋을 초기화합니다. 
probset next (or probset n) - 다음 문제로 넘어갑니다.
probset prev (or probset p) - 이전 문제로 넘어갑니다.
probset list (or probset l) - 문제 셋 내 문제 리스트와 현재 선택된 문제를 보여줍니다.
`,
            func: probset,
            alias: "ps",
        }
    }

    return commands
}