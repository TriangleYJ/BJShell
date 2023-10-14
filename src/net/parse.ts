import config from '../config'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio';

interface problem {
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
    testcases: { input: string, output: string }[]
    hint: string,
}

export async function getResponse(path: string) {
    return fetch(config.URL + path, {
        "headers": {
            "user-agent": config.USER_AGENT
        },
        "method": "GET"
    })
}

export async function get(url: string) {
    return (await getResponse(url)).text()
}

export async function getProblem(qnum: number): Promise<problem> {
    const html = await get(`${config.PROB}${qnum}`)
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
    for(let i = 1;; i++) {
        const input = $(`#sampleinput${i} > pre`).text()
        const output = $(`#sampleoutput${i} > pre`).text()
        if(input == "" && output == "") break
        testcases.push({input: input, output: output})
    }

    const wsr = (s: string) => s.replace(/\xA0/g, " ")

    return {
        qnum: qnum,
        title: $('#problem_title').text(),
        parsed_date: new Date(),
        stat: out_stat,
        prob: wsr($('#problem_description').text()).trim(),
        input_explain: wsr($('#problem_input').text()).trim(),
        output_explain: wsr($('#problem_output').text()).trim(),
        testcases: testcases,
        hint: wsr($('#problem_hint').text()).trim(),
    }
}
