import config from '@/config'
import fetch from 'node-fetch'

export async function getResponse(path: string, cookie?: string) {
    return fetch(config.URL + path, {
        "headers": {
            "user-agent": config.USER_AGENT,
            "Referer": config.URL,
            "Cookie": cookie ?? ""
        },
        "method": "GET"
    })
}

export async function postResponse(path: string, body: string, cookie: string) {
    return fetch(config.URL + path, {
        "headers": {
            "user-agent": config.USER_AGENT,
            "Referer": config.URL,
            "Cookie": cookie ?? ""
        },
        "body": body,
        "method": "POST"
    })
}


export async function get(path: string, cookie?: string): Promise<[number, string]> {
    const r = await getResponse(path, cookie)
    return [r.status, await r.text()]
}
