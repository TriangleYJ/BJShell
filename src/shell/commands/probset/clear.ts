import { BJShell } from "@/shell";
import { saveToLocal } from "@/storage/localstorage";

export default function probset_clear(that: BJShell, arg: string[]) {
  return async () => {
    await saveToLocal("ps", undefined);
    console.log("문제 셋을 초기화했습니다.");
  };
}
