import os from 'os'
import fs from 'fs/promises'
import conf from '@/config'
import { problem } from '@/net/parse'
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown'


export async function writeMDFile(problem: problem) {
    const md = NodeHtmlMarkdown.translate(problem.html, {
        blockElements: ["pre"],
    })
    // save md file to ~/.bjshell/problem.md
    // ASSERT '~/.bjshell' exists - via login
    const configPath = `${os.homedir()}/.bjshell/problem.md`
    await fs.writeFile(configPath, md)

}