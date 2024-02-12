import { BJShell } from "@/shell";
import test from "./test";
import { checkInfo, getFilePath } from "../utils";
import { existsSync } from "fs";
import chokidar from "chokidar";
import chalk from "chalk";
import submit from "./submit";
import probset_select from "./probset/select";
import probset_list from "./probset/list";

export default function testwatch(that: BJShell, arg: string[]) {
  return async () => {
    const info = await checkInfo(that);
    if (!info) return;
    const [question, lang] = info;
    console.log(`===== Test: ${question.qnum}. ${question.title} =====`);
    const filepath = await getFilePath(that);
    if (!filepath) return;
    await new Promise((resolveFunc) => {
      console.log(filepath);
      const monitor = chokidar.watch(filepath, { persistent: true });
      that.monitor = monitor;
      let test_lock = false;
      monitor.on("change", async function (f) {
        if (f === filepath) {
          if (test_lock) return;
          test_lock = true;
          await new Promise((resolve) => setTimeout(resolve, 200));
          console.log();
          console.log(
            chalk.yellow(
              `파일 ${f
                .split("/")
                .pop()} 가 변동되었습니다. 다시 테스트 합니다...`
            )
          );
          await test(that, arg)(true);
          test_lock = false;
        }
      });
      resolveFunc(0);
    });

    that.changelineModeToKeypress(async (key, data) => {
      if (data.name === "x") {
        await that.revertlineModeFromKeypress();
      } else if (data.name === "b") {
        console.log();
        await submit(that, arg)();
      } else if (data.name === "n") {
        console.log();
        await that.revertlineModeFromKeypress();
        await probset_select(that, arg)(true);
        await testwatch(that, arg)();
      } else if (data.name === "p") {
        console.log();
        await that.revertlineModeFromKeypress();
        await probset_select(that, arg)(false);
        await testwatch(that, arg)();
      }
    });

    await test(that, arg)(true);
    console.log();
    console.log(chalk.yellow("파일이 변동될 때까지 감시합니다..."));
    console.log(
      chalk.yellow(
        "만약 감시를 중단하고 싶다면, Ctrl+C를 누르거나 x를 입력하십시오."
      )
    );
  };
}
