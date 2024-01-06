import { BJShell } from "@/shell";
import { saveToLocal } from "@/storage/localstorage";
import set from "../set";
import { getProblemSet } from "@/net/parse";

export default function probset_load(that: BJShell, arg: string[]) {
  return async () => {
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
      url: arg[0],
      probset,
    };
    await saveToLocal("ps", probsObj);
    console.log(`${probsetTitle}: 문제 ${probset.length}개를 저장했습니다.`);
    console.log("첫번째 문제를 불러오고 있습니다...");

    await set(that, arg)(probset[0][0]);
  };
}
