import { BJShell } from "@/shell";
import { parseTestCasesFromLocal } from "@/storage/filereader";
import { writeMainTmp } from "@/storage/filewriter";
import { spawnSync } from "child_process";
import conf from "@/config";
import chalk from "chalk";
import { checkInfo, getFilePath } from "../utils";

export default function test(that: BJShell, arg: string[]) {
  return async (hideTitle?: boolean) => {
    const info = await checkInfo(that);
    if (!info) return;
    const [question, lang] = info;
    if (!hideTitle)
      console.log(`===== 테스트: ${question.qnum}. ${question.title} =====`);
    let success: number = 0;
    const extension = lang.extension ?? "";
    const filepath = await getFilePath(that);
    if(!filepath) return;
    if (!(await writeMainTmp(filepath, extension))) return;

    // ask compile
    // const doCompile = await new Promise((resolveFunc) => {
    //     that.r.question("Compile? (y/n) ", (answer) => {
    //         resolveFunc(answer === 'y')
    //     })
    // })
    if (lang.compile && !lang.run.includes("Main" + extension)) {
      const result = spawnSync(
        lang.compile.split(" ")[0],
        [...lang.compile.split(" ").slice(1)],
        {
          cwd: conf.TESTPATH,
        }
      );
      if (result.status !== 0) {
        console.log(`${lang.compile}: ${chalk.red("컴파일 에러!")}`);
        console.log(result.stderr?.toString());
        return;
      }
    }

    const localtestcases = await parseTestCasesFromLocal(filepath);
    const testcases = [...question.testcases, ...localtestcases];
    for (const i in testcases) {
      const prefix =
        parseInt(i) >= question.testcases.length
          ? "(커스텀) 테스트 #"
          : "테스트 #";
      const t = testcases[i];
      const expected = t.output.replace(/\r\n/g, "\n").trim();
      const timeCondMatch = lang.timelimit.match(/×(\d+)(\+(\d+))?/);
      const timeCondMul = timeCondMatch ? parseInt(timeCondMatch[1]) : 1;
      const timeCondAdd = timeCondMatch ? parseInt(timeCondMatch[3]) : 0;

      const rawTimelimit: number =
        parseFloat((question.stat.timelimit.match(/\d+(\.\d+)?/) ?? ["2"])[0]);
      const timelimit = timeCondMul * rawTimelimit + timeCondAdd;
      
      // FIXME: javascript error - using /dev/stdin returns ENXIO: no such device or address, open '/dev/stdin'
      const result = spawnSync(
        lang.run.split(" ")[0],
        [...lang.run.split(" ").slice(1)],
        {
          input: t.input,
          cwd: conf.TESTPATH,
          timeout: timelimit * 1000,
        }
      );
      if (result.signal === "SIGTERM") {
        if(result?.error?.message.endsWith("ETIMEDOUT"))
          console.log(
            chalk.red(`${prefix}${i} : 시간 초과! ⏰ ( > ${timelimit} sec )`), 
          );
        else if(result?.error?.message.endsWith("ENOBUFS"))
          console.log(
            chalk.red(`${prefix}${i} : 출력 초과! 📜 ( > 200KB )`),
          );
        else
          console.log(
            chalk.red(`${prefix}${i} : 테스트를 실행할 수 없습니다! ( 에러: ${result?.error?.message} )`),
          );
      }
      else if (result.status !== 0) {
        const sigsuffix = result.signal ? ` (${result.signal})` : "";
        console.log(chalk.red(`${prefix}${i} : 런타임 에러!${sigsuffix}`));
        const out = result.stdout?.toString();
        const err = result.stderr?.toString();
        if(out) console.log(out);
        if(err) console.log(err);
      } else {
        const actual = String(result.stdout).replace(/\r\n/g, "\n")
          .split("\n").map(x => x.trim()).join("\n").trim();
        const regsuf = t.regex ? " (regex)" : "";

        // TODO: maybe unnessary?
        // for debugging, we set the limit to 100
        // if(actual.length > Math.max(3 * expected.length, 100)) {
        //   console.log(
        //     chalk.red(`${prefix}${i} : 출력 초과! 📜 ( ${actual.length} letters )`)
        //   );
        // }
        if(t.regex && new RegExp(expected).test(actual)
          || (!t.regex && actual == expected)) {
          console.log(chalk.green(`${prefix}${i} : 통과! ✅${regsuf}`));
          success += 1;
        } else {
          console.log(chalk.red(`${prefix}${i} : 실패! ❌`));
          console.log(`예상 정답: ${expected}${regsuf}`);
          console.log(`실행 결과: ${actual}`);
        }
      }
    }
    if (success === testcases.length)
      console.log(chalk.green("모든 테스트를 통과했습니다! 🎉"));
    else
      console.log(
        chalk.yellow(
          `${success} / ${testcases.length} 개의 테스트를 통과했습니다.`
        )
      );
  };
}
