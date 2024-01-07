import { BJShell } from "@/shell";
import cd from "./commands/cd";
import help from "./commands/help";
import lang from "./commands/lang";
import logout from "./commands/logout";
import ls from "./commands/ls";
import test from "./commands/test";
import probset from "./commands/probset";
import set from "./commands/set";
import show from "./commands/show";
import submit from "./commands/submit";
import exec from "./commands/exec";
import testwatch from "./commands/testwatch";

export interface Command {
  desc: string;
  alias?: string;
  func: () => Promise<void> | void;
  important?: boolean;
}

export default function acquireAllCommands(
  that: BJShell,
  cmd: string,
  arg: string[]
): { [key: string]: Command } {
  const commands = {
    help: {
      // desc: "Show help.",
      desc: "명령어를 보여줍니다. 전체 명령어를 보려면 'help all' 을 타이핑하세요.",
      func: () => help(that, arg)(commands),
      alias: "h",
      important: true,
    },
    exit: {
      desc: "BJ Shell을 종료합니다.",
      func: () => {
        that.r.close();
      },
      alias: "x",
    },
    pwd: {
      desc: "현재 디렉토리를 보여줍니다.",
      func: () => {
        console.log(process.cwd());
      },
    },
    ls: {
      desc: "현재 디렉토리의 파일 목록을 보여줍니다.",
      func: ls(that, arg),
    },
    cd: {
      desc: "디렉토리를 이동합니다. (cd <path>)",
      func: cd(that, arg),
    },
    logout: {
      desc: "BJ Shell을 로그아웃합니다.",
      func: logout(that, arg),
    },
    set: {
      desc: `VSCode에서 문제 번호를 설정하고 답안 파일을 새로 만들거나 엽니다.
또한 문제 파일을 업데이트합니다. 인수가 없으면 현재 문제 번호를 설정합니다.
.bjshell/Template/Main.*에 템플릿 파일이 있으면 파일을 만들 때 템플릿을 로드합니다.
사용법: set <question number> or set`,
      func: set(that, arg),
      alias: "s",
      important: true,
    },
    show: {
      desc: "VSCode에서 문제 파일(problem.md)을 엽니다.",
      func: show(that, arg),
      alias: "o",
      important: true,
    },
    unset: {
      desc: "현재 문제 번호를 초기화합니다.",
      func: async () => {
        await that.user.setQnum(0);
      },
    },
    exec: {
      desc: `외부 프로세스를 실행합니다. (ex. exec python3 Main.py) (ex. e rm *.py)
SIGINT(Ctrl+C)만 처리됩니다. 파이프 등 복잡한 쉘 기능은 지원하지 않습니다.
사용법: exec <command>`,
      func: exec(that, arg),
      alias: "e",
    },
    test: {
      desc: `문제에서 제공하는 테스트케이스를 사용하여 코드를 테스트합니다.
테스트케이스는 문제 파일(problem.md)에 기록되어 있습니다.
또한, 답안 파일에 커스텀 테스트케이스를 추가할 수 있습니다. (자세한 내용은 "help testcase" 를 참고하세요.)`,
      func: test(that, arg),
      alias: "t",
    },
    watch: {
      desc: `test 명령어와 동일하지만, 파일 변동을 감지하여 자동으로 테스트를 재실행합니다.
watch 모드를 나가지 않고 자주 사용되는 명령어를 쓸 수 있습니다.
b: 즉시 제출합니다. (submit 명령어와 동일)
x: watch 모드를 종료합니다. (Ctrl + C 와 동일)
n: probset next 명령어와 동일합니다.
p: probset prev 명령어와 동일합니다.
l: probset list 명령어와 동일합니다.`,
      func: testwatch(that, arg),
      alias: "w",
      important: true,
    },
    lang: {
      desc: `사용 가능한 언어를 보여줍니다. 언어를 설정하려면 lang <언어 번호> 를 타이핑하세요.
사용법: lang list or lang list <column number>
사용법: lang <language number>`,
      func: lang(that, arg),
      alias: "l",
      important: true,
    },
    submit: {
      desc: `현재 문제 번호와 언어를 사용하여 BOJ에 코드를 제출합니다.`,
      func: submit(that, arg),
      alias: "b",
      important: true,
    },
    google: {
      desc: `현재 문제를 구글에서 검색합니다. (링크 제공)`,
      func: () =>
        console.log(
          `https://www.google.com/search?q=%EB%B0%B1%EC%A4%80+${that.user.getQnum()}+${encodeURIComponent(
            that.findLang()?.name ?? ""
          )}`
        ),
      alias: "g",
    },
    probset: {
      desc: `URL로부터 백준 문제들을 불러옵니다.
사용법:
probset <url> <title?> - url 내 존재하는 백준문제
  하이퍼링크들을 파싱해 title 이름으로 문제 셋을 지정합니다.
probset set <number> (or probset s) - n번째 문제를 선택합니다.
probset clear (or probset c)- 저장된 문제 셋을 초기화합니다. 
probset next (or probset n) - 다음 문제로 넘어갑니다.
probset prev (or probset p) - 이전 문제로 넘어갑니다.
probset list (or probset l) - 문제 셋 내 문제 리스트와
  현재 선택된 문제를 보여줍니다.
`,
      func: probset(that, arg),
      alias: "ps",
      important: true,
    },
  };

  return commands;
}
