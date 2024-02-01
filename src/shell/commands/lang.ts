import { BJShell } from "@/shell";
import { getLanguages } from "@/net/parse";
import { gridSelector } from "../utils";
import conf from "@/config";
import chalk from "chalk";
export default function lang(that: BJShell, arg: string[]) {
  return async () => {
    const langs = await getLanguages();
    const langChoices = langs.map(lang => `${lang.name} (${lang.extension})`);
    const userLangIdx = langs.findIndex(lang => lang.num === that.user.getLang());
    const selected = await gridSelector(that, langChoices, userLangIdx);
    if(selected !== userLangIdx){
      const lang = langs[selected];
      await that.user.setLang(lang.num);
      console.log();
      console.log(`언어를 ${chalk.blueBright(lang.name)} 로 설정했습니다.`);
      if (lang.compile && !lang.run.includes("Main" + lang.extension)) 
        console.log(`컴파일 명령어: ${chalk.blueBright(langs[selected].compile)}`);
      console.log(`실행 명령어: ${chalk.blueBright(langs[selected].run)}`);
      console.log();
      console.log(
        `위의 명령어가 올바르지 않으면, ${chalk.blueBright(
          conf.LANGPATH
        )} 파일의 \`compile\` 과 \`run\` 명령어를 수동으로 바꿔주셔야 합니다.`
      );
    }
  };
}
