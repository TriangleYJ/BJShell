import fs from 'fs/promises'
import conf from '@/config'

export async function saveToLocal(name: string, value: string) {
    // save variable to ~/.bjshell
    const configPath = conf.CONFPATH
    let config: any = {}
    try {
        config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
    } catch (e) {
        if (e instanceof Error) {
            if (e.message.includes('ENOENT')) {
                await fs.mkdir(conf.ROOTPATH)
                await fs.writeFile(configPath, JSON.stringify(config))
            } else console.log(e.message)
        } else console.log(e)
    }
    config[name] = value
    await fs.writeFile(configPath, JSON.stringify(config))
}

export async function loadFromLocal(name: string) {
    const configPath = conf.CONFPATH
    try {
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
        return config[name]
    } catch (e) {
        if (e instanceof Error) {
            if(e.message.includes('ENOENT')) return
            console.log(e.message)
        }
        else console.log(e)
    }
    return undefined
}
