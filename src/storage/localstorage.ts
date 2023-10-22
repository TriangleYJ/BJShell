import fs from 'fs/promises'
import { existsSync } from 'fs'
import conf from '@/config'

export async function saveToLocal(name: string, value: any) {
    // save variable to ~/.bjshell
    await saveToLocalWithPath(conf.CONFPATH, name, value)
}

export async function saveToLocalWithPath(path: string, name: string, value: any) {
    // save variable to ~/.bjshell
    const configPath = path
    let config: any = {}
    try {
        config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
    } catch (e) {
        if (e instanceof Error) {
            if (e.message.includes('ENOENT')) {
                if (!existsSync(conf.ROOTPATH)) {
                    await fs.mkdir(conf.ROOTPATH);
                }
                await fs.writeFile(configPath, JSON.stringify(config))
            } else console.log(e.message)
        } else console.log(e)
    }
    config[name] = value
    await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

export async function loadFromLocal(name: string) {
    return await loadFromLocalWithPath(conf.CONFPATH, name)
}

export async function loadFromLocalWithPath(path: string, name: string) {
    const configPath = path
    try {
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
        return config[name]
    } catch (e) {
        if (e instanceof Error) {
            if (e.message.includes('ENOENT')) return
            console.log(e.message)
        }
        else console.log(e)
    }
    return undefined
}
