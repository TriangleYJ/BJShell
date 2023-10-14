import readline from 'readline'
import fs from 'fs/promises'

const r = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})



r.setPrompt('BJ Shell> ');
// TODO: classify
r.prompt();

// r.on('SIGINT', function(){
//     r.close()
// })

r.on('line', async line => {
    const argv = line.split(' ')
    const cmd = argv[0]
    const arg = argv.slice(1)
    switch (cmd) {
        case '':
            break
        case 'exit':
            r.close()
            break
        case 'help':
            console.log("BJ Shell Help")
            break
        case 'pwd':
            // show current directory
            console.log(process.cwd())
            break
        case 'ls':
            // show current directory's files
            console.log(await fs.readdir(process.cwd()))
            break
        default:
            console.log("Unknown Command")
            break

    }
    r.prompt()
})

r.on('close', function() {
    process.exit()
})
