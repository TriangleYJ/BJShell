import config from '@/config'
import { get } from './fetch'
import * as cheerio from 'cheerio';

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

const problemCache: { [key: number]: problem } = {}

export async function getProblem(qnum: number): Promise<problem | null> {
    if (problemCache[qnum]) return problemCache[qnum]
    const wsr = (s: string) => s.replace(/\xA0/g, " ")
    const [sts, html] = await get(`${config.PROB}${qnum}`)
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