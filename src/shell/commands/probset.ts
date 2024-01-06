import { BJShell } from "@/shell";
import { loadFromLocal, saveToLocal } from "@/storage/localstorage";
import set from "./set";
import { getProblemSet } from "@/net/parse";
import chalk from "chalk";
import { table } from "table";

export default function probset(that: BJShell, arg: string[]) {
  return async () => {
    switch (arg[0]) {
      case "set":
      case "s": {
        if (arg.length == 1) {
          console.log("probset set <number>");
          return;
        }
        const probsObj = await loadFromLocal("ps");
        if (!probsObj) {
          console.log("저장된 문제 셋이 없습니다.");
          return;
        }
        const val = parseInt(arg[1]);
        if (isNaN(val) || val < 0 || val >= probsObj.probset.length) {
          console.log("probset set <number>");
          return;
        }
        await set(that, arg)(probsObj.probset[val][0]);
        break;
      }
      case "clear":
      case "c": {
        await saveToLocal("ps", undefined);
        console.log("문제 셋을 초기화했습니다.");
        break;
      }
      case "next":
      case "n": {
        const probsObj = await loadFromLocal("ps");
        if (!probsObj) {
          console.log("저장된 문제 셋이 없습니다.");
          return;
        }
        const qnum = that.user.getQnum();
        const idx = probsObj.probset.findIndex(
          (x: [number, string]) => x[0] == qnum
        );
        if (idx == -1) {
          console.log("현재 문제가 저장된 문제 셋에 없습니다.");
          return;
        }
        if (idx == probsObj.probset.length - 1) {
          console.log("마지막 문제입니다.");
          return;
        }
        await set(that, arg)(probsObj.probset[idx + 1][0]);
        break;
      }
      case "prev":
      case "p": {
        const probsObj = await loadFromLocal("ps");
        if (!probsObj) {
          console.log("저장된 문제 셋이 없습니다.");
          return;
        }
        const qnum = that.user.getQnum();
        const idx = probsObj.probset.findIndex(
          (x: [number, string]) => x[0] == qnum
        );
        if (idx == -1) {
          console.log("현재 문제가 저장된 문제 셋에 없습니다.");
          return;
        }
        if (idx == 0) {
          console.log("첫번째 문제입니다.");
          return;
        }
        await set(that, arg)(probsObj.probset[idx - 1][0]);
        break;
      }
      case "list":
      case "l": {
        const probsObj = await loadFromLocal("ps");
        if (!probsObj) {
          console.log("저장된 문제 셋이 없습니다.");
          return;
        }
        const data = [];
        data.push(["번호", "제목"]);
        console.log(`${probsObj.title}: 문제 ${probsObj.probset.length}개`);
        for (const prob of probsObj.probset) {
          const qnum = prob[0];
          const title = prob[1];
          if (qnum == that.user.getQnum()) {
            data.push([chalk.green(qnum), chalk.green(title)]);
          } else {
            data.push([qnum, title]);
          }
        }
        console.log(table(data));
        break;
      }
      default: {
        const urlReg =
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
        if (!urlReg.test(arg[0])) {
          console.log("올바른 URL이 아닙니다.");
          return;
        }
        const probset = await getProblemSet(arg[0]);
        if (probset.length == 0) {
          console.log("문제가 없습니다.");
          return;
        }
        const probsetTitle = arg[1] ? arg.slice(1).join(" ") : "My Problem Set";
        const probsObj = {
          title: probsetTitle,
          probset,
        };
        await saveToLocal("ps", probsObj);
        console.log(
          `${probsetTitle}: 문제 ${probset.length}개를 저장했습니다.`
        );
        console.log("첫번째 문제를 불러오고 있습니다...");

        await set(that, arg)(probset[0][0]);
        break;
      }
    }
  };
}
