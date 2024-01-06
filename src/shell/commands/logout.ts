import { BJShell } from "@/shell";

export default function logout(that: BJShell, arg: string[]) {
  return async () => {
    await that.user.setToken("");
    await that.user.setAutologin("");
    that.setLoginLock(0);
    console.log("로그아웃 되었습니다.");
  };
}
