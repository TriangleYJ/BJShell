import readline from "readline";
import chalk from "chalk";
import os from "os";
import { User } from "@/net/user";
import { ChildProcessWithoutNullStreams } from "child_process";
import kill from "tree-kill";
import { getLanguage, getLanguages, language } from "@/net/parse";
import acquireAllCommands from "./command";
import { FSWatcher } from "chokidar";

//type LoginLock = NOT_LOGGED_IN | AUTO_LOGIN_TOKEN | LOGGED_IN
type LoginLock = 0 | 1 | 2;

export class BJShell {
  r = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  user = new User("");
  #loginLock: LoginLock = 2;
  #prevCommand = "";
  cp: ChildProcessWithoutNullStreams | null = null;
  monitor: FSWatcher | null = null;
  keyeventListener: ((key: string, data: any) => Promise<void>) | null = null;

  firstshow = true;

  findLang(num?: number): language | undefined {
    return getLanguage(num ?? this.user.getLang());
  }

  setLoginLock(lock: LoginLock) {
    this.#loginLock = lock;
  }

  async setPrompt(cmd?: string) {
    if (this.#loginLock === 0) this.r.setPrompt("Enter login token: ");
    else if (this.#loginLock === 1)
      this.r.setPrompt("(Optional) Enter autologin token: ");
    else if (this.monitor)
      this.r.setPrompt(
        ""
      ); // monitor block stdin, so no prompt (cp's blank prompt set in exec command)
    else {
      const rawdir = chalk.green(process.cwd());
      const dir = rawdir.replace(os.homedir(), "~");
      const curLangName = this.findLang()?.name ?? "";
      const prefix =
        `👤 ${chalk.blueBright(await this.user.getUsername())}` +
        (this.user.getQnum()
          ? ` | 🚩 ${chalk.yellow(this.user.getQnum())}`
          : "") +
        (this.user.getLang() !== -1
          ? ` | 🌐 ${chalk.yellow(curLangName)}`
          : "");
      this.r.setPrompt(`(${prefix}) ${dir} BJ> `);
    }
    if (cmd !== "exec") this.r.prompt();
  }

  async #loginGuard() {
    // Check curruent token exists or vaild
    if ((await this.user.checkLogin()) === 200) return true;
    console.log(`${chalk.red("로그인이 필요합니다.")}`);
    console.log(
      `만약 토큰을 어떻게 찾는지 모르겠다면, 여기를 참고하세요: https://github.com/TriangleYJ/Beakjoon-VSC`
    );
    this.setLoginLock(0);
    return false;
  }

  async #loginGuardOnLine(line: string) {
    if (this.#loginLock === 2) return false;
    if (this.#loginLock === 0) {
      await this.user.setToken(line);
      if ((await this.user.checkLogin()) === 200) this.setLoginLock(1);
      else console.log("유효하지 않은 로그인 토큰입니다.");
      await this.setPrompt();
    } else if (this.#loginLock === 1) {
      await this.user.setAutologin(line);
      this.#loginLock = 2;
      console.log(chalk.green("로그인 성공!"));
      console.log();
      await getLanguages(true);
      await this.setPrompt();
    }
    return true;
  }

  lineListener = async (line: string) => {
    if (this.cp) {
      // prior handling 1: child process stdin
      this.cp.stdin.write(line + "\n");
      return;
    }
    if (await this.#loginGuardOnLine(line)) return; // prior handling 3: login guard

    line = line.trim();
    if (line === ".") line = this.#prevCommand;

    const argv = line.split(" ");
    let cmd = argv[0];
    const arg = argv.slice(1);
    const commands = acquireAllCommands(this, cmd, arg);
    const commAlias = Object.values(commands).find((x) => x.alias === cmd);
    if (commAlias) await commAlias.func();
    else if (commands[cmd]) await commands[cmd].func();
    else if (cmd !== "") console.log("Unknown Command");

    await this.setPrompt();
    this.#prevCommand = line;
    return;
  };

  async changelineModeToKeypress(
    keypressListener: (key: string, data: any) => Promise<void>
  ) {
    this.r.removeListener("line", this.lineListener);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    this.keyeventListener = keypressListener;
    process.stdin.on("keypress", keypressListener);
  }

  async revertlineModeFromKeypress() {
    this.monitor?.close();
    this.monitor = null;
    if (this.keyeventListener) {
      process.stdin.removeListener("keypress", this.keyeventListener);
      this.keyeventListener = null;
    }
    this.r.write(null, { ctrl: true, name: "u" });
    await this.setPrompt();
    this.r.on("line", this.lineListener);
  }

  #initOn() {
    this.r.on("line", this.lineListener);
    this.r.on("close", function () {
      process.exit();
    });

    // Handle Ctrl+C (SIGINT) to send it to the child process
    this.r.on("SIGINT", async () => {
      if (this.monitor) {
        await this.revertlineModeFromKeypress();
      } else if (this.cp === null) {
        console.log();
        this.r.write(null, { ctrl: true, name: "u" });
        await this.setPrompt();
      } else
        kill(this.cp.pid ?? 0, "SIGINT", (err: any) => {
          if (err) {
            if (err instanceof Error) console.log(err.message);
            else console.log(err);
          }
        });
    });
  }

  async init() {
    this.#initOn();

    console.log(`${chalk.yellow("BaekJoon Shell")} 에 오신 것을 환영합니다!`);
    console.log(`${chalk.blue("help")}를 입력하여 명령어를 확인하세요.`);
    console.log();

    // Load config
    await this.user.loadProperties();
    if (await this.#loginGuard()) await getLanguages();
    await this.setPrompt();
  }
}
