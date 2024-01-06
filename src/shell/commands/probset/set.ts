import { BJShell } from "@/shell";
import { loadFromLocal } from "@/storage/localstorage";
import set from "../set";

export default function probset_set(that: BJShell, arg: string[]) {
  return async () => {
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
  };
}
