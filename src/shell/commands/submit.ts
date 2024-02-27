import chalk from "chalk";
import { BJShell } from "@/shell";
import { checkInfo, getFilePath } from "../utils";
import fs from "fs/promises";
import conf from "@/config";
import subscribeChannel from "@/net/websocket";

const result_names = ["기다리는 중", "재채점을 기다리는 중", "채점 준비 중", "채점 중", "맞았습니다!!", "출력 형식이 잘못되었습니다", "틀렸습니다", "시간 초과", "메모리 초과", "출력 초과", "런타임 에러", "컴파일 에러", "채점 불가", "삭제된 제출", "%(remain)초 후 채점 시작", "맞았습니다!!", "런타임 에러 이유를 찾는 중"];
const result_colors = [chalk.gray, chalk.gray, chalk.yellow, chalk.yellow, chalk.green, chalk.red, chalk.red, chalk.red, chalk.red, chalk.red, chalk.blue, chalk.blue, chalk.bgBlack, chalk.bgBlack, chalk.yellow, chalk.greenBright, chalk.yellow];
const result_progress: any = {};

// modified version of https://ddo7jzca0m2vt.cloudfront.net/js/status.js
function display_solution(solution_id: number, ans: any) {
  const result = ans['result'];
  if (result == 11) ans['compile_error'] = true;
  if (result == 10) ans['runtime_error'] = true;
  let has_detail = false;
  if (result == 4) {
    if (ans['subtask_score']) {
      has_detail = true;
    }
    if (ans['ac'] && ans['tot'] && ans['ac'] > 0 && ans['tot'] > 0) {
      has_detail = true;
    }
  }
  ans['result_name'] = result_names[result];
  let progress = 0;
  if (ans['progress']) {
    progress = parseInt(ans['progress']);
    if (result_progress[solution_id] > progress) {
      return;
    }
    ans['result_name'] += " (" + progress + "%";

    result_progress[solution_id] = progress;
    ans['result_name'] += ')';
  }
  if (result == 6 && ans['feedback']) {
    ans['result_name'] += ' [' + ans['feedback'] + ']';
  }
  if (result == 10 && ans['rte_reason']) {
    ans['result_name'] += ' (' + ans['rte_reason'] + ')';
  }
  if (result == 14) {
    let remain = ans['remain'] || 0;
    ans['result_name'] = ans['result_name'].replace("%(remain)", remain);
  }
  let r = "";
  if (ans['compile_error']) {
    r += '<a href="https://www.acmicpc.net/ceinfo/' + solution_id + '">';
  }
  if (ans['runtime_error']) {
    r += '<a href="https://help.acmicpc.net/judge/rte">';
  }
  if (has_detail) {
    r += '<a href="https://www.acmicpc.net/source/' + solution_id + '#points">';
  }
  if (ans['partial_score']) {
    let score = (Math.round(ans['partial_score'] * 100) / 100);
    r += score;
    r += '점';
    if (ans['custom_result']) {
      r += " (" + ans['custom_result'] + ")";
    }
  } else if (ans['subtask_score']) {
    let score = (ans['subtask_score']);
    r += score;
    r += '점';
    if (ans['custom_result']) {
      r += " (" + ans['custom_result'] + ")";
    }
  } else {
    if (ans['custom_result']) {
      r += ans['custom_result'];
    } else {
      r += ans['result_name'];
      if (ans['ac'] && ans['tot'] && ans['ac'] > 0 && ans['tot'] > 0) {
        r += ' (' + ans['ac'] + '/' + ans['tot'] + ')';
      }
    }
  }
  if (ans['compile_error']) r += '</a>';
  if (ans['runtime_error']) r += '</a>';
  if (has_detail) r += '</a>';

  // unwrap r so that `<a href="url">text</a>` become `text (url)`
  r = r.replace(/<a href="([^"]+)">([^<]+)<\/a>/g, '$2 ($1)');

  let out = ``;
  out += result_colors[result](r);

  if('memory' in ans) out += ` | Memory: ${ans['memory']} KB`;
  if('time' in ans) out += ` | Time: ${ans['time']} ms`;
  if (result >= 4 && result_progress[solution_id]) {
    if(result > 4 && result <= 10) out += ` | 실패 지점: ${result_progress[solution_id]}%`;
    delete result_progress[solution_id];
  }

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(out);
}

export default function submit(that: BJShell, arg: string[]) {
  return async () => {
    const info = await checkInfo(that);
    if (!info) return;
    const [question, _] = info;
    that.r.pause();
    try {
      console.log(`===== 제출: ${question!.qnum}. ${question!.title} =====`);
      const filepath = await getFilePath(that);
      if (!filepath) return;
      const code = await fs.readFile(filepath, "utf-8");
      const subId = await that.user.submit(code);
      if (subId === -1) return;
      console.log(`문제를 제출했습니다!`);
      const ans = await that.user.submitStatus(subId);
      if (ans === null || isNaN(parseInt(ans.result))) {
        console.log(`제출번호 ${subId} 결과를 가져오는데 실패했습니다.`);
        return;
      }
      display_solution(subId, ans);
      const finalAns = await subscribeChannel(subId, d => d.result >= 4, d => display_solution(subId, d),
          d => d.result == 10 || d.result == 14 || d.result == 16);
      if (finalAns === null) console.log(`경고: 제출 결과를 가져오는데 시간이 너무 오래 걸립니다.`);
      console.log(
        `\n=> ${conf.URL}status?problem_id=${
          question!.qnum
        }&user_id=${await that.user.getUsername()}&language_id=${that.findLang()?.num}&result_id=-1\n`
      );
    } catch (e) {
      if (e instanceof Error) console.log(e.message);
      else console.log(e);
    } finally {
      that.r.resume();
    }
  };
}
