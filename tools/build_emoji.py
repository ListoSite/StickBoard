import json
eb=json.load(open('eb/package/pt/data.json'))
en=json.load(open('eb/package/en/data.json'))
enmap={e['hexcode']:e for e in en}
cl_pt=json.load(open('package/annotations/pt/annotations.json'))['annotations']['annotations']
cl_ptpt=json.load(open('package/annotations/pt-PT/annotations.json'))['annotations']['annotations']
msgs=json.load(open('eb/package/pt/messages.json'))
out=[]
def kw(d,ch):
    v=d.get(ch) or d.get(ch.replace('️',''))
    if not v: return [],None
    return v.get('default',[]), (v.get('tts') or [None])[0]
for e in eb:
    if e.get('group') in (None,2): continue
    if e.get('version',0)>15: continue
    ch=e['emoji']
    words=[]
    k1,t1=kw(cl_ptpt,ch); k2,t2=kw(cl_pt,ch)
    ptlabel=t1 or e.get('label','')
    for w in [ptlabel,e.get('label','')]+k1+e.get('tags',[])+k2:
        w=w.strip().lower()
        if w and w not in words: words.append(w)
    ee=enmap.get(e['hexcode'],{})
    enw=[]
    for w in [ee.get('label','')]+ee.get('tags',[]):
        w=w.strip().lower()
        if w and w not in enw: enw.append(w)
    out.append((e.get('order',0),[ch,e['group'],ptlabel,'|'.join(words[1:]),'|'.join(enw)]))
out=[o for _,o in sorted(out,key=lambda x:x[0])]
groups={str(g['order']):g['message'] for g in msgs['groups'] if g['order']!=2}
s=json.dumps({'groups':groups,'emojis':out},ensure_ascii=False,separators=(',',':'))
open('/home/claude/sticktag/assets/www/emoji.json','w').write(s)
print(len(out), len(s.encode())//1024,'KB'); print(out[0]); print([o for o in out if o[0] in('❤️','😂')])
