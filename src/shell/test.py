# 11021 A+B - 7


import sys
def finput():
    return sys.stdin.readline().rstrip()

def iinput():
    return int(finput())

def linput(m=lambda x: x):
    return list(map(m, finput().split()))

# n = int(input())
n = iinput()
for i in range(n):
    # a, b = map(int, input().split())
    a, b = linput(int)
    
    print("Case #{}: {}".format(i+1, a+b))

