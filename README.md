# BJ Shell
백준 문제를 브라우저 없이 VSCode에서 편하게 읽고, 터미널에서 빠르게 테스트, 제출할 수 있도록 도와주는 쉘 프로그램입니다.

## 스크린샷
### 문제, 언어 설정
![set_lang](https://github.com/TriangleYJ/BJShell/assets/9069813/8d4090a1-eb25-46f9-8acf-ffa39f61615f)

### 자동 테스트, 제출
![watch_submit](https://github.com/TriangleYJ/BJShell/assets/9069813/ead5c6ec-ef40-4642-a5b1-b64ebe7c14bf)



## 설치
https://github.com/TriangleYJ/Beakjoon-VSC/releases 에서 확인할 수 있습니다.

## 어떻게 쉘에 로그인 할 수 있나요?
1. https://www.acmicpc.net/ 에 접속합니다.
2. 로그인을 합니다. 이때 반드시 로그인 상태 유지 체크박스를 체크합니다.
3. 이후 (Windows) `F12`,  (macOS) `⌘ cmd` + `⌥ option` + `I` 를 누릅니다. 
4. Application 탭을 클릭합니다. 보이지 않는 경우 `>>` 버튼을 눌러 Application 항목을 찾아 클릭합니다.
5. 좌측 패널에서 Storage 항목의 Cookies 를 찾습니다. 해당 항목 옆 ▸ 버튼을 누른 뒤 https://www.acmicpc.net 항목을 클릭합니다.
6. 우측 표에서 `OnlineJudge` 항목을 찾습니다. 해당 항목 옆 Value 열에 있는 값을 더블클릭 한 뒤 복사합니다. 이후 BJ 쉘에 `Enter login token: ` 가 떠 있을 때 붙여넣고 엔터를 누릅니다.
7. 우측 표에서 `bojautologin` 항목을 찾습니다. 해당 항목 옆 Value 열에 있는 값을 더블클릭 한 뒤 복사합니다. 이후 BJ 쉘에 `(Optional) Enter autologin token: ` 가 떠있을 때 붙여넣고 엔터를 누릅니다.

## Build
1. `tsc && tsc-alias`
2. `cp package.json ./build`, Edit `./build/package.json` to
```
   ...
  "main": "index.js",
  "bin": "./index.js",
   ...
```
3. `pkg -t node16-linux-x64 .` or `pkg -t node16-linux-arm64 .`

## License
This project is licensed under the terms of the MIT license.

해당 오픈소스를 자유롭게 사용해도 좋으나, 이로 인해 생기는 어떠한 불이익 (Baekjoon Online Judge 이용 제한 등)에 대해 저작권자는 책임을 지지 않습니다.