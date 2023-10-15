import readline from 'readline'
import fs from 'fs/promises'
import chalk from 'chalk'
import os from 'os'
import { User } from '@/net/user'
import child_process from 'child_process'
import { loadFromLocal, saveToLocal } from '@/shell/localstorage'

//type LoginLock = NOT_LOGGED_IN | AUTO_LOGIN_TOKEN | LOGGED_IN 
type LoginLock = 0 | 1 | 2

export class BJShell {
    r = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    #loginLock: LoginLock = 2
    #user = new User("")

    async setPrompt() {
        if (this.#loginLock === 0) this.r.setPrompt('Enter login token: ')
        else if (this.#loginLock === 1) this.r.setPrompt('(Optional) Enter autologin token: ')
        else {
            const rawdir = chalk.green(process.cwd());
            const dir = rawdir.replace(os.homedir(), "~")
            const prefix = `👤 ${chalk.blueBright(await this.#user.getUsername())}`
                + (this.#user.qnum ? ` | 🚩 ${chalk.yellow(this.#user.qnum)}` : "")
            this.r.setPrompt(`(${prefix}) ${dir} BJ> `)
        }
        this.r.prompt()
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
            if (await this.#loginGuardOnLine(line)) return
            const argv = line.split(' ')
            const cmd = argv[0]
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
                    
                    break

                default:
                    console.log("Unknown Command")
                    break

            }
            await this.setPrompt()
        })

        this.r.on('close', function () {
            process.exit()
        })

        // r.on('SIGINT', function(){
        //     r.prompt()
        // })

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
        if(qnum) this.#user.qnum = parseInt(qnum)

        await this.#loginGuard()
        await this.setPrompt()
    }
}
