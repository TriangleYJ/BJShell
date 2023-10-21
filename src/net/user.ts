import { Response } from 'node-fetch'
import { getResponse, postResponse } from './fetch'
import * as cheerio from 'cheerio';
import config from '@/config'
import { loadFromLocal, saveToLocal } from '@/storage/localstorage';
import { getProblem, problem } from './parse';

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
    #autologin: string = ""
    #username: string = ""
    #qnum: number = 0
    curprob: problem | null = null
    #lang: number = -1

    constructor(token: string) {
        this.#token = token
    }

    async setToken(token: string) {
        this.#token = token
        await saveToLocal('token', token)
    }

    async setAutologin(autologin: string) {
        this.#autologin = autologin
        await saveToLocal('autologin', autologin)
    }

    // setter for qnum, lang
    async setQnum(qnum: number, problem?: problem) {
        this.#qnum = qnum
        this.curprob = problem ?? null
        await saveToLocal('qnum', qnum)
    }

    async setLang(lang: number) {
        this.#lang = lang
        await saveToLocal('lang', lang)
    }

    getQnum(): number {
        return this.#qnum
    }

    getLang(): number {
        return this.#lang
    }

    getCookies(): string {
        return `OnlineJudge=${this.#token}; bojautologin=${this.#autologin};`
    }

    async login(): Promise<[number, Response | null]> {
        const resp = await getResponse(config.MODIFY, this.getCookies())
        if(resp.url.includes('login')) return [302, null]
        return [resp.status, resp]
    }

    async checkLogin(): Promise<number> {
        return (await this.login())[0]
    }

    async getCurProblem(): Promise<problem | null> {
        if(this.#qnum !== this.curprob?.qnum) this.curprob = await getProblem(this.#qnum, this.getCookies())
        return this.curprob
    }

    async submit(code: string): Promise<Response> {
        const csrf = (await this.getCurProblem())?.csrf
        if(!csrf) console.log("Submit failed, csrf_token not found")
        const resp = await postResponse(`${config.SUBMIT}${this.#qnum}`, `problem_id=${this.#qnum}&language=${this.#lang}&code_open=close&source=${encodeURIComponent(code)}&csrf_key=${csrf}`, this.getCookies())
        if(resp.status !== 200) console.log("Submit failed, status code: " + resp.status)
        return resp
    }

    async getUsername(): Promise<string> {
        if(this.#username) return new Promise(resolve => resolve(this.#username))
        let [c, resp] = await this.login()
        if (c !== 200) throw User.ERR_INVALID
        const $ = cheerio.load(await resp!.text())
        const uname = $(".username").text()
        this.#username = uname
        return uname
    }

    
    async loadProperties(): Promise<void> {
        const token = await loadFromLocal('token')
        const autologin = await loadFromLocal('autologin')
        const qnum = await loadFromLocal('qnum')
        const curlang = await loadFromLocal('lang')
        if(token !== undefined) await this.setToken(token)
        if(autologin !== undefined) await this.setAutologin(autologin)
        if(qnum !== undefined) this.#qnum = qnum
        if(curlang !== undefined) this.#lang = curlang
    }
        


}