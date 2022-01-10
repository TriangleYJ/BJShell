import dotenv from 'dotenv'
import puppeteer from 'puppeteer'
import readline from 'readline'
import fs from 'fs'
import path from 'path'
import {execSync, spawn} from 'child_process'

dotenv.config({path: '~/VSCodeProjects/BackJ/.env'}) // env path
const __dirname = path.resolve();

const langs = {
    'c99': '0',
    'c': '0',
    'go': '12',
    'node.js': '17',
    'node': '17',
    'js': '17',
    'python 3': '28',
    'py': '28',
    'python': '28',
    'd': '29',
    'text': '58',
    'ruby': '68',
    'kotlin (jvm)': '69',
    'kotlin': '69',
    'pypy3': '73',
    'swift': '74',
    'c++17': '84',
    'c++': '84',
    'cpp': '84',
    'c++17 (Clang)': '85',
    'c# 9.0 (.NET)': '86',
    'c#': '86',
    'csharp': '86',
    'java 11': '93',
    'java': '93',
    'rust 2018': '94',
    'rust': '94'
  }

class Submitter {
    constructor (id, pw){
        this.id = id
        this.pw = pw
        this.browser = null
    }
    
    async login() {
        try{
            this.browser = await puppeteer.launch({headless: false})
            this.page = await this.browser.newPage()
            await this.page.goto('https://www.acmicpc.net/login?next=%2F')
            this.page.waitForSelector('form')
            await this.page.evaluate((id, pw) => {
                document.querySelector('input[name="login_user_id"]').value = id
                document.querySelector('input[name="login_password"]').value = pw
                document.querySelector('#submit_button').click()
            }, this.id, this.pw)

            await this.page.waitForNavigation()
            let cookies = await this.page.cookies()
            await this.browser.close()

            this.browser = await puppeteer.launch({headless: true})
            this.page = await this.browser.newPage()
            await this.page.setCookie(...cookies)
        } catch (err) {
            console.log(err)
            await this.logout()
        }
    }

    async logout() {
        await this.browser.close()
        this.browser = null
        this.page = null
    }

    async submit(qnum, lang_str, ans){
        try{
            await this.page.goto('https://www.acmicpc.net/submit/'+qnum)
            await this.page.waitForTimeout(1000)
            await this.page.waitForSelector('form')
            await this.page.evaluate((lang, code) => {
                document.querySelector('#language').value = lang
                document.querySelector('.CodeMirror').CodeMirror.setValue(code)
                document.querySelector('#submit_button').click()
            }, langs[lang_str], ans)

            let finish = false
            console.log("[#" + qnum + "] Code submited.")
            await this.page.waitForTimeout(1000)

            while(!finish){
                await this.page.waitForTimeout(1000)
                let element = await this.page.$('td.result > span')
                let res = await this.page.evaluate(el => el.textContent, element)
                if(!res) break;
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write("[#" + qnum + "] " + res); // end the line
                if(res == '기다리는 중' || res.includes('채점')) finish = false
                else finish = true
            }
        } catch (err) {
            console.log(err);
            await this.logout()
        }
    }
    
}


const r = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const getBjSetting = (qnum, lang) => {
    const jsonFile = fs.readFileSync(path.join(__dirname, 'bj.json'), 'utf8').replace(/{qnum}/g, qnum)
    const settings = JSON.parse(jsonFile)
    let langOpt = settings["lang"][lang]
    return langOpt
}

let mySubmittor = null
console.log("Your ID: " + process.env.BJ_ID)

let qnum = 0
let lang = 0

let cur_process = null

r.setPrompt('BJ> ');
r.prompt()
r.on('SIGINT', function(){
    if(cur_process) cur_process.kill('SIGINT')
    else process.emit('SIGINT')
})
r.on('line', async function(line){
    if(line.trim() == "") return r.prompt()
    let seg = line.split(" ")
    if(cur_process) {
        cur_process.stdin.write(line + "\n")
        return r.prompt()
    }
    switch(seg[0]){
        case 'exit':
            if(mySubmittor) mySubmittor.logout()
            r.close()
            break;
        case 'logout':
            if(mySubmittor){
                mySubmittor.logout()
                mySubmittor = null
            }
            break
        case 'login':
            if(!mySubmittor){
                mySubmittor = new Submitter(process.env.BJ_ID, process.env.BJ_PW)
                await mySubmittor.login()
                console.log("login Succeed!")
            } else console.log('Already logined!')
            break
        case 'langs':
            for(let i in langs) console.log(`${i}`);
            break
        case 'help':
            console.log('langs: 사용 가능한 언어를 출력합니다.')
            console.log('exit: 프로그램을 종료합니다.');
            console.log('login: .env 에 저장되어 있는 ID와 PW를 불러와 백준에 로그인합니다. Recapcha가 뜨는 경우 직접 풀어주셔야 합니다.')
            console.log('submit: main이란 이름의 파일 중 상단 주석에 문제 번호 및 언어가 명시되어 있는 경우 해당 파일을 제출합니다.')
            console.log('logout: 백준 로그아웃을 합니다.')
            break
        case 'set': {
            qnum = seg[1]
            lang = seg[2]
            const langOpt = getBjSetting(qnum, lang)
            if (fs.existsSync(langOpt.target)) console.log('Target Exists! Skipping making new file...');
            else fs.copyFileSync(langOpt.template, langOpt.target)       
            console.log('Successfully set.')
            break
        }
        case 'now': {
            console.log(`qnum: ${qnum}, lang: ${lang}`)
            break
        }
        case 'unset':
            qnum = 0
            lang = 0
            console.log('Successfully Unset.')
            break
        case 's':
        case 'submit': {
            if(mySubmittor){
                if(qnum == 0) console.log('Please add the question number and language with set command.')
                else {
                    const langOpt = getBjSetting(qnum, lang)
                    const data = fs.readFileSync(langOpt.target, 'utf-8')
                    await mySubmittor.submit(qnum, lang, data)
                    console.log();
                }
            } else console.log('Not loginned!')
            break
        }
        case 'at':
        case 'autotest': {
            break;
        }
        case 't':
        case 'test': {
            const langOpt = getBjSetting(qnum, lang)

            //readline input => child_process
            if(langOpt.compile) if(execSync(langOpt.compile) != 0) console.log('An error occured during compiling')

            cur_process = spawn(...langOpt.test)
            r.setPrompt('')
            cur_process.on('exit', (code, signal) => {
                cur_process = null
                r.setPrompt('BJ> ')
                r.prompt()
            })
            cur_process.stdout.on('data', data => {
                console.log(data.toString());
            })
            cur_process.stderr.on('data', data => {
                console.log(data.toString());
            })
            
            break;
        }
        default:
            console.log('모르는 명령어입니다!');
            break;
    }
    r.prompt()
})

r.on('close', function() {
    process.exit()
})