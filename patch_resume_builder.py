import sys

with open('Resume_build.html', encoding='utf-8') as f:
    c = f.read()

edits = []

# 1. Toolbar: drop Import/JSON/ATS .txt buttons, add Sample data next to New
edits.append((
'''    <button class="btn ghost" onclick="newResume()">New</button>
    <button class="btn ghost" onclick="document.getElementById('importFile').click()">Import</button>
    <input type="file" id="importFile" accept=".json,application/json" hidden>
    <button class="btn ghost" onclick="exportJSON()">JSON</button>
    <button class="btn ghost" onclick="exportDOC()">Word .doc</button>
    <button class="btn ghost" onclick="downloadTXT()">ATS .txt</button>
    <button class="btn primary" onclick="window.print()">⬇ PDF</button>''',
'''    <button class="btn ghost" onclick="newResume()">New</button>
    <button class="btn ghost" onclick="loadSample()">Sample data</button>
    <button class="btn ghost" onclick="exportDOC()">Word .doc</button>
    <button class="btn primary" onclick="window.print()">⬇ PDF</button>'''
))

# 2. Remove the "Resume versions" panel (save/save-as-new/sample buttons + slot list)
edits.append((
'''    <details class="panel" open>
      <summary>📚 Resume versions</summary>
      <div class="panel-body">
        <div class="btn-row" style="margin-top:4px">
          <button class="btn lite sm" onclick="saveSlot()">💾 Save current</button>
          <button class="btn lite sm" onclick="saveAsNewVersion()">＋ Save as new</button>
          <button class="btn lite sm" onclick="loadSample()">Sample data</button>
        </div>
        <div id="slotList" style="margin-top:10px"></div>
      </div>
    </details>
  </aside>''',
'''  </aside>'''
))

# 3. Drop the now-unused .slot-row / slot-* CSS block
edits.append((
'''.slot-row{border:1px solid #e5eaf1;border-radius:8px;padding:9px 10px;margin-bottom:7px;
  background:#fcfdff;display:flex;flex-direction:column;gap:6px}
.slot-row.current{border-color:#bfdbfe;background:#eff6ff}
.slot-name-input{font-size:12.5px;font-weight:700;padding:6px 8px;border:1px solid transparent;
  background:transparent;border-radius:5px}
.slot-name-input:hover{border-color:#e2e8f0;background:#fff}
.slot-name-input:focus{border-color:#2563eb;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.13)}
.slot-meta{font-size:10.5px;color:#94a3b8;padding:0 8px}
.slot-actions{display:flex;gap:5px;padding:0 4px}
.slot-actions button{flex:1;padding:5px 8px;border-radius:6px;border:1px solid #e2e8f0;
  background:#fff;color:#475569;font-size:11.5px;font-weight:600;cursor:pointer;transition:.15s}
.slot-actions button:hover{background:#f1f5f9;color:#1e293b}
.slot-actions button.load{background:#2563eb;color:#fff;border-color:#2563eb}
.slot-actions button.load:hover{background:#1d4ed8}
.slot-actions button.danger:hover{background:#fee2e2;color:#b91c1c;border-color:#fecaca}
.slot-badge{font-size:9.5px;background:#2563eb;color:#fff;padding:2px 6px;border-radius:10px;
  font-weight:700;margin-left:6px}

.toast{position:fixed;bottom:24px;left:50%;transform:translate(-50%,20px);''',
'''.toast{position:fixed;bottom:24px;left:50%;transform:translate(-50%,20px);'''
))

# 4. Remove SLOTS_KEY constant
edits.append((
'''const STORAGE_KEY = "rb_state_v5";
const SLOTS_KEY   = "rb_slots_v5";''',
'''const STORAGE_KEY = "rb_state_v5";'''
))

