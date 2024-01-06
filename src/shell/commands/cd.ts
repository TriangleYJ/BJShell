import { BJShell } from "@/shell";

export default function cd(that: BJShell, arg: string[]) {
  return () => {
    try {
      const path = arg[0] ?? "";
      process.chdir(path);
    } catch (e) {
      if (e instanceof Error) console.log(e.message);
      else console.log(e);
    }
  };
}
