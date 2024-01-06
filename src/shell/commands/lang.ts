import { BJShell } from "@/shell";
import { getLanguages } from "@/net/parse";
import chalk from "chalk";
import conf from "@/config";
import { table } from "table";

export default function lang(that: BJShell, arg: string[]) {
  return async () => {
    if (arg[0] == "list") {
      const rawint = parseInt(arg[1]);
      const col_num = isNaN(rawint) ? 3 : rawint;
      const data = [];
      const langs = await getLanguages();
      for (let i = 0; i < langs.length; i += col_num) {
        const row = [];
        for (let j = 0; j < col_num; j++) {
          row.push(langs[i + j]?.name ?? "");
          row.push(langs[i + j]?.extension ?? "");
          row.push(langs[i + j]?.num ?? "");
        }
        data.push(row);
      }
      console.log(table(data, { drawVerticalLine: (i) => i % 3 === 0 }));
      console.log(
        `원하는 언어를 사용하기 위해서 ${chalk.blueBright(
          "lang <language number>"
        )}를 타이핑하세요.`
      );
      console.log(
        `언어를 사용하기 전에, 자동으로 불러온 언어 설정이 유효한지 확인하세요. 그렇지 않으면, ${chalk.blueBright(
          conf.LANGPATH
        )} 파일의 \`compile\` 과 \`run\` 명령어를 수동으로 바꿔주셔야 합니다.`
      );
      return;
    }
    if (arg.length !== 1 || isNaN(parseInt(arg[0]))) {
      console.log("lang <language number>");
      console.log("언어 목록을 보고 싶다면 lang list를 타이핑하세요.");
      return;
    } else if (!that.findLang(parseInt(arg[0]))) {
      console.log("유효하지 않은 언어 번호입니다.");
      return;
    }
    await that.user.setLang(parseInt(arg[0]));
  };
}