# 5. Remove exportJSON + downloadTXT (ATS .txt) functions
edits.append((
'''function exportJSON(){
  const name = (state.contact.fullName || "resume").replace(/\\s+/g, "_").toLowerCase();
  downloadBlob(new Blob([JSON.stringify(state, null, 2)], {type:"application/json"}),
    `${name}_resume.json`);
  toast("JSON exported");
}

function downloadTXT(){
  const c = state.contact;
  const L = [];
  const line = "=".repeat(72), sub = "-".repeat(72);
  L.push((c.fullName || "YOUR NAME").toUpperCase());
  if(c.jobTitle) L.push(c.jobTitle);
  const bits = [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean);
  if(bits.length) L.push(bits.join(" | "));
  L.push(line);

  state.sectionOrder.forEach(key => {
    if(state.hidden[key] || !hasContent(key)) return;
    if(key === "summary"){ L.push("", SECTION_HEADINGS.summary.toUpperCase(), sub, state.summary); }
    if(key === "experience"){
      L.push("", SECTION_HEADINGS.experience.toUpperCase(), sub);
      state.experience.filter(e => e.jobTitle || e.company).forEach(e => {
        L.push(`${e.jobTitle || ""}${e.company ? " — " + e.company : ""}`);
        const d = [e.startDate, e.endDate].filter(Boolean).join(" – ");
        const loc = [d, e.location].filter(Boolean).join(" | ");
        if(loc) L.push(loc);
        (e.bullets || []).map(b => stripTags(b.html)).filter(Boolean).forEach(b => L.push("  • " + b));
        L.push("");
      });
    }
    if(key === "projects"){
      L.push("", SECTION_HEADINGS.projects.toUpperCase(), sub);
      state.projects.filter(p => p.name).forEach(p => {
        L.push(p.name + (p.tech ? ` — ${p.tech}` : ""));
        (p.bullets || []).map(b => stripTags(b.html)).filter(Boolean).forEach(b => L.push("  • " + b));
        L.push("");
      });
    }
    if(key === "education"){
      L.push("", SECTION_HEADINGS.education.toUpperCase(), sub);
      state.education.filter(e => e.degree || e.institution).forEach(e => {
        L.push(`${e.degree || ""}${e.institution ? " — " + e.institution : ""}`);
        const d = [e.graduationDate, e.location, e.gpa ? "GPA: " + e.gpa : ""].filter(Boolean).join(" | ");
        if(d) L.push(d);
        L.push("");
      });
    }
    if(key === "skills"){ L.push("", SECTION_HEADINGS.skills.toUpperCase(), sub, state.skills.join(", ")); }
    if(key === "certifications"){
      L.push("", SECTION_HEADINGS.certifications.toUpperCase(), sub);
      state.certifications.filter(x => x.name).forEach(x => {
        L.push(`${x.name}${x.issuer ? " — " + x.issuer : ""}${x.date ? " (" + x.date + ")" : ""}`);
      });
    }
  });

  const name = (c.fullName || "resume").replace(/\\s+/g, "_").toLowerCase();
  downloadBlob(new Blob([L.join("\\n")], {type:"text/plain;charset=utf-8"}),
    `${name}_resume_ATS.txt`);
  toast("ATS text version downloaded");
}

function exportDOC(){''',
'''function exportDOC(){'''
))

# 6. Remove importJSON function
edits.append((
'''function importJSON(file){
  const reader = new FileReader();
  reader.onload = e => {
    try{
      state = normalizeState(JSON.parse(e.target.result));
      refreshAll();
      $("jdInput").value = state.jobDescription || "";
      if(state.jobDescription) analyzeJD();
      toast("Resume imported");
    }catch(err){
      toast("Could not read that file");
    }
  };
  reader.readAsText(file);
}

function newResume(){''',
'''function newResume(){'''
))

