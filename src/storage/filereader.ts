import fs from 'fs/promises'
import config from '@/config'

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
    const testcases: { input: string, output: string, regex?: boolean}[] = []
    const lines = file.split('\n')
    let input = ''
    let output = ''
    let flag = 0
    let regexmode = false;
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
        else if (line.endsWith('--') || line.endsWith('==')) {
            regexmode = line.endsWith('==')
            if (flag % 2 === 1) return syntaxError('-- or ==', lineidx)
            else if (flag === 2) {
                srtpos = regexmode ? line.indexOf('==') : line.indexOf('--')
                flag = 3
            }
        }
        else if (line.endsWith('>>')) {
            if (flag === 1 || flag === 2) return syntaxError('>>', lineidx)
            else if (flag === 3) {
                flag = 1
                testcases.push({ input: input, output: output.replace(/\n$/, ''), regex: regexmode })
                input = ''
                output = ''
                regexmode = false
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
    // if(testcases.length > 0) console.log(`${testcases.length} testcases found in local`)
    return testcases
}

export async function readTemplateFromLocal(extension: string): Promise<string | undefined> {
    const path = `${config.TEMPLATEPATH}/Main${extension}`
    try {
        const template = await fs.readFile(path, 'utf-8')
        return template
    } catch (e) {
        if (e instanceof Error) {
            if (e.message.includes('ENOENT')) return undefined
            console.log(e.message)
        }
        else console.log(e)
    }
}