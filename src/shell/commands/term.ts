import { BJShell } from "@/shell";
import conf from "@/config"
import { saveToLocal } from "@/storage/localstorage";

export default function term(that: BJShell, arg: string[]) {
  return async () => {
//   "//openProbCmd": "tmux send-keys -t 1 'q' C-m 'less {}' C-m",
//   "//openAnsCmd": "tmux send-keys -t 0 ':e {}' C-m",
    if (arg.length === 0) {
      console.log("term <on|off>");
      return;
    }
    if (arg[0] == "on") {
        await saveToLocal("openProbCmd", "tmux send-keys -t 1 'q' C-m 'less {}' C-m");
        await saveToLocal("openAnsCmd", "tmux send-keys -t 0 ':e {}' C-m");
        console.log("터미널 모드를 실행했습니다. 문제 파일과 답안 파일을 열때 아래 명령어로 실행합니다. (`{}`는 파일명이 들어갈 자리입니다)")
        console.log("문제 파일: tmux send-keys -t 1 'q' C-m 'less {}' C-m");
        console.log("답안 파일: tmux send-keys -t 0 ':e {}' C-m");
        console.log(`수정을 원할 시 ${conf.CONFPATH} 에서 openProbCmd와 openAnsCmd를 수정하세요.` )
    }
    else if(arg[0] == "off") {
        await saveToLocal("openProbCmd", undefined);
        await saveToLocal("openAnsCmd", undefined);
        console.log("터미널 모드를 종료했습니다. VSCode에서 정상적으로 이용 가능합니다.")
    }
  }
}