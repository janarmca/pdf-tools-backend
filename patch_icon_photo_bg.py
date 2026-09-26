import sys

with open('index.source.html', encoding='utf-8') as f:
    ih = f.read()

old = '''      <div class="tool-icon" style="position:relative; background:${t.color}22; overflow:visible;">${t.icon}
        <img src="images/tools/${t.id}.jpg" loading="lazy" decoding="async" alt="" style="position:absolute; bottom:-5px; right:-5px; width:20px; height:20px; border-radius:50%; object-fit:cover; border:2px solid var(--card); box-shadow:0 2px 5px rgba(0,0,0,.2);" onerror="this.remove()">
      </div>'''

new = '''      <div class="tool-icon" style="position:relative; background:${t.color}22; overflow:visible;">
        <img src="images/tools/${t.id}.jpg" loading="lazy" decoding="async" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; border-radius:12px;" onerror="this.style.display='none'">
        <span style="position:absolute; bottom:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:${t.color}; display:flex; align-items:center; justify-content:center; font-size:11px; line-height:1; border:2px solid var(--card); box-shadow:0 2px 5px rgba(0,0,0,.25); z-index:2;">${t.icon}</span>
      </div>'''

applied, skipped, missing = 0, 0, 0
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
