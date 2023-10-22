import { BJShell } from "."
import fs from "fs/promises"
import chalk from "chalk"
import conf from '@/config'
import { spawn, exec, spawnSync } from 'child_process'
import { getLanguages, getProblem, language, parseTestCasesFromLocal, problem, setLanguageCommentMark } from '@/net/parse'
import { writeFile, writeMDFile, writeMainTmp } from '@/storage/filewriter'
import { table } from 'table'

interface Command {
    desc: string
    alias?: string
    func: () => Promise<void> | void
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
        console.log("Logged out")
    }

    async function set() {
        if (arg.length === 0 && that.user.getQnum() !== 0)
            arg.push(String(that.user.getQnum()))
        const val = parseInt(arg[0])
        if (arg.length !== 1 || isNaN(val) || val < 0) {
            console.log("set <question number>")
            return
        }
        const lang = that.findLang()
        if (!lang) {
            console.log("Set language first")
            return
        }
        const question = await getProblem(val, that.user.getCookies())
        if (question === null) {
            console.log("Invaild question number")
            return
        }
        // ASSERT val is valid qnum
        await that.user.setQnum(val)
        console.log(`Set question to ${chalk.yellow(arg[0] + ". " + question.title)}`)

        // TODO: Add Comment to answer sheet
        let cmark = lang.commentmark ?? ""
        if (!cmark) {
            const result = await new Promise((resolveFunc) => {
                that.r.question("We don't know comment mark of the language. Enter the comment mark. If blank, information header will not be generated.\n", (answer) => {
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

        if (await writeFile(filepath, commentHeader)) console.log(`Create new file to ${chalk.green(filepath)}`)
        else console.log("File exists! skip creating new file...")
        exec(`code ${filepath}`)
    }

    function show() {
        exec(`code ${conf.MDPATH}`)
        if (that.firstshow) {
            that.firstshow = false
            console.log("MD file opened in VSCode")
            console.log("※  If your file is not changed, press ... and click 'Refresh Preview'")
            console.log("※  If you see the raw code, not preview, follow below in VSCode.")
            console.log(`
1. Press "Ctrl+Shift+P"
2. Click "Preferences: Open User Settings (JSON)"
3. Add these lines to json file before the last }
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
            console.log("Invaild question number")
            return null
        }
        const lang = that.findLang()
        if (lang === undefined) {
            console.log("Set language first")
            return null
        }
        return [question, lang]
    }

    async function test() {
        const info = await _checkInfo()
        if (!info) return
        const [question, lang] = info
        console.log(`===== Testcase: ${question.qnum}. ${question.title} =====`)
        let success: number = 0
        // TODO: custom testcases
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
                cwd: conf.ROOTPATH
            })
            if (result.status !== 0) {
                console.log(`${lang.compile}: ${chalk.red("Compile Error!")}`)
                console.log(result.stderr?.toString())
                return
            }
        }
        
        const localtestcases = await parseTestCasesFromLocal(filepath)
        const testcases = [...question.testcases, ...localtestcases]
        for (const i in testcases) {
            const prefix = parseInt(i) >= question.testcases.length ? "(local) Test #" : "Test #"
            const t = testcases[i]
            const expected = t.output.replace(/\r\n/g, '\n')
            // default timelimit: stat.timelimit * 2
            // TODO: timelimit from language
            const timelimit: number = parseInt((question.stat.timelimit.match(/\d+/) ?? ["2"])[0]) * 2
            // FIXME: javascript error - using /dev/stdin returns ENXIO: no such device or address, open '/dev/stdin'
            const result = spawnSync(lang.run.split(" ")[0], [...lang.run.split(" ").slice(1)], {
                input: t.input,
                cwd: conf.ROOTPATH,
                timeout: timelimit * 1000
            })
            if (result.signal === "SIGTERM") console.log(chalk.red(`${prefix}${i} : Timeout! ⏰ ( > ${timelimit} sec )`))
            else if (result.status !== 0) {
                console.log(chalk.red(`${prefix}${i} : Error! ⚠`))
                console.log(result.stderr?.toString())
            } else {
                const actual = String(result.stdout).replace(/\r\n/g, '\n')
                if (actual.trim() == expected.trim()) {
                    console.log(chalk.green(`${prefix}${i} : Passed! ✅`))
                    success += 1
                }
                else {
                    console.log(chalk.red(`${prefix}${i} : Failed! ❌`))
                    console.log(`Expected: ${expected.trim()}`);
                    console.log(`Actual: ${actual.trim()}`);
                }
            }
        }
        if (success === testcases.length) console.log(chalk.green("All testcase passed! 🎉"))
        else console.log(chalk.yellow(`${success} / ${testcases.length} testcase passed`));
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
            console.log(`To set language, type ${chalk.blueBright("lang <language number>")}`)
            console.log(`Before set language, check your language extension is valid. If not, modify \`compile\` and \`run\` in ${chalk.blueBright(conf.LANGPATH)}`)
            return
        }
        if (arg.length !== 1 || isNaN(parseInt(arg[0]))) {
            console.log("lang <language number>")
            console.log("To see language list, type lang list")
            return
        } else if (!that.findLang(parseInt(arg[0]))) {
            console.log("Invaild language number")
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
            console.log(`===== Submission: ${question!.qnum}. ${question!.title} =====`)
            const filepath = `${process.cwd()}/${that.user.getQnum()}${that.findLang()?.extension ?? ""}`
            const code = await fs.readFile(filepath, 'utf-8')
            const subId = await that.user.submit(code)
            if (subId === -1) return
            console.log(`문제를 제출했습니다!`)
            for (let sec = 0; sec < 60; sec++) {
                const result = await that.user.submitStatus(subId)
                if (result === null) {
                    console.log(`Failed to get result of submission ${subId}`)
                    return
                }
                const result_num = parseInt(result.result)
                if (isNaN(result_num)) {
                    console.log(`Failed to parse result of submission ${subId}`)
                    return
                }
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                if (result_num >= 4) {
                    const info = result_num === 4 ?
                        `${chalk.green(result.result_name)} | Time: ${result.time} ms | Memory: ${result.memory} KB` :
                        `${chalk.red(result.result_name)}`
                    console.log(info)
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


    const commands = {
        "help": {
            desc: "Show help",
            func: () => {
                console.log("All Commands of BJ Shell")
                for (const [key, value] of Object.entries(commands)) {
                    let c: Command = value
                    const alias = c.alias ? ` (${chalk.yellow(c.alias)})` : ""
                    console.log(`${chalk.blueBright(key)}${alias}: ${c.desc}`)
                }
            },
            alias: "h"
        },
        "exit": {
            desc: "Exit BJ Shell",
            func: () => { that.r.close() },
            alias: "x"
        },
        "pwd": {
            desc: "Print working directory",
            func: () => { console.log(process.cwd()) }
        },
        "ls": {
            desc: "List files in current directory",
            func: ls
        },
        "cd": {
            desc: "Change directory",
            func: cd
        },
        "logout": {
            desc: "Logout from BJ",
            func: logout
        },
        "set": {
            desc: `Set question number and create or open answer file in VSCode. Also, Update problem.md file. If no argument is given, set current question number.
Usage: set <question number> or set`,
            func: set,
            alias: "s"
        },
        "show": {
            desc: "Show problem.md file in VSCode",
            func: show,
            alias: "w"
        },
        "unset": {
            desc: "Unset question number",
            func: async () => { await that.user.setQnum(0) }
        },
        "exec": {
            desc: `Execute simple external process in sh. (ex. exec python3 Main.py) Only SIGINT is handled. (Ctrl+C) Tab autocompletion, pipe and redirection is not supported.
Usage: exec <command>`,
            func: execInBJ,
            alias: "e"
        },
        "test": {
            desc: `Test your code with parsed input(s) and output(s) You can set input(s) and output(s) in problem.md file.  Also, You can add more testcases in your answer code.`,
            func: test,
            alias: "t",
        },
        "lang": {
            desc: `Show available languages or set language.
Usage: lang list or lang list <column number>
Usage: lang <language number>`,
            func: lang,
            alias: "l",
        },
        "submit": {
            desc: `Submit your code to BOJ using set language and question number in BJ Shell.`,
            func: submit,
            alias: "b",
        },
        "google": {
            desc: `Search current problem in Google`,
            func: () => console.log(`https://www.google.com/search?q=%EB%B0%B1%EC%A4%80+${that.user.getQnum()}+${encodeURIComponent(that.findLang()?.name ?? "")}`),
            alias: "g",
        }
    }

    return commands
}
