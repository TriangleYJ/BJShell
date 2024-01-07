import { BJShell } from "@/shell";
import fs from "fs/promises";
import chalk from "chalk";

export default function ls(that: BJShell, arg: string[]) {
  return async () => {
    try {
      const files = await fs.readdir(process.cwd());
      let output = "";
      for (const file of files) {
        const isDir = (await fs.stat(file)).isDirectory();
        output += `${isDir ? chalk.blue(file) : file}   `;
      }
      console.log(output);
    } catch (e) {
      if (e instanceof Error) console.log(e.message);
      else console.log(e);
    }
  };
}
