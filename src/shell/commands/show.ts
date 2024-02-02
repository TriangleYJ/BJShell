import { BJShell } from "@/shell";
import conf from "@/config";
import { exec } from "child_process";
import { loadFromLocal } from "@/storage/localstorage";

export default function show(that: BJShell, arg: string[]) {
  return async () => {
    const openProbCmdRaw = await loadFromLocal("openProbCmd");
    const openProbCmd = (openProbCmdRaw ?? "code {}").replace("{}", conf.MDPATH);
    exec(openProbCmd);
    if (!openProbCmdRaw && that.firstshow) {
      that.firstshow = false;
      console.log("VSCode에 문제 파일을 열었습니다.");
      console.log(
        "※ 만약 문제 MD 파일이 바뀌지 않는다면, ... 버튼을 클릭 후 'Refresh Preview' 버튼을 클릭해 주세요."
      );
      console.log(
        "※ 만약 미리보기가 아닌 코드가 보인다면 VSCode 상에서 다음 설정을 진행해 주세요."
      );
      console.log(`
1. "Ctrl+Shift+P" 를 누르세요
2. "Preferences: Open User Settings (JSON) 를 클릭하세요."
3. json 파일의 마지막 } 이전에 다음 코드를 복사해서 붙여넣으세요.
    , // don't forget the comma
    "workbench.editorAssociations": {   
        "*.md": "vscode.markdown.preview.editor",
    }
`);
    }
  };
}