# 7. Remove the whole VERSIONS (slots) section
edits.append((
'''/* ============================================================================
   18. VERSIONS
   ============================================================================ */
function getSlots(){
  try{ return JSON.parse(localStorage.getItem(SLOTS_KEY) || "[]"); }catch(e){ return []; }
}
function setSlots(arr){ try{ localStorage.setItem(SLOTS_KEY, JSON.stringify(arr)); }catch(e){} }

function formatDate(iso){
  if(!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if(diff < 60) return "just now";
  if(diff < 3600) return `${Math.floor(diff/60)} min ago`;
  if(diff < 86400) return `${Math.floor(diff/3600)} hr ago`;
  if(diff < 604800) return `${Math.floor(diff/86400)} day${Math.floor(diff/86400)===1?"":"s"} ago`;
  return d.toLocaleDateString();
}

function estimateSize(data){
  try{
    const bytes = new Blob([JSON.stringify(data)]).size;
    return bytes < 1024 ? `${bytes} B` : `${(bytes/1024).toFixed(1)} KB`;
  }catch(e){ return ""; }
}

function saveSlot(){
  const slots = getSlots();
  const record = {
    id: state.resumeId || uid(),
    name: state.contact.fullName || "Untitled",
    role: state.contact.jobTitle || "",
    savedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(state))
  };
  const i = slots.findIndex(s => s.id === record.id);
  if(i >= 0) slots[i] = record; else slots.unshift(record);
  setSlots(slots);
  state.resumeId = record.id;
  saveDraft(); renderSlots();
  toast("Version saved");
}

function saveAsNewVersion(){
  const baseName = (state.contact.fullName || "Resume") + " v" + (getSlots().length + 1);
  const record = {
    id: uid(),
    name: baseName,
    role: state.contact.jobTitle || "",
    savedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(state))
  };
  const slots = getSlots();
  slots.unshift(record);
  setSlots(slots);
  state.resumeId = record.id;
  saveDraft(); renderSlots();
  toast("Saved as new version");
}

function loadSlot(id){
  const slot = getSlots().find(s => s.id === id);
  if(!slot) return;
  state = normalizeState(JSON.parse(JSON.stringify(slot.data)));
  refreshAll();
  $("jdInput").value = state.jobDescription || "";
  if(state.jobDescription) analyzeJD(); else $("jdResults").innerHTML = "";
  toast("Version loaded");
}

function duplicateSlot(id){
  const slot = getSlots().find(s => s.id === id);
  if(!slot) return;
  const slots = getSlots();
  const copy = {
    id: uid(),
    name: slot.name + " (copy)",
    role: slot.role,
    savedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(slot.data))
  };
  copy.data.resumeId = copy.id;
  const idx = slots.findIndex(s => s.id === id);
  slots.splice(idx + 1, 0, copy);
  setSlots(slots);
  renderSlots();
  toast("Version duplicated");
}

function deleteSlot(id){
  if(!confirm("Delete this version? This cannot be undone.")) return;
  setSlots(getSlots().filter(s => s.id !== id));
  renderSlots();
  toast("Version deleted");
}

function renameSlot(id, newName){
  const slots = getSlots();
  const slot = slots.find(s => s.id === id);
  if(!slot) return;
  slot.name = newName;
  setSlots(slots);
}

function renderSlots(){
  const wrap = $("slotList");
  const slots = getSlots();
  if(!slots.length){
    wrap.innerHTML = `<div class="empty-note">No saved versions yet — save one to keep your progress.</div>`;
    return;
  }
  wrap.innerHTML = slots.map(s => {
    const isCurrent = s.id === state.resumeId;
    return `<div class="slot-row ${isCurrent ? "current" : ""}">
      <input class="slot-name-input" value="${esc(s.name)}"
             oninput="renameSlot('${s.id}', this.value)" placeholder="Version name">
      <div class="slot-meta">
        ${esc(s.role || "No role set")} · ${formatDate(s.savedAt)} · ${estimateSize(s.data)}
        ${isCurrent ? '<span class="slot-badge">CURRENT</span>' : ""}
      </div>
      <div class="slot-actions">
        <button class="load" onclick="loadSlot('${s.id}')">Open</button>
        <button onclick="duplicateSlot('${s.id}')" title="Duplicate">⧉ Copy</button>
        <button class="danger" onclick="deleteSlot('${s.id}')" title="Delete">✕</button>
      </div>
    </div>`;
  }).join("");
}

/* ============================================================================
   19. SAMPLE DATA
   ============================================================================ */''',
'''/* ============================================================================
   18. SAMPLE DATA
   ============================================================================ */'''
))

# 8. Remove renderSlots() call inside refreshAll()
edits.append((
'''  renderSkillTags();
  renderSectionList();
  renderSlots();
  render();
  saveDraft();
}''',
'''  renderSkillTags();
  renderSectionList();
  render();
  saveDraft();
}'''
))

# 9. Remove renderSlots() call, the importFile listener, and the Ctrl+S->saveSlot shortcut in init()
edits.append((
'''  renderSkillTags();
  renderSectionList();
  renderSlots();
  render();

  if(state.jobDescription){
    $("jdInput").value = state.jobDescription;
    setTimeout(analyzeJD, 50);
  }

  $("importFile").addEventListener("change", e => {
    const f = e.target.files[0];
    if(f) importJSON(f);
    e.target.value = "";
  });

  document.addEventListener("keydown", e => {
    const inCE = e.target.closest && e.target.closest("[contenteditable]");
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.shiftKey){
      e.preventDefault(); saveSlot();
    } else if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey){''',
'''  renderSkillTags();
  renderSectionList();
  render();

  if(state.jobDescription){
    $("jdInput").value = state.jobDescription;
    setTimeout(analyzeJD, 50);
  }

  document.addEventListener("keydown", e => {
    const inCE = e.target.closest && e.target.closest("[contenteditable]");
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey){'''
))

applied, skipped, missing = 0, 0, 0
for old, new in edits:
    if old in c:
        c = c.replace(old, new, 1)
        applied += 1
    elif new in c:
        skipped += 1
    else:
        print("WARNING: pattern not found, check manually:\n", old[:150])
        missing += 1

with open('Resume_build.html', 'w', encoding='utf-8') as f:
    f.write(c)

print(f"Applied {applied}, already-present {skipped}, missing {missing}")
if missing:
    sys.exit(1)
