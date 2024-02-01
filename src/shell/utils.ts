import { problem, language, getProblem } from "@/net/parse";
import { BJShell } from "@/shell";
import { existsSync } from "fs";
import chalk from "chalk";
import { getBorderCharacters, table } from "table";

export async function checkInfo(
  that: BJShell
): Promise<[problem, language] | null> {
  const question = await getProblem(that.user.getQnum());
  if (question === null) {
    console.log("유효하지 않은 문제 번호입니다!");
    return null;
  }
  const lang = that.findLang();
  if (lang === undefined) {
    console.log("lang 명령어를 통해 먼저 언어를 선택해 주세요.");
    return null;
  }
  return [question, lang];
}

export async function generateFilePath(
  that: BJShell,
  numOnly?: boolean
): Promise<string> {
  const info = await checkInfo(that);
  if (!info) return "";
  const [question, lang] = info;
  const extension = lang.extension ?? "";
  const titleEscaped = question.title.replace(/[/\\?%*:|"<>]/g, "");
  let filepath = numOnly
    ? `${process.cwd()}/${question.qnum}${extension}`
    : `${process.cwd()}/${question.qnum} - ${titleEscaped}${extension}`;
  return filepath;
}

// Assure that the file exists
export async function getFilePath(
  that: BJShell,
  silent?: boolean
): Promise<string> {
  // if generateFilePath(that) exists in file, return it
  // if not, return generateFilePath(that, true)
  const filepath = await generateFilePath(that);
  if (existsSync(filepath)) return filepath;
  const filepath2 = await generateFilePath(that, true);
  if (existsSync(filepath2)) return filepath2;
  if (!silent) console.log("파일이 존재하지 않습니다!");
  return "";
}

export function gridSelector(
  that: BJShell,
  choices: string[],
  selected?: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    if (choices.length === 0) reject("[ERROR] gridSelector - No choices");
    if (selected && selected >= choices.length)
      reject("[ERROR] gridSelector - Selected out of range");

    const term_width = process.stdout.columns ?? 80;
    const term_height = process.stdout.rows ?? 24;

    function term(str: string) {
      process.stdout.write("\x1B[2J\x1B[0f");
      process.stdout.cursorTo(0);
      process.stdout.write(str);
    }
    function tclaer() {
      process.stdout.write("\x1B[2J\x1B[0f");
    }

    // 1. calculate the number of columns
    let colnum = 1;
    for (let max_colnum = 1; max_colnum <= choices.length; max_colnum++) {
      const max_colsizes = [];
      for (let col = 0; col < max_colnum; col++) {
        let max_colsize = 0;
        for (let row = 0; ; row++) {
          const choice = choices[row * max_colnum + col];
          if (choice && choice.length > max_colsize)
            max_colsize = choice.length;
          else if (choice === undefined) break;
        }
        max_colsizes.push(max_colsize);
      }
      const width =
        max_colsizes.reduce((a, b) => a + b + 2, 0) + (max_colnum + 1);
      if (width > term_width) {
        colnum = Math.max(max_colnum - 1, 1);
        break;
      }
      if (max_colnum === choices.length) colnum = max_colnum;
    }
    const rownum = Math.ceil(choices.length / colnum);
    const rowInOnePage = Math.max(Math.ceil((term_height - 3) / 2), 1);

    // 2. make grid
    let selectedRowIndex = -1,
      selectedColIndex = -1,
      prevSelectedRowIndex = -1,
      prevSelectedColIndex = -1;
    if (selected === undefined) selected = 0;
    else {
      prevSelectedRowIndex = Math.floor(selected / colnum);
      prevSelectedColIndex = selected % colnum;
    }
    selectedRowIndex = Math.floor(selected / colnum);
    selectedColIndex = selected % colnum;

    const gridChoices: string[][] = [];
    for (let i = 0; i < rownum; i++) {
      const row = [];
      for (let j = 0; j < colnum; j++) {
        const choice = choices[i * colnum + j];
        if (choice) row.push(choice);
        else row.push("");
      }
      gridChoices.push(row);
    }

    // 3. draw grid
    function drawGrid() {
      tclaer();
      const page = Math.floor(selectedRowIndex / rowInOnePage);

      const partialGridChoices = gridChoices.slice(
        page * rowInOnePage,
        (page + 1) * rowInOnePage
      );

      const data = partialGridChoices.map((row, rowIndex) => {
        rowIndex = rowIndex + page * rowInOnePage;
        return row.map((col, colIndex) => {
          let text = col;
          const prevSelected =
            rowIndex === prevSelectedRowIndex &&
            colIndex === prevSelectedColIndex;
          const isSelected =
            rowIndex === selectedRowIndex && colIndex === selectedColIndex;
          if (prevSelected) text = chalk.yellow(text);
          if (isSelected) text = chalk.bgGreen(text);
          return text;
        });
      });

      const totalPage = Math.ceil(gridChoices.length / rowInOnePage);
      const pageText = chalk.bgYellow(`[Page ${page + 1}/${totalPage}]`);
      const helperText = `${pageText}  Use ${chalk.yellow(
        "arrow keys"
      )} to navigate, ${chalk.yellow("enter")} to select, ${chalk.yellow(
        "x"
      )} to cancel`;

      const output = table(data, {
        border: getBorderCharacters("norc"),
        columns: gridChoices[0].map(() => ({
          alignment: "center",
        })),
      });
      term(output + helperText);
    }

    drawGrid();
    that.changelineModeToKeypress(async (key, data) => {
      const name = data.name;
      if (name === "up" && selectedRowIndex > 0) {
        selectedRowIndex--;
      } else if (
        name === "down" &&
        selectedRowIndex < gridChoices.length - 1 &&
        gridChoices[selectedRowIndex + 1][selectedColIndex]
      ) {
        selectedRowIndex++;
      } else if (
        name === "left" &&
        selectedColIndex > 0 &&
        gridChoices[selectedRowIndex][selectedColIndex - 1]
      ) {
        selectedColIndex--;
      } else if (
        name === "right" &&
        selectedColIndex < gridChoices[selectedRowIndex].length - 1 &&
        gridChoices[selectedRowIndex][selectedColIndex + 1]
      ) {
        selectedColIndex++;
      } else if (name === "return") {
        tclaer();
        const selectedOption = selectedRowIndex * colnum + selectedColIndex;
        await that.revertlineModeFromKeypress();
        return resolve(selectedOption);
      } else if (name == "x") {
        tclaer();
        await that.revertlineModeFromKeypress();
        return resolve(selected!);
      }
      drawGrid();
    });
  });
}
