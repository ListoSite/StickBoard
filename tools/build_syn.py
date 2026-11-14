import json, re, unicodedata, sys
def norm(s): return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c)!='Mn').strip()
rank={}
for f in ['/tmp/fw/content/2018/pt/pt_50k.txt','/tmp/fw/content/2018/pt_br/pt_br_50k.txt']:
    for i,l in enumerate(open(f,encoding='utf-8')):
        w=l.split(' ')[0]
        if w not in rank or rank[w]>i: rank[w]=i
NH=int(sys.argv[1]) if len(sys.argv)>1 else 15000; NS=int(sys.argv[2]) if len(sys.argv)>2 else 20000
syn={}
def add(h,lst):
    h=h.strip()
    if ' ' in h or rank.get(h,10**9)>NH: return
    s=syn.setdefault(h,{})
    for x in lst:
        x=x.strip()
        if not x or x==h or norm(x)==norm(h): continue
        r=rank.get(x, None)
        if r is None and ' ' in x:
            ws=x.split(); 
            if len(ws)<=3 and all(rank.get(w,10**9)<NS for w in ws): r=max(rank[w] for w in ws)+3000
        if r is None or r>NS or r<120: continue
        e=s.setdefault(x,[0,r]); e[0]+=1
def parse(path):
    lines=open(path,encoding='utf-8',errors='replace').read().split('\n')[1:]
    i=0
    while i<len(lines):
        l=lines[i]
        if '|' in l and not l.startswith(' ') and not l.startswith('('):
            h,n=l.rsplit('|',1)
            try: n=int(n)
            except: i+=1; continue
            for j in range(n):
                if i+1+j<len(lines):
                    parts=lines[i+1+j].split('|')[1:]
                    parts=[re.sub(r'\s*\(.*?\)\s*','',p) for p in parts]
                    add(h,parts)
            i+=1+n
        else: i+=1
parse('/tmp/lo/dictionaries/pt_PT/th_pt_PT.dat')
parse('/tmp/lo/dictionaries/pt_BR/th_pt_BR.dat')
def sc(h,x,e):
    mutual = 1 if h in syn.get(x,{}) else 0
    return e[0] + 2*mutual - e[1]/40000
out={}
for h,s in syn.items():
    items=sorted(s.items(),key=lambda kv:-sc(h,kv[0],kv[1]))
    keep=[k for k,e in items if e[0]+ (2 if h in syn.get(k,{}) else 0) >= 2][:10]
    if keep: out[h]='|'.join(keep)
json.dump(out,open('/home/claude/lexbuild/syn.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(out))
for w in ['triste','feliz','fixe','zangado','cansado','lindo','amor','saudade','fome','festa','obrigado','engraçado','chato','dormir','bonito','medo','raiva','comer']:
    print(w,'->',out.get(w))
