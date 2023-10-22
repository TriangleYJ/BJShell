import readline from 'readline'
import chalk from 'chalk'
import os from 'os'
import { User } from '@/net/user'
import { ChildProcessWithoutNullStreams } from 'child_process'
import kill from 'tree-kill'
import { getLanguage, getLanguages, language } from '@/net/parse'
import acquireAllCommands from './command'

//type LoginLock = NOT_LOGGED_IN | AUTO_LOGIN_TOKEN | LOGGED_IN 
type LoginLock = 0 | 1 | 2

export class BJShell {
    r = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    user = new User("")
    cp: ChildProcessWithoutNullStreams | null = null
    #loginLock: LoginLock = 2
    #prevCommand = ""
    firstshow = true

    findLang(num?: number): language | undefined {
        return getLanguage(num ?? this.user.getLang())
    }

    setLoginLock(lock: LoginLock) {
        this.#loginLock = lock
    }

    async setPrompt(cmd?: string) {
        if (this.#loginLock === 0) this.r.setPrompt('Enter login token: ')
        else if (this.#loginLock === 1) this.r.setPrompt('(Optional) Enter autologin token: ')
        else {
            const rawdir = chalk.green(process.cwd());
            const dir = rawdir.replace(os.homedir(), "~")
            const curLangName = this.findLang()?.name ?? ""
            const prefix = `👤 ${chalk.blueBright(await this.user.getUsername())}`
                + (this.user.getQnum() ? ` | 🚩 ${chalk.yellow(this.user.getQnum())}` : "")
                + (this.user.getLang() !== -1 ? ` | 🌐 ${chalk.yellow(curLangName)}` : "")
            this.r.setPrompt(`(${prefix}) ${dir} BJ> `)
        }
        if (cmd !== 'exec') this.r.prompt()
    }

    async #loginGuard() {
        // Check curruent token exists or vaild
        if (await this.user.checkLogin() === 200) return true
        console.log(`${chalk.red("Log in required")}`)
        console.log(`If you don't know how to find your token, refer here: https://github.com/TriangleYJ/Beakjoon-VSC`)
        this.setLoginLock(0)
        return false
    }

    async #loginGuardOnLine(line: string) {
        if (this.#loginLock === 2) return false
        if (this.#loginLock === 0) {
            await this.user.setToken(line)
            if (await this.user.checkLogin() === 200) this.setLoginLock(1)
            else console.log("Invaild token")
            await this.setPrompt()
        } else if (this.#loginLock === 1) {
            await this.user.setAutologin(line)
            this.#loginLock = 2
            console.log(chalk.green("Login success"))
            console.log()
            await getLanguages(true)
            await this.setPrompt()
        }
        return true
    }


    #initOn() {
        this.r.on('line', async line => {
            if (this.cp) { // prior handling 1: child process stdin
                this.cp.stdin.write(line + '\n');
                return
            }
            if (await this.#loginGuardOnLine(line)) return // prior handling 2: login guard

            line = line.trim()
            if (line === '.') line = this.#prevCommand

            const argv = line.split(' ')
            let cmd = argv[0]
            const arg = argv.slice(1)
            const commands = acquireAllCommands(this, cmd, arg)
            const commAlias = Object.values(commands).find(x => x.alias === cmd)
            if (commAlias) await commAlias.func()
            else if (commands[cmd]) await commands[cmd].func()
            else if (cmd !== "") console.log("Unknown Command")

            await this.setPrompt()
            this.#prevCommand = line
            return
        })

        this.r.on('close', function () {
            process.exit()
        })

        // Handle Ctrl+C (SIGINT) to send it to the child process
        this.r.on('SIGINT', async () => {
            if (this.cp === null) {
                console.log()
                // FIXME: clear input buffer
                await this.setPrompt()
            }
            else kill(this.cp.pid ?? 0, 'SIGINT', (err: any) => {
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
        await this.user.loadProperties()
        if (await this.#loginGuard()) await getLanguages()
        await this.setPrompt()
    }
}
