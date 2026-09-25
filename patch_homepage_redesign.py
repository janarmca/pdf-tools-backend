import sys

with open('index.source.html', encoding='utf-8') as f:
    ih = f.read()

edits = []

# 1. Compact hero (smaller padding/margins/font so it takes less vertical space)
edits.append((
'''  .hero{padding:22px 26px 26px; margin-top:14px; border-radius:22px; background:linear-gradient(135deg, #EEF2FF 0%, #F6F7FB 55%, #FFF6ED 100%); border:1px solid var(--line); position:relative; overflow:hidden;}
  .hero::before{content:''; position:absolute; top:-40px; right:-40px; width:160px; height:160px; border-radius:50%; background:radial-gradient(circle, rgba(55,82,166,.12), transparent 70%);}
  .hero::after{content:''; position:absolute; bottom:-60px; left:-30px; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle, rgba(232,137,74,.12), transparent 70%);}
  .hero h1{font-size:27px; font-weight:900; margin:0 0 8px; letter-spacing:-0.5px; position:relative; background:linear-gradient(90deg,var(--brand-dark),var(--brand)); -webkit-background-clip:text; background-clip:text; color:transparent;}
  .hero p{color:var(--sub); font-size:14px; margin:0 0 14px; max-width:600px; line-height:1.6; position:relative;}''',
'''  .hero{padding:16px 20px 18px; margin-top:12px; border-radius:20px; background:linear-gradient(135deg, #EEF2FF 0%, #F6F7FB 55%, #FFF6ED 100%); border:1px solid var(--line); position:relative; overflow:hidden;}
  .hero::before{content:''; position:absolute; top:-40px; right:-40px; width:160px; height:160px; border-radius:50%; background:radial-gradient(circle, rgba(55,82,166,.12), transparent 70%);}
  .hero::after{content:''; position:absolute; bottom:-60px; left:-30px; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle, rgba(232,137,74,.12), transparent 70%);}
  .hero h1{font-size:22px; font-weight:900; margin:0 0 6px; letter-spacing:-0.4px; position:relative; background:linear-gradient(90deg,var(--brand-dark),var(--brand)); -webkit-background-clip:text; background-clip:text; color:transparent;}
  .hero p{color:var(--sub); font-size:12.5px; margin:0 0 10px; max-width:600px; line-height:1.5; position:relative;}'''
))

# 2. Condense the trust banner from a tall 2-card grid into a compact single card
edits.append((
'''function renderTrustBanner(){
  return el(`
    <div class="tamil" style="max-width:720px; margin:16px auto 0; background:#132A4D; border-radius:18px; padding:18px 20px; box-shadow:0 8px 24px rgba(19,42,77,.22);">
      <div style="font-weight:900; font-size:14px; color:#fff; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">🇮🇳</span> ${tr('trustTitle')}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="background:rgba(255,255,255,.08); border-radius:12px; padding:12px 14px;">
          <div style="font-size:11.5px; font-weight:900; color:#6FE0A0; margin-bottom:5px;">${tr('freeTitle')}</div>
          <div style="font-size:11.5px; color:rgba(255,255,255,.82); line-height:1.5;">${tr('freeDesc')}</div>
        </div>
        <div style="background:rgba(255,255,255,.08); border-radius:12px; padding:12px 14px;">
          <div style="font-size:11.5px; font-weight:900; color:#F5C05A; margin-bottom:5px;">${tr('creditTitle')}</div>
          <div style="font-size:11.5px; color:rgba(255,255,255,.82); line-height:1.5;">${tr('creditDesc')}</div>
        </div>
      </div>
    </div>
  `);
}''',
'''function renderTrustBanner(){
  return el(`
    <div class="tamil" style="max-width:720px; margin:10px auto 0; background:#132A4D; border-radius:14px; padding:11px 16px; box-shadow:0 6px 18px rgba(19,42,77,.18);">
      <div style="font-size:11.5px; font-weight:900; color:#fff; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
        <span>🇮🇳</span> ${tr('trustTitle')}
      </div>
      <div style="display:flex; gap:16px; flex-wrap:wrap;">
        <div style="font-size:10.5px; color:rgba(255,255,255,.85); line-height:1.4;"><b style="color:#6FE0A0;">${tr('freeTitle')}</b> — ${tr('freeDesc')}</div>
        <div style="font-size:10.5px; color:rgba(255,255,255,.85); line-height:1.4;"><b style="color:#F5C05A;">${tr('creditTitle')}</b> — ${tr('creditDesc')}</div>
      </div>
    </div>
  `);
}'''
))

# 3. Move the daily Thirukkural card to AFTER the tool-browsing grid instead of
# before it, so visitors reach actual tools without scrolling past it first.
# The Kural itself is unchanged and still shown on every homepage visit -
# just lower down, since it's valued content but not what people land for.
edits.append((
'''    app.appendChild(renderHero());
    app.appendChild(renderTrustBanner());
    app.appendChild(renderDailyKural());
    app.appendChild(renderGrid());''',
'''    app.appendChild(renderHero());
    app.appendChild(renderTrustBanner());
    app.appendChild(renderGrid());
    app.appendChild(renderDailyKural());'''
))

# 4. Give the Kural a bit more breathing room now that it sits below the grid
edits.append((
'''  const wrap = el(`<div id="__kuralWrap" style="max-width:720px; margin:14px auto 0;"></div>`);''',
'''  const wrap = el(`<div id="__kuralWrap" style="max-width:720px; margin:28px auto 0;"></div>`);'''
))

applied, skipped, missing = 0, 0, 0
for old, new in edits:
    if old in ih:
        ih = ih.replace(old, new, 1)
        applied += 1
    elif new in ih:
        skipped += 1
    else:
        print("WARNING: pattern not found, check manually:\n", old[:150])
        missing += 1

with open('index.source.html', 'w', encoding='utf-8') as f:
    f.write(ih)

print(f"Applied {applied}, already-present {skipped}, missing {missing}")
if missing:
    sys.exit(1)
