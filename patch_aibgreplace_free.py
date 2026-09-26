import sys

with open('index.source.html', encoding='utf-8') as f:
    ih = f.read()
with open('server.js', encoding='utf-8') as f:
    sj = f.read()

edits_ih = []

edits_ih.append((
"  {id:'aibgreplace', name:'AI Background Replace', desc:'Product/portrait photos-க்கு AI-generated background — competitors இதை Pro-க்கு பின்னால் வைக்கின்றன, நாங்க free', icon:'🪄', color:'#7C3AED', cat:'image', cost:5},",
"  {id:'aibgreplace', name:'AI Background Replace', desc:'Product/portrait photos-க்கு AI-generated background — competitors இதை Pro-க்கு பின்னால் வைக்கின்றன, நாங்க free', icon:'🪄', color:'#7C3AED', cat:'image'},"
))

edits_ih.append((
'''      if(!p){ mountResult(body, 'Background-ஐ பற்றி describe பண்ணுங்க முதலில்.').style.background='#FDEDEC'; return; }
      const ok = await confirmCreditSpend(body, '5 credits');
      if(!ok) return;
      const prog = mountProgress(body);''',
'''      if(!p){ mountResult(body, 'Background-ஐ பற்றி describe பண்ணுங்க முதலில்.').style.background='#FDEDEC'; return; }
      const prog = mountProgress(body);'''
))

applied, skipped, missing = 0, 0, 0
for old, new in edits_ih:
    if old in ih:
        ih = ih.replace(old, new, 1)
        applied += 1
    elif new in ih:
        skipped += 1
    else:
        print("WARNING (index.source.html): pattern not found:\n", old[:150])
        missing += 1

old_sj = '''    const toolId = req.body.toolId || 'texttoimage';
    allowed = await deductCredits(req.user.id, CREDIT_COST, toolId);
    if (!allowed) return res.status(402).json({ error: 'Not enough credits — please buy more or upgrade to Pro.' });'''
new_sj = '''    const toolId = req.body.toolId || 'texttoimage';
    // aibgreplace is advertised as free (competitors gate this behind their
    // Pro tier; we don't) and the underlying Workers AI call itself is free
    // up to the daily Neurons quota, so it's exempt from this endpoint's
    // usual per-generation charge. Other callers (texttoimage) still pay.
    const isFreeTool = toolId === 'aibgreplace';
    if (!isFreeTool) {
      allowed = await deductCredits(req.user.id, CREDIT_COST, toolId);
      if (!allowed) return res.status(402).json({ error: 'Not enough credits — please buy more or upgrade to Pro.' });
    }'''

if old_sj in sj:
    sj = sj.replace(old_sj, new_sj, 1)
    applied += 1
elif new_sj in sj:
    skipped += 1
else:
    print("WARNING (server.js): pattern not found, check manually")
    missing += 1

with open('index.source.html', 'w', encoding='utf-8') as f:
    f.write(ih)
with open('server.js', 'w', encoding='utf-8') as f:
    f.write(sj)

print(f"Applied {applied}, already-present {skipped}, missing {missing}")
if missing:
    sys.exit(1)
