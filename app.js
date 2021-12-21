import dotenv from 'dotenv'
import puppeteer from 'puppeteer'
dotenv.config()

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
            }, process.env.BJ_ID, process.env.BJ_PW)

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

            await this.page.waitForTimeout(1000)
            let finish = false
            console.log("")
            console.log("Code submited.")


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


//let str = ``

const ans1 = ``;


(async () => {
    const mySubmittor = new Submitter(process.env.BJ_ID, process.env.BJ_PW)
    await mySubmittor.login();
    await mySubmittor.submit("2557", "node.js", 'console.log("Hello World!")')
    await mySubmittor.submit('15990', "Python 3", ans1)
    await mySubmittor.submit("2557", "Python 3", 'print("Hello World!")')
    await mySubmittor.logout();
})();
