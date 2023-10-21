import { BJShell } from "."
import fs from "fs/promises"
import chalk from "chalk"
import os from 'os'
import { User } from '@/net/user'
import conf from '@/config'
import { spawn, exec, spawnSync, ChildProcessWithoutNullStreams } from 'child_process'
import kill from 'tree-kill'
import { getLanguages, getProblem, language } from '@/net/parse'
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
        if (arg.length !== 1 || isNaN(parseInt(arg[0]))) {
            console.log("set <question number>")
            return
        }
        if (that.user.getLang() === -1) {
            console.log("Set language first")
            return
        }
        const question = await getProblem(parseInt(arg[0]), that.user.getCookies())
        if (question === null) {
            console.log("Invaild question number")
            return
        }
        await that.user.setQnum(parseInt(arg[0]))
        console.log(`Set question to ${chalk.yellow(arg[0] + ". " + question.title)}`)

        // TODO: Add Comment to answer sheet
        await writeMDFile(question)
        const extension = that.findLang()?.extension ?? ""
        const filepath = `${process.cwd()}/${question.qnum}${extension}`

        if (await writeFile(filepath, "")) console.log(`Create new file to ${chalk.green(filepath)}`)
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

    async function test() {
        const question = await getProblem(that.user.getQnum())
        if (question === null) {
            console.log("Invaild question number")
            return
        }
        console.log(`===== Testcase: ${question.qnum}. ${question.title} =====`)
        let success: number = 0
        // TODO: custom testcases
        const lang = that.findLang()
        if (lang === undefined) {
            console.log("Set language first")
            return
        }
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

        for (const i in question.testcases) {
            const t = question.testcases[i]
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
            if (result.signal === "SIGTERM") console.log(chalk.red(`Test #${i} : Timeout! ⏰ ( > ${timelimit} sec )`))
            else if (result.status !== 0) {
                console.log(chalk.red(`Test #${i} : Error! ⚠`))
                console.log(result.stderr?.toString())
            } else {
                const actual = String(result.stdout).replace(/\r\n/g, '\n')
                if (actual.trim() == expected.trim()){
                    console.log(chalk.green(`Test #${i} : Passed! ✅`))
                    success += 1
                }
                else {
                    console.log(chalk.red(`Test #${i} : Failed! ❌`))
                    console.log(`Expected: ${expected.trim()}`);
                    console.log(`Actual: ${actual.trim()}`);
                }
            }
        }
        if (success === question.testcases.length) console.log(chalk.green("All testcase passed! 🎉"))
        else console.log(chalk.yellow(`${success} / ${question.testcases.length} testcase passed`));
    }

    async function lang() {
        if (arg[0] == 'list') {
            const rawint = parseInt(arg[1])
            const col_num = isNaN(rawint) ? 3 : rawint
            const data = []
            for (let i = 0; i < that.langs.length; i += col_num) {
                const row = []
                for (let j = 0; j < col_num; j++) {
                    row.push(that.langs[i + j]?.name ?? "")
                    row.push(that.langs[i + j]?.extension ?? "")
                    row.push(that.langs[i + j]?.num ?? "")
                }
                data.push(row)
            }
            console.log(table(data, { drawVerticalLine: i => i % 3 === 0 }))
            console.log(`To set language, type ${chalk.blueBright("lang <language number>")}`)
            console.log(`Before set language, check your language extension is valid. If not, modify \`compile\` and \`run\` in ${chalk.blueBright(conf.LANGPATH)}`)
            return
        }
        if (arg.length !== 1 || isNaN(parseInt(arg[0])) || !that.findLang(parseInt(arg[0]))) {
            console.log("lang <language number>")
            console.log("To see language list, type lang list")
            return
        }
        await that.user.setLang(parseInt(arg[0]))
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
            func: () => { that.r.close() }
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
            func: show
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
    }

    return commands
}