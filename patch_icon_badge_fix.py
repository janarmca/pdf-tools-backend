import sys

with open('index.source.html', encoding='utf-8') as f:
    ih = f.read()

old = '''      <div class="tool-icon" style="position:relative; background:${t.color}22; overflow:hidden;">${t.icon}
        <img src="images/tools/${t.id}.jpg" loading="lazy" decoding="async" alt="" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;" onerror="this.remove()">
      </div>'''

new = '''      <div class="tool-icon" style="position:relative; background:${t.color}22; overflow:visible;">${t.icon}
        <img src="images/tools/${t.id}.jpg" loading="lazy" decoding="async" alt="" style="position:absolute; bottom:-5px; right:-5px; width:20px; height:20px; border-radius:50%; object-fit:cover; border:2px solid var(--card); box-shadow:0 2px 5px rgba(0,0,0,.2);" onerror="this.remove()">
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
