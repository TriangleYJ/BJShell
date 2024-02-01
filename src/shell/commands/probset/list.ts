import { BJShell } from "@/shell";
import { gridSelector } from "@/shell/utils";
import { loadFromLocal } from "@/storage/localstorage";
import chalk from "chalk";
import set from "../set";

export default function probset_list(that: BJShell, arg: string[]) {
  return async () => {
    const probsObj = await loadFromLocal("ps");
    if (!probsObj) {
      console.log("저장된 문제 셋이 없습니다.");
      return;
    }
    const title = chalk.yellow(`문제집 이름: ${probsObj.title} (${probsObj.probset.length} 문제)`) + "\n" + probsObj?.url;
    const choices = probsObj.probset.map((x: [number, string]) => `${x[0]}. ${x[1]}`);
    const curProbIdx = probsObj.probset.findIndex((x: [number, string]) => x[0] == that.user.getQnum());
    const select = await gridSelector(that, choices, curProbIdx, title);
    if(curProbIdx !== select) await set(that, arg)(probsObj.probset[select][0]);
  }
}
