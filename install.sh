#! /bin/bash
# check current cpu is x86_64 or arm or else

CPU_TYPE=$(uname -m)
if [ $CPU_TYPE == "x86_64" ]; then
    sudo wget -O /usr/local/bin/bj https://github.com/TriangleYJ/BJShell/releases/latest/download/bjshell-linux-x64
    sudo chmod +x /usr/local/bin/bj
elif [ $CPU_TYPE == "aarch64_be" ] || [ $CPU_TYPE == "aarch64" ] || [ $CPU_TYPE == "armv8b" ] || [ $CPU_TYPE == "armv8l" ]; then
    sudo wget -O /usr/local/bin/bj https://github.com/TriangleYJ/BJShell/releases/latest/download/bjshell-linux-arm64
    sudo chmod +x /usr/local/bin/bj
else
    echo "Install failed, not support $CPU_TYPE CPU."
    exit 1
fi

cat << EOF > /usr/local/bin/bjt
tmux new-session -d -s bjshell \; \
  split-window -v -p 25 \; \
  select-pane -t 0 \; \
  split-window -h \; \
  select-pane -t 0 \; \
  send-keys "vim" C-m \; \
  select-pane -t 1 \; \
  send-keys "less ~/.bjshell/problem.md" C-m \; \
  select-pane -t 2 \; \
  send-keys "bj" C-m \; \
  attach-session -t bjshell
EOF
sudo chmod +x /usr/local/bin/bjt

echo "Install success, you can use bj command to run BJShell."
echo "Use bjt command to run BJShell with tmux. (optional, type \`term on\` to enable terminal mode)"

