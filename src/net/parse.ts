import config from '@/config'
import { get } from './fetch'
import * as cheerio from 'cheerio';
import { loadFromLocal, loadFromLocalWithPath, saveToLocal, saveToLocalWithPath } from '@/storage/localstorage';

export interface problem {
    qnum: number,
    title: string,
    parsed_date: Date,
    stat: {
        timelimit: string,
        memlimit: string,
        submit: string,
        solved: string,
        solved_user: string,
        solved_percent: string,
    },
    prob: string,
    input_explain: string,
    output_explain: string,
    testcases: { input: string, output: string, explain?: string }[]
    hint?: string,
    problem_limit?: string,
    html: string
}

export interface language {
    name: string,
    num: number,
    compile: string,
    run: string,
    version: string,
    timelimit: string,
    memlimit: string,
    code1000: string,
}

const problemCache: { [key: number]: problem } = {}
const langsCache: language[] = []

export async function getProblem(qnum: number, cookie?: string): Promise<problem | null> {
    if (problemCache[qnum]) return problemCache[qnum]
    const wsr = (s: string) => s.replace(/\xA0/g, " ")
    const [sts, html] = await get(`${config.PROB}${qnum}`, cookie ?? undefined)
    if (sts !== 200) return null
    const $ = cheerio.load(html)
    const table = $('#problem-info')
    const out_stat = {
        timelimit: table.find('tr:nth-child(1) > td:nth-child(1)').text(),
        memlimit: table.find('tr:nth-child(1) > td:nth-child(2)').text(),
        submit: table.find('tr:nth-child(1) > td:nth-child(3)').text(),
        solved: table.find('tr:nth-child(1) > td:nth-child(4)').text(),
        solved_user: table.find('tr:nth-child(1) > td:nth-child(5)').text(),
        solved_percent: table.find('tr:nth-child(1) > td:nth-child(6)').text(),
    }
    const testcases = []
    for (let i = 1; ; i++) {
        const input = $(`#sampleinput${i} > pre`).text()
        const output = $(`#sampleoutput${i} > pre`).text()
        if (input == "" && output == "") break
        const explain = wsr($(`#sample_explain_${i}`).text())
        testcases.push(explain ? { input: input, output: output, explain: explain } : { input: input, output: output })
    }
    const title = $('#problem_title').text()
    const rawHtml = $('body')

    const problem = {
        qnum: qnum,
        title,
        parsed_date: new Date(),
        stat: out_stat,
        prob: wsr($('#problem_description').text()).trim(),
        input_explain: wsr($('#problem_input').text()).trim(),
        output_explain: wsr($('#problem_output').text()).trim(),
        testcases: testcases,
        hint: wsr($('#problem_hint').text()).trim() || undefined,
        problem_limit: wsr($('#problem_limit').text()).trim() || undefined,
        html: rawHtml.html() || ""
    }
    problemCache[qnum] = problem
    return problem
}

export async function getLanguages(forceLoad?: boolean): Promise<language[]> {
    if (!forceLoad) {
        if(langsCache.length > 0) return langsCache
        const langs = await loadFromLocalWithPath(config.LANGPATH, 'langs')
        if (langs) return langs
    }
    const [sts, html] = await get("", "", config.LANGURL)
    if (sts !== 200) {
        console.log(sts)
        console.log("Failed to get language list")
        return []
    }
    const $ = cheerio.load(html)
    const arr = []
    for (let c of $(`.card`)) {
        const name = $(c).find('header').text()
        let num = 0;
        let compile = '';
        let run = '';
        let version = '';
        let timelimit = '';
        let memlimit = '';
        let code1000 = '';
        const li = $(c).find('li')
        for (let l of li) {
            let lt = $(l).text();
            let tags = ['언어 번호: ', '컴파일: ', '실행: ', '버전: ', '시간 제한: ', '메모리 제한: ']
            for (let i in tags) {
                if (lt.startsWith(tags[i])) {
                    lt = lt.replace(tags[i], '')
                    switch (i) {
                        case '0': num = parseInt(lt); break
                        case '1': compile = lt; break
                        case '2': run = lt; break
                        case '3': version = lt; break
                        case '4': timelimit = lt; break
                        case '5': memlimit = lt; break
                        default:
                            break
                    }
                }
            }
        }
        // FIXME: code1000 not working -> for testing
        // $(c).find('.CodeMirror-gutter-wrapper').remove();
        // code1000 = $(c).find('.CodeMirror-code').text();
        arr.push({
            name, num, compile, run, version, timelimit, memlimit, code1000
        })
    }
    await saveToLocalWithPath(config.LANGPATH, 'langs', arr)
    langsCache.push(...arr)
    return arr
}

// (async () => {
//     console.log(await getLanguage())})()