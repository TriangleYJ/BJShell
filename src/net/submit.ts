import { Response } from 'node-fetch'
import { get, getResponse } from './fetch'
import * as cheerio from 'cheerio';

// Use as: checkLogin() === 200
/* export async function checkLogin(token: string): Promise<[number, Response | null]> {
    const resp = await getResponse('modify', token)
    if(resp.url.includes('login')) return [302, null]
    return [resp.status, resp]
}


export async function getUsername(): Promise<string> {
    let [code, resp] = await checkLogin()
    if (code !== 200) throw new Error("Invaild Login Token")

} */

export class User {
    static ERR_INVALID = new Error("Invalid user token")
    #token: string = ""
    username: string = ""

    constructor(token: string) {
        this.#token = token
    }

    setToken(token: string) {
        this.#token = token
    }

    async login(): Promise<[number, Response | null]> {
        const resp = await getResponse('modify', this.#token)
        if(resp.url.includes('login')) return [302, null]
        return [resp.status, resp]
    }

    async checkLogin(): Promise<number> {
        return (await this.login())[0]
    }

    async getUsername(): Promise<string> {
        if(this.username) return new Promise(resolve => resolve(this.username))
        let [c, resp] = await this.login()
        if (c !== 200) throw User.ERR_INVALID
        const $ = cheerio.load(await resp!.text())
        const uname = $(".username").text()
        this.username = uname
        return uname
    }



}