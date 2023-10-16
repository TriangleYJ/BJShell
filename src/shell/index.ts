import readline from 'readline'
import fs from 'fs/promises'
import chalk from 'chalk'
import os from 'os'
import { User } from '@/net/user'
import child_process from 'child_process'
import { loadFromLocal, saveToLocal } from '@/shell/localstorage'
import kill from 'tree-kill'

//type LoginLock = NOT_LOGGED_IN | AUTO_LOGIN_TOKEN | LOGGED_IN 
type LoginLock = 0 | 1 | 2

export class BJShell {
    r = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    #loginLock: LoginLock = 2
    #user = new User("")
    #cp : child_process.ChildProcessWithoutNullStreams | null = null
    #prevCommand = ""

    async setPrompt(cmd?: string) {
        if (this.#loginLock === 0) this.r.setPrompt('Enter login token: ')
        else if (this.#loginLock === 1) this.r.setPrompt('(Optional) Enter autologin token: ')
        else {
            const rawdir = chalk.green(process.cwd());
            const dir = rawdir.replace(os.homedir(), "~")
            const prefix = `👤 ${chalk.blueBright(await this.#user.getUsername())}`
                + (this.#user.qnum ? ` | 🚩 ${chalk.yellow(this.#user.qnum)}` : "")
            this.r.setPrompt(`(${prefix}) ${dir} BJ> `)
        }
        if (cmd !== 'exec') this.r.prompt()
    }

    async #loginGuard() {
        // Check curruent token exists or vaild
        if (await this.#user.checkLogin() === 200) return true
        console.log(`${chalk.red("Log in required")}`)
        console.log(`If you don't know how to find your token, refer here: https://google.com`)
        this.#loginLock = 0
        return false
    }

    async #loginGuardOnLine(line: string) {
        if (this.#loginLock === 2) return false
        if (this.#loginLock === 0) {
            this.#user.setToken(line)
            if (await this.#user.checkLogin() === 200) {
                this.#loginLock = 1
                await saveToLocal('token', line)
            }
            else console.log("Invaild token")
            await this.setPrompt()
        } else if (this.#loginLock === 1) {
            this.#user.setAutologin(line)
            this.#loginLock = 2
            await saveToLocal('autologin', line)
            await this.setPrompt()
        }
        return true
    }

    #initOn() {
        this.r.on('line', async line => {
            if (this.#cp) { // prior handling 1: child process stdin
                this.#cp.stdin.write(line + '\n');
                return
            }
            if (await this.#loginGuardOnLine(line)) return // prior handling 2: login guard
            line = line.trim()
            if (line === '.') line = this.#prevCommand
            const argv = line.split(' ')
            let cmd = argv[0]
            const arg = argv.slice(1)
            // TODO: sepearte command and explain
            switch (cmd) {
                case '':
                    break
                case 'exit':
                    this.r.close()
                    break
                case 'help':
                    console.log("BJ Shell Help")
                    break
                case 'pwd':
                    console.log(process.cwd())
                    break
                case 'ls':
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
                    break
                case 'cd':
                    try {
                        process.chdir(arg[0])
                    } catch (e) {
                        if (e instanceof Error) console.log(e.message)
                        else console.log(e)
                    }
                    break
                case 'logout':
                    this.#user.setToken("")
                    this.#user.setAutologin("")
                    await saveToLocal('token', "")
                    await saveToLocal('autologin', "")
                    this.#loginLock = 0
                    console.log("Logged out")
                    break
                case 'set':
                    if (arg.length !== 1 || isNaN(parseInt(arg[0]))) {
                        console.log("set <question number>")
                        break
                    }
                    this.#user.qnum = parseInt(arg[0])
                    await saveToLocal('qnum', arg[0])
                    break
                case 'unset':
                    this.#user.qnum = 0
                    await saveToLocal('qnum', "0")
                    break
                case 'exec':
                    if (arg.length === 0) {
                        console.log("exec <command>")
                        break
                    }
                    // https://velog.io/@dev2820/nodejs%EC%9D%98-%EC%9E%90%EC%8B%9D%ED%94%84%EB%A1%9C%EC%84%B8%EC%8A%A4
                    // https://kisaragi-hiu.com/nodejs-cmd/
                    // FIXME: stdio full sync

                    // should support below
                    // exec read hello; echo hello;
                    // exec sleep 2; echo 1; sleep 2; echo 2;
                    // exec zsh: not perfect
                    // 
                    const command = arg.join(' ')
                    this.#cp = child_process.spawn('bash', ['-c', command])
                    await new Promise((resolveFunc) => {
                        this.#cp!.stdout?.on("data", (x: string) => {
                            process.stdout.write(x.toString());
                        });
                        this.#cp!.stderr?.on("data", (x: string) => {
                            process.stderr.write(x.toString());
                        });
                        this.#cp!.on("exit", (code: number) => {
                            resolveFunc(code);
                        });
                    });
                    this.#cp = null
                    break
                case 't':
                    console.log('t')
                    return
                default:
                    console.log("Unknown Command")
                    break

            }
            await this.setPrompt()
            this.#prevCommand = line
        })

        this.r.on('close', function () {
            process.exit()
        })

        // Handle Ctrl+C (SIGINT) to send it to the child process
        this.r.on('SIGINT', async () => {
            if (this.#cp === null) {
                console.log()
                // FIXME: clear input buffer
                await this.setPrompt()
            }
            else kill(this.#cp.pid ?? 0, 'SIGINT', (err: any) => {
                if (err) {
                    if (err instanceof Error) console.log(err.message)
                    else console.log(err)
                }
            })
        });

    }

    async init() {
        this.#initOn()

        console.log(`Welcome to ${chalk.yellow("BaekJoon Shell")}`)
        console.log(`Type ${chalk.blue("help")} to get help`)
        console.log()

        // Load config
        const token = await loadFromLocal('token')
        const autologin = await loadFromLocal('autologin')
        const qnum = await loadFromLocal('qnum')
        if (token) {
            this.#user.setToken(token)
            if (autologin) this.#user.setAutologin(autologin)
        }
        if (qnum) this.#user.qnum = parseInt(qnum)

        await this.#loginGuard()
        await this.setPrompt()
    }
}
