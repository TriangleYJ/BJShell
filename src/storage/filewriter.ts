import os from 'os'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import conf from '@/config'
import { problem } from '@/net/parse'
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown'
import * as cheerio from 'cheerio';


export async function writeMDFile(problem: problem) {
    const $ = cheerio.load(problem.html)
    const content = $('body > div.wrapper > div.container.content > div.row')

    // 1. Pre-work: DOM Manipulation
    const tag = $(".problem-label");
    const preElements = $("pre");

    [tag, preElements].forEach(x => x.each(function () { // make label and <pre> tag to <code> tag
        var content = $(this).html();
        content = "<code>" + content + "</code>";
        $(this).html(content);
    }))

    $(".table-responsive").parent().prepend(tag) // move label to top

    // make link to h1
    content.find('h1').html(`<a href="${conf.URL}${conf.PROB}${problem.qnum}">${$('#problem_title').text()}</a>`)
    // move tier icon to table
    $('#problem-info thead tr').prepend('<th>티어</th>');
    $('#problem-info tbody tr').prepend('<td></td>');
    const icon = $("blockquote > .solvedac-tier")
    const targetTd = $('#problem-info tbody tr:first-child td:eq(0)')
    targetTd.append(icon)


    content.find('.page-header > blockquote').remove() // remove unnecessary blockquote
    content.find('.problem-menu').remove(); // remove upper nav problem menu
    content.find('.copy-button').remove(); // remove copy button from h2 title
    content.find('[style*="display: none;"]').remove(); // remove hidden base64 elements

    [['a', 'href'], ['img', 'src']].forEach(([tag, attr]) => { // replace link to absolute path
        $(tag).each(function () { 
            var href = $(this).attr(attr);

            if (href && href.startsWith('/')) {
                var absolutePath = conf.URL.slice(0, -1) + href;
                $(this).attr(attr, absolutePath);
            }
        });
    })


    // 2. save md file to ~/.bjshell/problem.md
    // ASSERT '~/.bjshell' exists - via login
    const md = NodeHtmlMarkdown.translate(content.html() ?? "")
    await fs.writeFile(conf.MDPATH, md)
}

export async function writeFile(path: string, content: string, force?: boolean) {
    if(!force && existsSync(path)) return false
    await fs.writeFile(path, content)
    return true
}

export async function writeMainTmp(src: string, ext: string) {
    // copy file in src and overwrite to ~/.bjshell/Main.${extension}
    const path = `${conf.ROOTPATH}/Main${ext}`
    try{
        await fs.copyFile(src, path)
    } catch(e) {
        if(e instanceof Error) console.log(e.message)
        else console.log(e)
        return false
    }
    return true
}