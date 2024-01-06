import { BJShell } from "@/shell";
import chalk from "chalk";
import { table } from "table";
import { Command } from "../command";

export default function help(that: BJShell, arg: string[]) {
  return (commands: { [key: string]: Command }) => {
    if (arg[0] == "all") {
      const data = [];
      data.push(["단축어", "명령어", "설명"]);
      for (const key in commands) {
        const cmd = commands[key];
        data.push([cmd.alias ?? "", key, cmd.desc]);
      }
      console.log(table(data));
    }
    if (arg[0] == "testcase") {
      console.log(
        `${chalk.yellow("커스텀 테스트 케이스 문법 설명")}
각 언어의 주석에 <BJTestcase> </BJTestcase> 태그 를 삽입합니다. 해당 태그 밖에 있는 테스트케이스는 무시됩니다.
주석의 종류(라인, 블록)는 상관없으며 , 태그의 대소문자는 구분하지 않습니다.
해당 태그 안에 있는 일반 문자들은 무시됩니다. 테스트케이스를 설명하는데 사용할 수 있습니다.
해당 태그 안에 다음과 같은 방식으로 테스트케이스 입출력 쌍을 추가할 수 있습니다.
    << 와 -- 사이에 있는 문자(개행문자 포함)는 입력으로, >> 와 -- 는 출력 결과로 인식됩니다.
    << 혹은 -- 다음에 오는 문자는 <<, -- 와 반드시 들여쓰기 공백 (탭) 개수를 일치시켜야 합니다.
    << (input) -- (output) >> 가 하나의 테스트케이스이며, 태그에 여러개의 테스트케이스를 추가할 수 있습니다.
커스텀 테스트케이스 실행 결과에 (커스텀) 이라는 접두어가 붙습니다.

${chalk.green(`예시) 1000.py

"""
<BJTestcase>
1. 음수가 포함된 덧셈
    <<
    -1 1
    --
    0
    >>

2. 큰수의 덧셈
    <<
    999999999999 1
    ---
    1000000000000
    >>
</BJTestcase>
"""
a, b = map(int, input().split())
print(a + b)
`)}
`
      );
    } else if (arg.length === 0) {
      const data = [];
      data.push(["단축어", "명령어", "설명"]);
      for (const key in commands) {
        const cmd = commands[key];
        if (cmd.important) data.push([cmd.alias ?? "", key, cmd.desc]);
      }
      console.log(table(data));
      console.log("모든 명령어를 보려면 'help all' 를 타이핑하세요.");
      console.log(
        "커스텀 테스트케이스 문법을 보려면 'help testcase' 를 타이핑하세요."
      );
    }
  };
}
