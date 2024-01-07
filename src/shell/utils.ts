import { problem, language, getProblem } from "@/net/parse";
import { BJShell } from "@/shell";
import { existsSync } from "fs";

export async function checkInfo(
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

export async function generateFilePath(
  that: BJShell,
  numOnly?: boolean
): Promise<string> {
  const info = await checkInfo(that);
  if (!info) return "";
  const [question, lang] = info;
  const extension = lang.extension ?? "";
  const titleEscaped = question.title.replace(/[/\\?%*:|"<>]/g, "");
  let filepath = numOnly
    ? `${process.cwd()}/${question.qnum}${extension}`
    : `${process.cwd()}/${question.qnum} - ${titleEscaped}${extension}`;
  return filepath;
}

// Assure that the file exists
export async function getFilePath(that: BJShell, silent?: boolean): Promise<string> {
  // if generateFilePath(that) exists in file, return it
  // if not, return generateFilePath(that, true)
  const filepath = await generateFilePath(that);
  if (existsSync(filepath)) return filepath;
  const filepath2 = await generateFilePath(that, true);
  if (existsSync(filepath2)) return filepath2;
  if(!silent) console.log("파일이 존재하지 않습니다!");
  return "";
}
