import config from '@/config'
import fetch from 'node-fetch'

export async function getResponse(path: string, cookie?: string, url?: string) {
    //console.log("Fetch called:", url, path)
    return fetch(url ?? config.URL + path, {
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


export async function get(path: string, cookie?: string, url?: string): Promise<[number, string]> {
    const r = await getResponse(path, cookie, url)
    return [r.status, await r.text()]
}
