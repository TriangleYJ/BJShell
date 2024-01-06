import { BJShell } from "@/shell";
import { loadFromLocal } from "@/storage/localstorage";
import chalk from "chalk";
import { table } from "table";

export default function probset_list(that: BJShell, arg: string[]) {
  return async () => {
    const probsObj = await loadFromLocal("ps");
    if (!probsObj) {
      console.log("저장된 문제 셋이 없습니다.");
      return;
    }
    console.log(chalk.yellow(`문제집 이름: ${probsObj.title}`));
    console.log(chalk.blue(`링크: ${probsObj?.url}`));
    const data = [];
    const col = 3;
    const row = Math.ceil(probsObj.probset.length / col);
    for (let i = 0; i < row; i++) {
      const rowdata = [];
      for (let j = 0; j < col; j++) {
        const idx = i * col + j;
        if (idx >= probsObj.probset.length) {
          rowdata.push(...["", "", ""]);
          continue;
        }
        const qnum = probsObj.probset[idx][0];
        const title = probsObj.probset[idx][1];
        if (qnum == that.user.getQnum()) {
          rowdata.push(
            ...[chalk.green(idx), chalk.green(qnum), chalk.green(title)]
          );
        } else {
          rowdata.push(...[idx, qnum, title]);
        }
      }
      data.push(rowdata);
    }
    console.log(table(data, { drawVerticalLine: (i) => i % 3 === 0 }));
  };
}
