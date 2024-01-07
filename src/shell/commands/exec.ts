import { BJShell } from "@/shell";
import { spawn } from "child_process";

export default function exec(that: BJShell, arg: string[]) {
  return async () => {
    if (arg.length === 0) {
      console.log("exec <command>");
      return;
    }
    // https://velog.io/@dev2820/nodejs%EC%9D%98-%EC%9E%90%EC%8B%9D%ED%94%84%EB%A1%9C%EC%84%B8%EC%8A%A4
    // https://kisaragi-hiu.com/nodejs-cmd/
    // FIXME: stdio full sync

    const command = arg.join(" ");
    that.r.setPrompt("");
    that.cp = spawn(command, [], { shell: true });
    await new Promise((resolveFunc) => {
      that.cp!.stdout?.on("data", (x: string) => {
        process.stdout.write(x.toString());
      });
      that.cp!.stderr?.on("data", (x: string) => {
        process.stderr.write(x.toString());
      });
      that.cp!.on("exit", (code: number) => {
        resolveFunc(code);
      });
    });
    that.cp = null;
  };
}
