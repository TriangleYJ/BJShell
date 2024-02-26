import os from 'os'

export default {
    URL: 'https://www.acmicpc.net/',
    PROB: 'problem/',
    PLIST: 'problemset/',
    USER: 'user/',
    SUBMIT: 'submit/',
    SUBMITSTAT: 'status/ajax',
    SUBMITSTATWS: 'wss://ws-ap1.pusher.com/app/a2cb611847131e062b32?protocol=7&client=js&version=4.2.2&flash=false',
    MODIFY: 'modify',
    LANGURL: 'https://help.acmicpc.net/language/info',
    MDPATH: `${os.homedir()}/.bjshell/problem.md`,
    CONFPATH: `${os.homedir()}/.bjshell/config.json`,
    LANGPATH: `${os.homedir()}/.bjshell/lang.json`,
    ROOTPATH: `${os.homedir()}/.bjshell`,
    TEMPLATEPATH: `${os.homedir()}/.bjshell/Template`,
    TESTPATH: `${os.homedir()}/.bjshell/.testspace`,

    // PROBLEM_MD: '.bjshell/problem.md',
    // CONFIG: '.bjshell/config.json',
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36',
}