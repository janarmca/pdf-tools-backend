import sys, os

# ---- Part 1: revert tool cards (category-page grid) to the compact
# icon+name+desc design, with the AI photo shown INSIDE the small icon
# square (like the Recently Used row) instead of as a big banner photo. ----
with open('index.source.html', encoding='utf-8') as f:
    ih = f.read()

old_card = '''function renderToolCard(t){
  const isPaid = !!t.cost;
  return el(`
    <a class="tool-card" href="/tools/${toolSlug(t)}.html" data-open="${t.id}" style="position:relative; padding:0; gap:0; overflow:hidden; box-shadow:0 1px 3px rgba(20,30,60,.06); text-decoration:none; color:inherit;">
      <div style="position:relative; width:100%; height:118px; overflow:hidden; border-radius:16px 16px 0 0; background:${t.color}18; flex-shrink:0;">
        <img src="images/tools/${t.id}.jpg" loading="lazy" decoding="async" alt="" width="185" height="118" style="display:block; width:100%; height:118px; object-fit:cover;" onerror="this.style.display='none'">
        ${isPaid ? `<div style="position:absolute; top:8px; right:8px; background:#fff; color:#B8860B; font-size:9.5px; font-weight:800; padding:3px 7px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,.15);">⚡ ${t.cost} credit${t.cost>1?'s':''}</div>` : ''}
        <div class="tool-icon" style="position:absolute; bottom:-16px; left:14px; background:${t.color}; box-shadow:0 4px 10px rgba(0,0,0,.18); border:3px solid var(--card);">${t.icon}</div>
      </div>
      <div style="padding:24px 16px 18px; display:flex; flex-direction:column; gap:6px; text-align:left;">
        <div class="tool-name">${t.name}</div>
        <div class="tool-desc">${t.desc}</div>
      </div>
    </a>
  `);
}'''

new_card = '''function renderToolCard(t){
  const isPaid = !!t.cost;
  return el(`
    <a class="tool-card" href="/tools/${toolSlug(t)}.html" data-open="${t.id}" style="position:relative; text-decoration:none; color:inherit;">
      ${isPaid ? `<div style="position:absolute; top:8px; right:8px; background:#FFF3E0; color:#B8860B; font-size:9.5px; font-weight:800; padding:2px 6px; border-radius:6px;">⚡ ${t.cost} credit${t.cost>1?'s':''}</div>` : ''}
      <div class="tool-icon" style="position:relative; background:${t.color}22; overflow:hidden;">${t.icon}
        <img src="images/tools/${t.id}.jpg" loading="lazy" decoding="async" alt="" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;" onerror="this.remove()">
      </div>
      <div class="tool-name">${t.name}</div>
      <div class="tool-desc">${t.desc}</div>
    </a>
  `);
}'''

applied, skipped, missing = 0, 0, 0
if old_card in ih:
    ih = ih.replace(old_card, new_card, 1)
    applied += 1
elif new_card in ih:
    skipped += 1
else:
    print("WARNING (index.source.html): renderToolCard pattern not found, check manually")
    missing += 1

with open('index.source.html', 'w', encoding='utf-8') as f:
    f.write(ih)

# ---- Part 2: shrink the 6 homepage category banner photos. They were
# never resized after AI-generation (still raw 1024x1024, ~520-650KB each)
# unlike the per-tool photos which were resized to 400x400 long ago -- on
# slow mobile connections these large files can fail/time out, which is
# what was showing up as the category banner not appearing at full size
# on the home page (falls back to the small flat SVG icon instead). ----
try:
    from PIL import Image
except ImportError:
    os.system(f"{sys.executable} -m pip install --quiet --break-system-packages Pillow || {sys.executable} -m pip install --quiet Pillow")
    from PIL import Image

resized, already_small, img_missing = 0, 0, 0
for fn in ['ai.jpg','business.jpg','education.jpg','image.jpg','pdf.jpg','video.jpg']:
    path = f'images/tools-cat/{fn}'
    if not os.path.exists(path):
        print(f"WARNING: {path} not found, skipping")
        img_missing += 1
        continue
    before = os.path.getsize(path)
    with Image.open(path) as im:
        w, h = im.size
        if w <= 480 and h <= 480 and before < 100_000:
            already_small += 1
            continue
        im = im.convert('RGB').resize((480, 480), Image.LANCZOS)
        im.save(path, 'JPEG', quality=80, optimize=True)
    after = os.path.getsize(path)
    print(f"{fn}: {before/1024:.0f}KB -> {after/1024:.0f}KB")
    resized += 1

print(f"\nTool-card edit: applied {applied}, already-present {skipped}, missing {missing}")
print(f"Category images: resized {resized}, already small {already_small}, missing {img_missing}")
if missing or img_missing:
    sys.exit(1)
