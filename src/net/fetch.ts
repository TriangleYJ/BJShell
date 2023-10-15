import config from '@/config'
import fetch from 'node-fetch'

export async function getResponse(path: string, cookie?: string) {
    return fetch(config.URL + path, {
        "headers": {
            "user-agent": config.USER_AGENT,
            "Referer": "https://www.acmicpc.net/",
            "Cookie": cookie ?? ""
        },
        "method": "GET"
    })
}


export async function get(url: string) {
    return (await getResponse(url)).text()
}
