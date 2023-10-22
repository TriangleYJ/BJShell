import config from '@/config'
import { get } from './fetch'
import * as cheerio from 'cheerio';
import { loadFromLocalWithPath, saveToLocalWithPath } from '@/storage/localstorage';
import fs from 'fs/promises'

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
export interface language {
    name: string,
    num: number,
    compile: string,
    run: string,
    version: string,
    timelimit: string,
    memlimit: string,
    extension: string,
    commentmark: string,
}

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

export async function parseTestCasesFromLocal(path: string) {
    const file = await fs.readFile(path, 'utf-8')
    /* 
    - BJTestCase Parser Specification
    - srtpos = line.indexOf('<<') || line.indexOf('--'); line = line.slice(srtpos)
    - flag 0: BJTestCase not opened, 1: BJTestCase opened, 2: input opened, 3: output opened
    - I: ignore, E: error, f: flag
    - (1): inputbuf.push("\n") test_input = inputbuf.join("\n"); inputbuf = []
    - (2): outputbuf.push("\n") test_output = outputbuf.join("\n"); outputbuf = []
    - (3): inputbuf.push(line)
    - (4): outputbuf.push(line)

    State table:
    end|f   0	    1  	    2	    3
    <BJ>	f=1 	E   	E   	E
    </BJ>	E	    f=0 	E	    E
    <<	    I	    f=2	    E	    E
    --	    I	    E	    f=3,(1)	E
    >>	    I	    E   	E	    f=1,(2)
    (other)	I	    I	    (3)	    (4)	
     */
    const testcases: { input: string, output: string }[] = []
    const lines = file.split('\n')
    let input = ''
    let output = ''
    let flag = 0
    let srtpos = 0
    const syntaxError = (msg: string, lineidx: number) => {
        console.log(`BJTestcase Syntax Error: ${msg} in line ${lineidx}`)
        return []
    }
    for (let lineidx = 0; lineidx < lines.length; lineidx++) {
        const line = lines[lineidx]
        if (line.endsWith('<<')) {
            if (flag >= 2) return syntaxError('<<', lineidx)
            else if (flag === 1) {
                srtpos = line.indexOf('<<')
                flag = 2
            }
        }
        else if (line.endsWith('--')) {
            if (flag % 2 === 1) return syntaxError('--', lineidx)
            else if (flag === 2) {
                srtpos = line.indexOf('--')
                flag = 3
            }

        }
        else if (line.endsWith('>>')) {
            if (flag === 1 || flag === 2) return syntaxError('>>', lineidx)
            else if (flag === 3) {
                flag = 1
                testcases.push({ input: input, output: output.replace(/\n$/, '') })
                input = ''
                output = ''
            }
        }
        else if (line.toLowerCase().endsWith('<bjtestcase>')) {
            if (flag === 0) flag = 1
            else return syntaxError('<BJTestCase>', lineidx)
        }
        else if (line.toLowerCase().endsWith('</bjtestcase>')) {
            if (flag === 1) flag = 0
            else return syntaxError('</BJTestCase>', lineidx)
        }
        else if (flag === 2) input += line.slice(srtpos) + '\n'
        else if (flag === 3) output += line.slice(srtpos) + '\n'
    }
    if(testcases.length > 0) console.log(`${testcases.length} testcases found in local`)
    return testcases
}

export async function getLanguages(forceLoad?: boolean): Promise<language[]> {
    if (!forceLoad) {
        if (langsCache.length > 0) return langsCache
        const langs = await loadFromLocalWithPath(config.LANGPATH, 'langs')
        if (langs) {
            langsCache.push(...langs)
            return langs
        }
    }

    const LANG_COMMENTS_HARDCODED = [
        [".js", "//"],      // JavaScript
        [".py", "#"],       // Python
        [".java", "//"],    // Java
        [".cc", "//"],      // C++
        [".cpp", "//"],     // C++
        [".cs", "//"],      // CSharp
        [".c", "//"],       // C
        [".php", "//"],     // PHP
        [".rb", "#"],       // Ruby
        [".swift", "//"],   // Swift
        [".go", "//"],      // Go
        [".ts", "//"],      // TypeScript
        [".rs", "//"],      // Rust
        [".kt", "//"],      // Kotlin
        [".dart", "//"],    // Dart
        [".lua", "--"],     // Lua
        [".sh", "#"],       // Shell Script
        [".vb", "'"],       // Visual Basic
        [".pl", "#"],       // Perl
        [".scala", "//"],   // Scala
        [".matlab", "%"],   // MATLAB
        [".r", "#"],        // R
    ];
    const [sts, html] = await get("", "", config.LANGURL)
    if (sts !== 200) {
        console.log(sts)
        console.log("Failed to get language list from BOJ")
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

        // find extension from `Main.*` in compile or run
        const ext_compile = compile.match(/Main\.[a-zA-Z0-9]+/g)
        const ext_run = run.match(/Main\.[a-zA-Z0-9]+/g)
        //if(ext_compile && ext_run && (ext_compile[0] != ext_run[0])) console.log(`Warning: ${name} has different extension in compile and run (compile: ${ext_compile[0]}, run: ${ext_run[0]}))`)
        const extension = (ext_compile ? ext_compile[0] : ext_run ? ext_run[0] : '').replace('Main', '')
        if (!extension) console.log(`Warning: ${name} has no extension`)
        const commentmark = LANG_COMMENTS_HARDCODED.find(x => x[0] === extension)?.[1] ?? ''

        arr.push({
            name, num, compile, run, version, timelimit, memlimit, extension, commentmark
        })
    }
    console.log()
    console.log(`Loaded ${arr.length} languages from BOJ`)
    console.log(`❗ Some languages' extension may be wrong or empty. Please check via "lang list" command.`)

    await saveToLocalWithPath(config.LANGPATH, 'langs', arr)
    langsCache.push(...arr)
    return arr
}

export function getLanguage(langnum: number): language | undefined {
    return langsCache.find(x => x.num === langnum)
}

export function setLanguageCommentMark(langnum: number, commentmark: string) {
    const langIdx = langsCache.findIndex(x => x.num === langnum)
    if (langIdx < 0) return false
    langsCache[langIdx].commentmark = commentmark
    console.log(langsCache[langIdx].commentmark)

    saveToLocalWithPath(config.LANGPATH, 'langs', langsCache)
}

export async function getCSRFToken(cookie: string, qnum: number): Promise<string | null> {
    const [sts, html] = await get(`${config.SUBMIT}${qnum}`, cookie ?? undefined)
    if (sts === 200) {
        const $ = cheerio.load(html)
        const csrf = $('input[name=csrf_key]').val()?.toString()
        if (csrf) return csrf
    }
    return null
}

export function getSubmissionId(html: string): number {
    const $ = cheerio.load(html)
    const m = $("tbody > tr:nth-child(1) > td:nth-child(1)").text()
    const val = parseInt(m)
    if (!isNaN(val)) return val
    return -1
}
// (async () => {
//     console.log(await getLanguage())})()