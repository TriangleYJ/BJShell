import { problem, language, getProblem } from "@/net/parse";
import { BJShell } from "@/shell";

export default async function checkInfo(
  that: BJShell
): Promise<[problem, language] | null> {
  const question = await getProblem(that.user.getQnum());
  if (question === null) {
    console.log("유효하지 않은 문제 번호입니다!");
    return null;
  }
  const lang = that.findLang();
  if (lang === undefined) {
    console.log("lang 명령어를 통해 먼저 언어를 선택해 주세요.");
    return null;
  }
  return [question, lang];
}
