import { BJShell } from "@/shell";
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
    }
    else if(arg[0] == "off") {
        await saveToLocal("openProbCmd", undefined);
        await saveToLocal("openAnsCmd", undefined);
    }
  }
}