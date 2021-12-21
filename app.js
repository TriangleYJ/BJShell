import dotenv from 'dotenv'
import puppeteer from 'puppeteer'
import readline from 'readline'
import fs from 'fs'
import path from 'path';
dotenv.config({path: '~/VSCodeProjects/BackJ/.env'}) // env path
const __dirname = path.resolve();

const langs = {
    'C99': '0',
    'Go': '12',
    'node.js': '17',
    'Python 3': '28',
    'D': '29',
    'Text': '58',
    'Ruby': '68',
    'Kotlin (JVM)': '69',
    'PyPy3': '73',
    'Swift': '74',
    'C++17': '84',
    'C++17 (Clang)': '85',
    'C# 9.0 (.NET)': '86',
    'Java 11': '93',
    'Rust 2018': '94'
  }

//TODO: recapcha problem
//TODO: execute in runtime

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
let mySubmittor = null
console.log("Your ID: " + process.env.BJ_ID)

r.setPrompt('BJ> ');
r.prompt()
r.on('line', async function(line){
    switch(line) {
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
            } else console.log('Already logined!');
            break
        case 'langs':
            for(let i in langs) console.log(`${i}`);
            break;
        case 'help':
            console.log('langs: 사용 가능한 언어를 출력합니다.');
            console.log('exit: 프로그램을 종료합니다.');
            console.log('login: .env 에 저장되어 있는 ID와 PW를 불러와 백준에 로그인합니다. Recapcha가 뜨는 경우 직접 풀어주셔야 합니다.')
            console.log('submit: main이란 이름의 파일 중 상단 주석에 문제 번호 및 언어가 명시되어 있는 경우 해당 파일을 제출합니다.')
            console.log('logout: 백준 로그아웃을 합니다.')
            break;
        case 's':
        case 'submit':
            let regx = /bj[ ]*=[ ]*({.*})/
            let default_name = 'main'
            const dirents = fs.readdirSync(__dirname, {withFileTypes: true})
            const fileNames = dirents.filter(dirent => dirent.isFile()).map(dirent => dirent.name);
            const one = fileNames.filter(x => path.parse(x).name == 'main')[0]
            if(one){
                const data = fs.readFileSync(path.join(__dirname, one), 'utf-8')
                const fline = data.split(/\r?\n/)[0]
                const regxm = regx.exec(fline)
                try{
                    const meta = JSON.parse(regxm[1])
                    if(mySubmittor){
                        await mySubmittor.submit(meta.qnum, meta.language, data)
                    } else console.log('Not loginned!');
                } catch(e) {
                    console.log("invalid first line!")
                }
            }
    }
    console.log()
    r.prompt()
})

r.on('close', function() {
    process.exit()
})