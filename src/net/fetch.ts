import config from '@/config'
import fetch from 'node-fetch'

export async function getResponse(path: string, token?: string) {
    return fetch(config.URL + path, {
        "headers": {
            "user-agent": config.USER_AGENT,
            "Referer": "https://www.acmicpc.net/",
            "Cookie": token ? `OnlineJudge=${token};` : ""
        },
        "method": "GET"
    })
}


export async function get(url: string) {
    return (await getResponse(url)).text()
}
