import { BJShell } from "@/shell";
import probset_set from "./probset/set";
import probset_select from "./probset/select";
import probset_list from "./probset/list";
import probset_load from "./probset/load";
import probset_clear from "./probset/clear";

export default function probset(that: BJShell, arg: string[]) {
  return async () => {
    switch (arg[0]) {
      case "clear":
      case "c":
        await probset_clear(that, arg)();
        break;
      case "next":
      case "n":
        await probset_select(that, arg)(true);
        break;
      case "prev":
      case "p":
        await probset_select(that, arg)(false);
        break;
      case "list":
      case "l":
        await probset_list(that, arg)();
        break;
      default:
        await probset_load(that, arg)();
        break;
    }
  };
}
