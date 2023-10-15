import readline from 'readline'
import fs from 'fs/promises'
import chalk from 'chalk'
import os from 'os'
import { User } from '@/net/submit'

const r = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

//type LoginLock = NOT_LOGGED_IN | AUTO_LOGIN_TOKEN | LOGGED_IN 
type LoginLock = 0 | 1 | 2
let loginLock: LoginLock = 0

const user = new User("")

async function setPrompt() {
    if (loginLock === 0) r.setPrompt('Enter login token: ')
    else if (loginLock === 1) r.setPrompt('(Optional) Enter autologin token: ')
    else {
        const rawdir = chalk.green(process.cwd());
        const dir = rawdir.replace(os.homedir(), "~")
        r.setPrompt(`(${chalk.blueBright(await user.getUsername())}) ${dir} BJ> `)
    }
    r.prompt()
}

// TODO: classify
async function loginGuard() {
    // Check curruent token exists or vaild
    if (await user.checkLogin() === 200) return true
    console.log(`${chalk.red("Log in required")}`)
    loginLock = 0
    return false
}

// initial shell
(async () => {
    console.log(`Welcome to ${chalk.yellow("BaekJoon Shell")}`)
    console.log(`Type ${chalk.blue("help")} to get help`)
    console.log()
    await loginGuard()
    await setPrompt()
})()

// r.on('SIGINT', function(){
//     r.prompt()
// })

r.on('line', async line => {
    if (loginLock === 0) {
        user.setToken(line)
        if (await user.checkLogin() === 200) loginLock = 1
        else console.log("Invaild token")
        await setPrompt()
        return
    } else if (loginLock === 1) {
        user.setAutologin(line)
        loginLock = 2
        await setPrompt()
        return
    }
    const argv = line.split(' ')
    const cmd = argv[0]
    const arg = argv.slice(1)
    switch (cmd) {
        case '':
            break
        case 'exit':
            r.close()
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
        default:
            console.log("Unknown Command")
            break

    }
    await setPrompt()
})

r.on('close', function () {
    process.exit()
})
