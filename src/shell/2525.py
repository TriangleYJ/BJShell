# 2525
import time
a, b = map(int, input().split())
c = int(input())
time.sleep(3)
m = (b + c) % 60
h = (a + ((b + c) // 60)) % 24
if(m == 0):
    m = 60
print(h, m)

