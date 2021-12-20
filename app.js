import dotenv from 'dotenv'
import axios from 'axios'
import puppeteer from 'puppeteer'
dotenv.config()

const langs = {0: 'C99', 12: 'Go', 17: 'node.js', 28: 'Python 3', 29: 'D', 58: 'Text', 68: 'Ruby', 69: 'Kotlin (JVM)', 73: 'PyPy3', 74: 'Swift', 84: 'C++17', 85: 'C++17 (Clang)', 86: 'C# 9.0 (.NET)', 93: 'Java 11', 94: 'Rust 2018'}

const qnum = "2557"
const lang_id = 17
const ansjs = 'print("Hello World!")'
const ans = 'console.log("Hello World!")'

//TODO: recapcha problem
//TODO: execute in runtime

const myloc = async(qnum, lang_id, ans) => {
    try{
        const browser = await puppeteer.launch({headless: false})
        const page = await browser.newPage()
        await page.goto('https://www.acmicpc.net/login?next=%2F')
        page.waitForSelector('form')
        await page.evaluate((id, pw) => {
            document.querySelector('input[name="login_user_id"]').value = id
            document.querySelector('input[name="login_password"]').value = pw
            document.querySelector('#submit_button').click()
        }, process.env.BJ_ID, process.env.BJ_PW)
        
        await page.waitForTimeout(10000)
        await page.goto('https://www.acmicpc.net/submit/'+qnum)
        await page.waitForSelector('form')
        await page.evaluate((lang, code) => {
            document.querySelector('#language').value = lang
            document.querySelector('.CodeMirror').CodeMirror.setValue(code)
            document.querySelector('#submit_button').click()
        }, lang_id, ans)
        await page.waitForTimeout(1000)
        let finish = false

        console.log("Code submited.")
        console.log("=== #" + qnum + " Evaluation Result ===")


        while(!finish){
            await page.waitForTimeout(1000)
            let element = await page.$('td.result > span')
            let res = await page.evaluate(el => el.textContent, element)
            if(!res) break;
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(res); // end the line
            if(res == '기다리는 중' || res.includes('채점')) finish = false
            else finish = true
        }
        await browser.close()

    } catch(err) {
        console.log(err)
        await browser.close()
    }
};


let str = ``
myloc(15990, 28, str);

