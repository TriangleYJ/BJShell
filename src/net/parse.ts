import config from '../config'
import fetch from 'node-fetch'

interface problem {
    qnum: number,
    stat: HTMLTableElement,
    prob: HTMLParagraphElement,
    input_explain: HTMLParagraphElement,
    output_explain: HTMLParagraphElement,
    testcases: [{ input: string, output: string }]
    hint: HTMLParagraphElement,
}

export async function getResponse(url: string) {
    return fetch(url, {
        "headers": {
            "user-agent": config.USER_AGENT
        },
        "method": "GET"
    })
}

export async function get(url: string) {
    return (await getResponse(url)).text()
}

export function getProblemRaw(qnum: number): HTMLDivElement {
    throw new Error("Not impl")
}

export function getProblemObj(qnum: number): problem {
    throw new Error("Not impl")
}
