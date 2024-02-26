import chalk from "chalk";
import { BJShell } from "@/shell";
import { checkInfo, getFilePath } from "../utils";
import fs from "fs/promises";
import conf from "@/config";
import subscribeChannel from "@/net/websocket";

export default function submit(that: BJShell, arg: string[]) {
  return async () => {
    const info = await checkInfo(that);
    if (!info) return;
    const [question, _] = info;
    that.r.pause();
    try {
      console.log(`===== 제출: ${question!.qnum}. ${question!.title} =====`);
      const filepath = await getFilePath(that);
      if(!filepath) return;
      const code = await fs.readFile(filepath, "utf-8");
      const subId = await that.user.submit(code);
      if (subId === -1) return;
      console.log(`문제를 제출했습니다!`);
      // const initResult = await that.user.submitStatus(subId);
      const finalResult = await subscribeChannel(subId, d => d?.result >= 4, (d) => {
        console.log(d)
      });
      console.log("final", finalResult)
      // const info =
      //   finalResult.result === 4
      //     ? `${chalk.green("ok")} | Time: ${
      //         finalResult.time
      //       } ms | Memory: ${finalResult.memory} KB`
      //     : `${chalk.red(result.result_name)}`;
      // console.log(info);
      const username = await that.user.getUsername();
      const langcode = that.findLang()?.num;
      console.log(
        `=> ${conf.URL}status?problem_id=${
          question!.qnum
        }&user_id=${username}&language_id=${langcode}&result_id=-1`
      );

      // for (let sec = 0; sec < 60; sec++) {
      //   const result = await that.user.submitStatus(subId);
      //   if (result === null) {
      //     console.log(`제출번호 ${subId} 결과를 가져오는데 실패했습니다.`);
      //     return;
      //   }
      //   const result_num = parseInt(result.result);
      //   if (isNaN(result_num)) {
      //     console.log(`제출번호 ${subId} 결과를 파싱하는데 실패했습니다.`);
      //     return;
      //   }
      //   process.stdout.clearLine(0);
      //   process.stdout.cursorTo(0);
      //   if (result_num >= 4) {
      //     const info =
      //       result_num === 4
      //         ? `${chalk.green(result.result_name)} | Time: ${
      //             result.time
      //           } ms | Memory: ${result.memory} KB`
      //         : `${chalk.red(result.result_name)}`;
      //     console.log(info);
      //     const username = await that.user.getUsername();
      //     const langcode = that.findLang()?.num;
      //     console.log(
      //       `=> ${conf.URL}status?problem_id=${
      //         question!.qnum
      //       }&user_id=${username}&language_id=${langcode}&result_id=-1`
      //     );
      //     break;
      //   }
      //   process.stdout.write(`${result.result_name} (${sec} s passed)`); // end the line
      //   await new Promise((resolve) => setTimeout(resolve, 1000));
      // }
    } catch (e) {
      if (e instanceof Error) console.log(e.message);
      else console.log(e);
    } finally {
      that.r.resume();
    }
  };
}
