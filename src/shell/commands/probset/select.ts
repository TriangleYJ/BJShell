import { BJShell } from "@/shell";
import { loadFromLocal } from "@/storage/localstorage";
import set from "../set";

export default function probset_select(that: BJShell, arg: string[]) {
  return async (next: boolean) => {
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
    if (idx == 0 && !next) {
      console.log("첫 번째 문제입니다.");
      return;
    }
    if (idx == probsObj.probset.length - 1 && next) {
      console.log("마지막 문제입니다.");
      return;
    }
    await set(that, arg)(probsObj.probset[next ? idx + 1 : idx - 1][0]);
  };
}
