import sys

with open('Resume_build.html', encoding='utf-8') as f:
    rb = f.read()
with open('index.source.html', encoding='utf-8') as f:
    ih = f.read()

edits_rb = []

edits_rb.append((
'''    <button class="btn ghost" onclick="loadSample()">Sample data</button>
    <button class="btn ghost" onclick="exportDOC()">Word .doc</button>
    <button class="btn primary" onclick="window.print()">⬇ PDF</button>''',
'''    <button class="btn ghost" onclick="loadSample()">Sample data</button>
    <button class="btn ghost" id="btnExportDoc" onclick="handleExportDocClick()">Word .doc <span style="opacity:.7;font-weight:600;">(20 credits)</span></button>
    <button class="btn primary" onclick="window.print()">⬇ PDF</button>'''
))

edits_rb.append((
'''    const data = await res.json();
    if(data.error) throw new Error(data.error);
    return (data.answer || '').trim() || null;
  }catch(e){ return null; } // network hiccup, out of credits, etc. — fall back silently rather than blocking the user's workflow
}''',
'''    const data = await res.json();
    if(data.error) throw new Error(data.error);
    return (data.answer || '').trim() || null;
  }catch(e){ return null; } // network hiccup, out of credits, etc. — fall back silently rather than blocking the user's workflow
}

const WORD_EXPORT_COST = 20; // credits charged per Word (.doc) download
// Charges credits via the same generic gate the main app uses for other paid
// actions (POST /api/credits/use — see server.js). Unlike callRealAI above,
// this must NOT fail silently: it's a real charge gating a real download, so
// every failure path (not signed in, out of credits, network error) blocks
// the download and tells the person why, rather than giving it away free.
async function chargeCreditsForWordExport(){
  if(!__authToken){
    alert('Please open Resume Builder from the main site while signed in to download the Word file — this uses ' + WORD_EXPORT_COST + ' credits from your account.');
    return false;
  }
  try{
    const res = await fetch(BACKEND_URL + '/api/credits/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + __authToken },
      body: JSON.stringify({ toolId: 'resumebuilder', cost: WORD_EXPORT_COST })
    });
    const data = await res.json();
    if(!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
    return true;
  }catch(e){
    alert('Could not charge credits for the Word download: ' + e.message);
    return false;
  }
}

async function handleExportDocClick(){
  const btn = $("btnExportDoc");
  if(btn){ btn.disabled = true; }
  try{
    const ok = await chargeCreditsForWordExport();
    if(ok) exportDOC();
  } finally {
    if(btn){ btn.disabled = false; }
  }
}'''
))

applied, skipped, missing = 0, 0, 0
for old, new in edits_rb:
    if old in rb:
        rb = rb.replace(old, new, 1)
        applied += 1
    elif new in rb:
        skipped += 1
    else:
        print("WARNING (Resume_build.html): pattern not found:\n", old[:150])
        missing += 1

old_v = "TOOL_IMPL.resumebuilder = { mount(container){ mountEmbeddedTool(container, 'Resume_build.html?v=2', 'Resume Builder', true); } };"
new_v = "TOOL_IMPL.resumebuilder = { mount(container){ mountEmbeddedTool(container, 'Resume_build.html?v=3', 'Resume Builder', true); } };"
if old_v in ih:
    ih = ih.replace(old_v, new_v, 1)
    applied += 1
elif new_v in ih:
    skipped += 1
else:
    print("WARNING (index.source.html): version-bump pattern not found")
    missing += 1

with open('Resume_build.html', 'w', encoding='utf-8') as f:
    f.write(rb)
with open('index.source.html', 'w', encoding='utf-8') as f:
    f.write(ih)

print(f"Applied {applied}, already-present {skipped}, missing {missing}")
if missing:
    sys.exit(1)
