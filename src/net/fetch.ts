import config from '@/config'
import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent';
import { loadFromLocalWithPath } from '@/storage/localstorage';

let __proxy: string | null | undefined = null;
async function getProxy() {
    if(__proxy === null) __proxy = await loadFromLocalWithPath(config.CONFPATH, "proxy");
    return __proxy ? new HttpsProxyAgent(__proxy) : undefined;
}

export async function getResponse(path: string, cookie?: string, url?: string) {
    //console.log("Fetch called:", url, path)
    return fetch(url ?? config.URL + path, {
        "headers": {
            "user-agent": config.USER_AGENT,
            "Referer": config.URL,
            "Cookie": cookie ?? ""
        },
        "method": "GET",
        agent: await getProxy(),
    })
}

export async function postResponse(path: string, body: string, cookie: string, headers?: { [key: string]: string }) {
    return fetch(config.URL + path, {
        "headers": {
            "user-agent": config.USER_AGENT,
            "content-type": "application/x-www-form-urlencoded, charset=UTF-8",
            "Referer": config.URL,
            ...headers,
            "cookie": cookie ?? ""
        },
        "body": body,
        "method": "POST",
        agent: await getProxy(),
    })
}


export async function get(path: string, cookie?: string, url?: string): Promise<[number, string]> {
    const r = await getResponse(path, cookie, url)
    return [r.status, await r.text()]
}
