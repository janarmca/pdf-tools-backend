import sys

with open('index.source.html', encoding='utf-8') as f:
    c = f.read()

edits = []

# Edit 1: add pptxgenjs CDN script tag
edits.append((
'<script src="https://unpkg.com/@supabase/supabase-js@2"></script>',
'''<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>'''
))

# Edit 2: add 8 new TOOLS array entries
edits.append((
"  {id:'pdf2text', name:'PDF → Text', desc:'Extract the text content', icon:'📝', color:'#556270', cat:'pdf'},",
"""  {id:'pdf2text', name:'PDF → Text', desc:'Extract the text content', icon:'📝', color:'#556270', cat:'pdf'},
  {id:'pdf2png', name:'PDF → PNG', desc:'Every page as a lossless PNG image', icon:'🖼️', color:'#2E7D32', cat:'pdf'},
  {id:'extractpages', name:'Extract Pages', desc:'Pick specific pages and save them as one new PDF', icon:'📑', color:'#1565C0', cat:'pdf'},
  {id:'pdfflatten', name:'Flatten PDF', desc:'Bakes every page into a flat image — removes editable text and form fields', icon:'🧱', color:'#6D4C41', cat:'pdf'},
  {id:'pdfrepair', name:'Repair PDF', desc:'Rebuilds a damaged or unreadable PDF into a fresh, valid file', icon:'🛠️', color:'#EF6C00', cat:'pdf'},
  {id:'pdfmetaremove', name:'PDF Metadata Remover', desc:'Strips author, title, software and other hidden metadata', icon:'🕵️', color:'#455A64', cat:'pdf'},
  {id:'pdfocrsearchable', name:'OCR PDF → Searchable PDF', desc:'Adds an invisible text layer to a scan so it becomes searchable and copyable', icon:'🔎', color:'#00695C', cat:'pdf'},
  {id:'pdf2ppt', name:'PDF → PowerPoint', desc:'Each page becomes one full-size slide image in a .pptx file', icon:'📽️', color:'#C0392B', cat:'pdf'},
  {id:'ppt2pdf', name:'PowerPoint → PDF', desc:'Turns each slide, text and images, into a matching PDF page', icon:'📄', color:'#8E44AD', cat:'pdf'},"""
))

# Edit 3: add the 8 new TOOL_IMPL blocks
NEW_TOOLS_JS = r'''/* ===================== PDF -> PNG ===================== */
TOOL_IMPL.pdf2png = {
  mount(container){
    let file = null;
    const body = el(`<div></div>`); container.appendChild(body);
    async function handleFile(f){ file = f; file._buf = await readFileAsArrayBuffer(file); paint(); }
    function paint(){
      body.innerHTML = '';
      mountUploader(body, {
        accept:'application/pdf',
        label:'Drop a PDF file', sublabel:'Every page downloads as a lossless PNG (ZIP)',
        onAdd: async (fl)=> handleFile(fl[0])
      });
      if(file){
        mountFileList(body, [file], ()=>{ file=null; paint(); });
        const opts = el(`
          <div class="opts one">
            <div class="field">
              <label>Quality/Resolution</label>
              <select id="pngQualSel">
                <option value="1">Standard (Fast)</option>
                <option value="2" selected>Good (Recommended)</option>
                <option value="3">High-res (slower)</option>
              </select>
            </div>
          </div>
        `);
        body.appendChild(opts);
        const row = el(`<div class="btn-row"></div>`);
        const btn = el(`<button class="btn">🖼️ Convert to PNG</button>`);
        btn.onclick = doConvert;
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    if(__pendingSmartUploadFile){
      const f = __pendingSmartUploadFile; __pendingSmartUploadFile = null;
      handleFile(f);
    } else {
      paint();
    }
    async function doConvert(){
      const scale = Number(body.querySelector('#pngQualSel').value);
      const prog = mountProgress(body);
      try{
        const pdfjsDoc = await loadPdfJs(file._buf);
        const zip = new JSZip();
        const pageImages = [];
        for(let i=1;i<=pdfjsDoc.numPages;i++){
          prog.set((i/pdfjsDoc.numPages)*90, `page ${i}/${pdfjsDoc.numPages}…`);
          const page = await pdfjsDoc.getPage(i);
          const viewport = page.getViewport({scale});
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
          const dataUrl = canvas.toDataURL('image/png');
          const base64 = dataUrl.split(',')[1];
          const filename = `page-${String(i).padStart(3,'0')}.png`;
          zip.file(filename, base64, {base64:true});
          pageImages.push({dataUrl, filename});
        }
        prog.set(95,'ZIP Preparing…');
        const blob = await zip.generateAsync({type:'blob'});
        prog.set(100,'Done');
        prog.remove();
        const zipRow = el(`<div class="btn-row" style="margin-top:4px;"></div>`);
        const zipBtn = el(`<button class="btn">📦 Download all as ZIP</button>`);
        zipBtn.onclick = ()=> downloadBlob(blob, 'pages-png.zip');
        zipRow.appendChild(zipBtn);
        mountResult(body, `${pdfjsDoc.numPages} pages ready as PNG — view each below, or download individually or as a ZIP.`);
        body.appendChild(zipRow);
        const gallery = el(`<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px; margin-top:14px;"></div>`);
        pageImages.forEach((pg,idx)=>{
          const card = el(`
            <div style="border:1px solid var(--line); border-radius:10px; overflow:hidden; background:#fff;">
              <img src="${pg.dataUrl}" style="width:100%; display:block; cursor:pointer;" loading="lazy">
              <div style="padding:6px 8px; display:flex; align-items:center; justify-content:space-between; gap:6px;">
                <span style="font-size:10.5px; color:var(--sub);">Page ${idx+1}</span>
                <button style="border:none; background:none; cursor:pointer; font-size:14px;" title="Download">📥</button>
              </div>
            </div>
          `);
          const img = card.querySelector('img');
          img.onclick = ()=> window.open(pg.dataUrl, '_blank');
          card.querySelector('button').onclick = ()=>{
            fetch(pg.dataUrl).then(r=>r.blob()).then(b=> downloadBlob(b, pg.filename));
          };
          gallery.appendChild(card);
        });
        body.appendChild(gallery);
      }catch(err){ prog.remove(); mountResult(body,'Error: '+err.message).style.background='#FDEDEC'; }
    }
    paint();
  }
};

/* ===================== EXTRACT PAGES ===================== */
TOOL_IMPL.extractpages = {
  mount(container){
    let file = null, pageCount = 0;
    const body = el(`<div></div>`); container.appendChild(body);
    function paint(){
      body.innerHTML = '';
      if(!file){
        mountUploader(body, {
          accept:'application/pdf',
          label:'Drop a PDF file', sublabel:'Pick the pages you want, in one go',
          onAdd: async (fl)=>{
            file = fl[0];
            const buf = await readFileAsArrayBuffer(file);
            const doc = await PDFDocument.load(buf, {ignoreEncryption:true});
            pageCount = doc.getPageCount();
            file._buf = buf;
            paint();
          }
        });
        return;
      }
      mountFileList(body, [file], ()=>{ file=null; paint(); });
      const opts = el(`
        <div class="opts one">
          <div class="field">
            <label>Pages to extract (e.g. 1-3, 5, 7-9) — out of ${pageCount} pages</label>
            <input type="text" id="epRangeInput" placeholder="1-${pageCount}" value="1-${pageCount}">
          </div>
        </div>
      `);
      body.appendChild(opts);
      const row = el(`<div class="btn-row"></div>`);
      const btn = el(`<button class="btn">📑 Extract & Download</button>`);
      btn.onclick = doExtract;
      row.appendChild(btn);
      body.appendChild(row);
    }
    function parseRanges(str, max){
      const idxs = new Set();
      str.split(',').forEach(part=>{
        part = part.trim(); if(!part) return;
        if(part.includes('-')){
          const [a,b] = part.split('-').map(n=>parseInt(n.trim(),10));
          if(!isNaN(a) && !isNaN(b)){ for(let i=Math.max(1,a); i<=Math.min(max,b); i++) idxs.add(i-1); }
        } else {
          const n = parseInt(part,10);
          if(!isNaN(n) && n>=1 && n<=max) idxs.add(n-1);
        }
      });
      return Array.from(idxs).sort((a,b)=>a-b);
    }
    async function doExtract(){
      const rangeStr = body.querySelector('#epRangeInput').value || `1-${pageCount}`;
      const idxs = parseRanges(rangeStr, pageCount);
      if(!idxs.length){ mountResult(body,'Please enter a valid page range.').style.background='#FDEDEC'; return; }
      const prog = mountProgress(body);
      try{
        prog.set(15,'Reading…');
        const src = await PDFDocument.load(file._buf, {ignoreEncryption:true});
        prog.set(50,'Extracting…');
        const outDoc = await PDFDocument.create();
        const pages = await outDoc.copyPages(src, idxs);
        pages.forEach(p=>outDoc.addPage(p));
        prog.set(90,'Preparing…');
        const bytes = await outDoc.save();
        downloadBlob(new Blob([bytes],{type:'application/pdf'}), file.name.replace(/\.pdf$/i,'')+'-extracted.pdf');
        prog.set(100,'Done'); prog.remove();
        mountResult(body, `${idxs.length} page${idxs.length>1?'s':''} extracted — PDF downloaded.`);
      }catch(err){ prog.remove(); mountResult(body,'Error: '+err.message).style.background='#FDEDEC'; }
    }
    paint();
  }
};

/* ===================== FLATTEN PDF ===================== */
TOOL_IMPL.pdfflatten = {
  mount(container){
    let file = null;
    const body = el(`<div></div>`); container.appendChild(body);
    function paint(){
      body.innerHTML = '';
      body.appendChild(el(`<div class="note" style="background:#FFF3E0; border-color:#FFD699;">⚠️ This bakes every page into a flat image — it looks identical, but text/fields are no longer selectable or editable, and form fields become permanent. Good for locking down a final version.</div>`));
      mountUploader(body, { accept:'application/pdf', label:'Drop a PDF file', sublabel:'',
        onAdd: async (fl)=>{ file = fl[0]; file._buf = await readFileAsArrayBuffer(file); paint(); } });
      if(file){
        mountFileList(body, [file], ()=>{ file=null; paint(); });
        const opts = el(`
          <div class="opts one">
            <div class="field">
              <label>Quality</label>
              <select id="flQualSel">
                <option value="1.5">Standard (smaller file)</option>
                <option value="2.2" selected>Good (Recommended)</option>
                <option value="3">High (larger file)</option>
              </select>
            </div>
          </div>
        `);
        body.appendChild(opts);
        const row = el(`<div class="btn-row"></div>`);
        const btn = el(`<button class="btn">🧱 Flatten PDF</button>`);
        btn.onclick = doFlatten;
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    async function doFlatten(){
      const scale = Number(body.querySelector('#flQualSel').value);
      const prog = mountProgress(body);
      try{
        const pdfjsDoc = await loadPdfJs(file._buf);
        const outDoc = await PDFDocument.create();
        for(let i=1;i<=pdfjsDoc.numPages;i++){
          prog.set((i/pdfjsDoc.numPages)*90, `page ${i}/${pdfjsDoc.numPages} — Flattening…`);
          const page = await pdfjsDoc.getPage(i);
          const viewport = page.getViewport({scale});
          const canvas = document.createElement('canvas'); canvas.width=viewport.width; canvas.height=viewport.height;
          await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
          const jpgDataUrl = canvas.toDataURL('image/jpeg',0.9);
          const jpgBytes = await (await fetch(jpgDataUrl)).arrayBuffer();
          const embedded = await outDoc.embedJpg(jpgBytes);
          const origSize = page.getViewport({scale:1});
          const outPage = outDoc.addPage([origSize.width, origSize.height]);
          outPage.drawImage(embedded, {x:0,y:0,width:origSize.width,height:origSize.height});
        }
        prog.set(95,'Preparing…');
        const bytes = await outDoc.save();
        downloadBlob(new Blob([bytes],{type:'application/pdf'}), file.name.replace(/\.pdf$/i,'')+'-flattened.pdf');
        prog.set(100,'Done'); prog.remove();
        mountResult(body, 'Flattened PDF downloaded — every page is now a locked image.');
      }catch(err){ prog.remove(); mountResult(body,'Error: '+err.message).style.background='#FDEDEC'; }
    }
    paint();
  }
};

/* ===================== REPAIR PDF ===================== */
TOOL_IMPL.pdfrepair = {
  mount(container){
    let file = null;
    const body = el(`<div></div>`); container.appendChild(body);
    function paint(){
      body.innerHTML = '';
      body.appendChild(el(`<div class="note">Tries to fix a PDF that will not open or throws an error elsewhere. First attempts a lossless repair (keeps real, selectable text); if the file is too damaged for that, rebuilds it page-by-page from what can still be displayed.</div>`));
      mountUploader(body, { accept:'application/pdf', label:'Drop the damaged PDF file', sublabel:'',
        onAdd: async (fl)=>{ file = fl[0]; file._buf = await readFileAsArrayBuffer(file); paint(); } });
      if(file){
        mountFileList(body, [file], ()=>{ file=null; paint(); });
        const row = el(`<div class="btn-row"></div>`);
        const btn = el(`<button class="btn">🛠️ Repair PDF</button>`);
        btn.onclick = doRepair;
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    async function doRepair(){
      const prog = mountProgress(body);
      try{
        prog.set(15,'Trying a lossless repair…');
        try{
          const src = await PDFDocument.load(file._buf, {ignoreEncryption:true, throwOnInvalidObject:false, updateMetadata:false});
          prog.set(60,'Rebuilding file structure…');
          const bytes = await src.save();
          prog.set(100,'Done'); prog.remove();
          downloadBlob(new Blob([bytes],{type:'application/pdf'}), file.name.replace(/\.pdf$/i,'')+'-repaired.pdf');
          mountResult(body, 'Repaired PDF downloaded — original text and formatting kept.');
          return;
        }catch(innerErr){
          prog.set(30, 'Lossless repair failed — rebuilding from page images…');
        }
        const pdfjsDoc = await loadPdfJs(file._buf);
        const outDoc = await PDFDocument.create();
        for(let i=1;i<=pdfjsDoc.numPages;i++){
          prog.set(30 + (i/pdfjsDoc.numPages)*60, `page ${i}/${pdfjsDoc.numPages}…`);
          const page = await pdfjsDoc.getPage(i);
          const viewport = page.getViewport({scale:2.2});
          const canvas = document.createElement('canvas'); canvas.width=viewport.width; canvas.height=viewport.height;
          await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
          const jpgDataUrl = canvas.toDataURL('image/jpeg',0.9);
          const jpgBytes = await (await fetch(jpgDataUrl)).arrayBuffer();
          const embedded = await outDoc.embedJpg(jpgBytes);
          const origSize = page.getViewport({scale:1});
          const outPage = outDoc.addPage([origSize.width, origSize.height]);
          outPage.drawImage(embedded, {x:0,y:0,width:origSize.width,height:origSize.height});
        }
        prog.set(95,'Preparing…');
        const bytes = await outDoc.save();
        downloadBlob(new Blob([bytes],{type:'application/pdf'}), file.name.replace(/\.pdf$/i,'')+'-repaired.pdf');
        prog.set(100,'Done'); prog.remove();
        mountResult(body, 'The file was too damaged for a lossless repair, so it was rebuilt from its pages instead — visually the same, but text is no longer selectable.').style.background='#FFF6E5';
      }catch(err){ prog.remove(); mountResult(body,'Could not repair this file — it may be too badly damaged, encrypted, or not a real PDF. Error: '+err.message).style.background='#FDEDEC'; }
    }
    paint();
  }
};

/* ===================== PDF METADATA REMOVER ===================== */
TOOL_IMPL.pdfmetaremove = {
  mount(container){
    let file = null;
    const body = el(`<div></div>`); container.appendChild(body);
    function paint(){
      body.innerHTML = '';
      mountUploader(body, { accept:'application/pdf', label:'Drop a PDF file', sublabel:'Removes Title, Author, Subject, Keywords, Creator, Producer and dates',
        onAdd: async (fl)=>{ file = fl[0]; file._buf = await readFileAsArrayBuffer(file); paint(); } });
      if(file){
        mountFileList(body, [file], ()=>{ file=null; paint(); });
        const row = el(`<div class="btn-row"></div>`);
        const btn = el(`<button class="btn">🕵️ Remove Metadata</button>`);
        btn.onclick = doRemove;
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    async function doRemove(){
      const prog = mountProgress(body);
      try{
        prog.set(20,'Reading…');
        const doc = await PDFDocument.load(file._buf, {ignoreEncryption:true});
        prog.set(50,'Stripping metadata…');
        doc.setTitle(''); doc.setAuthor(''); doc.setSubject(''); doc.setKeywords([]);
        doc.setProducer(''); doc.setCreator('');
        doc.setCreationDate(new Date(0)); doc.setModificationDate(new Date(0));
        prog.set(90,'Preparing…');
        const bytes = await doc.save();
        downloadBlob(new Blob([bytes],{type:'application/pdf'}), file.name.replace(/\.pdf$/i,'')+'-clean.pdf');
        prog.set(100,'Done'); prog.remove();
        mountResult(body, 'Metadata removed — Title, Author, Subject, Keywords, Producer, Creator and dates are all cleared.');
      }catch(err){ prog.remove(); mountResult(body,'Error: '+err.message).style.background='#FDEDEC'; }
    }
    paint();
  }
};

/* ===================== OCR PDF -> SEARCHABLE PDF ===================== */
TOOL_IMPL.pdfocrsearchable = {
  mount(container){
    let file = null;
    const body = el(`<div></div>`); container.appendChild(body);
    function paint(){
      body.innerHTML = '';
      body.appendChild(el(`<div class="note">Keeps the page looking exactly like the original scan, but adds an invisible text layer underneath so the PDF becomes searchable, and text can be selected/copied. Runs entirely in your browser (Tesseract.js) — Tamil, English and Hindi, auto-detected.</div>`));
      mountUploader(body, {
        accept:'application/pdf',
        label:'Drop a scanned PDF', sublabel:'Larger files may take a while — this runs page by page',
        onAdd: async (fl)=>{ file = fl[0]; file._buf = await readFileAsArrayBuffer(file); paint(); }
      });
      if(file){
        mountFileList(body, [file], ()=>{ file=null; paint(); });
        const row = el(`<div class="btn-row"></div>`);
        const btn = el(`<button class="btn">🔎 Make Searchable</button>`);
        btn.onclick = doProcess;
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    function preprocessForOcr(srcCanvasOrImg, w, h){
      const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(srcCanvasOrImg, 0, 0, w, h);
      const imgData = ctx.getImageData(0,0,w,h);
      const d = imgData.data;
      let min=255, max=0;
      for(let p=0;p<d.length;p+=4){
        const l = 0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2];
        d[p]=d[p+1]=d[p+2]=l;
        if(l<min) min=l; if(l>max) max=l;
      }
      const range = Math.max(1, max-min);
      for(let p=0;p<d.length;p+=4){
        const v = Math.max(0, Math.min(255, (d[p]-min)*255/range));
        d[p]=d[p+1]=d[p+2]=v;
      }
      ctx.putImageData(imgData,0,0);
      return canvas;
    }
    async function doProcess(){
      const SCALE = 2.2;
      const prog = mountProgress(body);
      try{
        prog.set(5, 'Reading PDF…');
        const pdfjsDoc = await loadPdfJs(file._buf);
        const outDoc = await PDFDocument.create();
        let font;
        try{ font = await embedUnicodeFont(outDoc); }catch(e){ font = await outDoc.embedFont(StandardFonts.Helvetica); }
        for(let i=1;i<=pdfjsDoc.numPages;i++){
          const baseProg = 5 + ((i-1)/pdfjsDoc.numPages)*90;
          prog.set(baseProg, `page ${i}/${pdfjsDoc.numPages} — rendering…`);
          const page = await pdfjsDoc.getPage(i);
          const viewport = page.getViewport({scale: SCALE});
          const canvas = document.createElement('canvas'); canvas.width=viewport.width; canvas.height=viewport.height;
          await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;

          const cleanCanvas = preprocessForOcr(canvas, canvas.width, canvas.height);
          const { data } = await Tesseract.recognize(cleanCanvas.toDataURL('image/png'), 'tam+eng+hin', {
            workerBlobURL: true,
            logger: (m)=>{
              if(m.status==='recognizing text'){
                prog.set(baseProg + (m.progress*90/pdfjsDoc.numPages), `page ${i}/${pdfjsDoc.numPages} — reading text… ${Math.round(m.progress*100)}%`);
              }
            }
          });

          const origSize = page.getViewport({scale:1});
          const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          const jpgBytes = await (await fetch(jpgDataUrl)).arrayBuffer();
          const embedded = await outDoc.embedJpg(jpgBytes);
          const outPage = outDoc.addPage([origSize.width, origSize.height]);
          outPage.drawImage(embedded, {x:0, y:0, width:origSize.width, height:origSize.height});

          const words = (data && data.words) || [];
          words.forEach(w=>{
            if(!w.text || !w.text.trim() || (w.confidence!=null && w.confidence < 35)) return;
            const bw = (w.bbox.x1 - w.bbox.x0) / SCALE;
            const bh = (w.bbox.y1 - w.bbox.y0) / SCALE;
            if(bw<=0 || bh<=0) return;
            const x = w.bbox.x0 / SCALE;
            const y = origSize.height - (w.bbox.y1 / SCALE);
            let size = Math.max(4, bh*0.85);
            try{
              const natWidth = font.widthOfTextAtSize(w.text, size);
              if(natWidth>0) size = size * Math.min(2, Math.max(0.3, bw/natWidth));
              outPage.drawText(w.text, {x, y, size, font, opacity: 0.01});
            }catch(drawErr){ /* a character this font can't encode — skip just this word */ }
          });
        }
        prog.set(97, 'Preparing…');
        const bytes = await outDoc.save();
        downloadBlob(new Blob([bytes],{type:'application/pdf'}), file.name.replace(/\.pdf$/i,'')+'-searchable.pdf');
        prog.set(100,'Done'); prog.remove();
        mountResult(body, 'Searchable PDF downloaded — looks the same as your scan, but text can now be searched, selected and copied.');
      }catch(err){ prog.remove(); mountResult(body,'Error: '+err.message).style.background='#FDEDEC'; }
    }
    paint();
  }
};

/* ===================== PDF -> POWERPOINT ===================== */
TOOL_IMPL.pdf2ppt = {
  mount(container){
    let file = null;
    const body = el(`<div></div>`); container.appendChild(body);
    async function handleFile(f){ file = f; file._buf = await readFileAsArrayBuffer(file); paint(); }
    function paint(){
      body.innerHTML = '';
      mountUploader(body, {
        accept:'application/pdf',
        label:'Drop a PDF file', sublabel:'Every page becomes one full-size slide image in a .pptx',
        onAdd: async (fl)=> handleFile(fl[0])
      });
      if(file){
        mountFileList(body, [file], ()=>{ file=null; paint(); });
        const opts = el(`
          <div class="opts one">
            <div class="field">
              <label>Quality/Resolution</label>
              <select id="pptQualSel">
                <option value="1.5">Standard (smaller file)</option>
                <option value="2" selected>Good (Recommended)</option>
                <option value="2.6">High-res (larger file)</option>
              </select>
            </div>
          </div>
        `);
        body.appendChild(opts);
        const row = el(`<div class="btn-row"></div>`);
        const btn = el(`<button class="btn">📽️ Convert to PowerPoint</button>`);
        btn.onclick = doConvert;
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    if(__pendingSmartUploadFile){
      const f = __pendingSmartUploadFile; __pendingSmartUploadFile = null;
      handleFile(f);
    } else {
      paint();
    }
    async function doConvert(){
      const scale = Number(body.querySelector('#pptQualSel').value);
      const prog = mountProgress(body);
      try{
        const pdfjsDoc = await loadPdfJs(file._buf);
        const firstPage = await pdfjsDoc.getPage(1);
        const firstViewport = firstPage.getViewport({scale:1});
        const widthIn = firstViewport.width/72, heightIn = firstViewport.height/72;
        const pptx = new PptxGenJS();
        pptx.defineLayout({ name:'PDFPAGE', width: widthIn, height: heightIn });
        pptx.layout = 'PDFPAGE';
        for(let i=1;i<=pdfjsDoc.numPages;i++){
          prog.set((i/pdfjsDoc.numPages)*85, `page ${i}/${pdfjsDoc.numPages}…`);
          const page = await pdfjsDoc.getPage(i);
          const viewport = page.getViewport({scale});
          const canvas = document.createElement('canvas'); canvas.width=viewport.width; canvas.height=viewport.height;
          await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          const slide = pptx.addSlide();
          slide.addImage({ data: dataUrl, x:0, y:0, w: widthIn, h: heightIn });
        }
        prog.set(92,'Building .pptx…');
        const blob = await pptx.write({ outputType:'blob' });
        prog.set(100,'Done'); prog.remove();
        downloadBlob(blob, file.name.replace(/\.pdf$/i,'')+'.pptx');
        mountResult(body, `${pdfjsDoc.numPages} slide${pdfjsDoc.numPages>1?'s':''} ready — PowerPoint downloaded.`);
      }catch(err){ prog.remove(); mountResult(body,'Error: '+err.message).style.background='#FDEDEC'; }
    }
    paint();
  }
};

/* ===================== POWERPOINT -> PDF ===================== */
TOOL_IMPL.ppt2pdf = {
  mount(container){
    let file = null;
    const body = el(`<div></div>`); container.appendChild(body);
    function paint(){
      body.innerHTML = '';
      body.appendChild(el(`<div class="note">Extracts each slide's text and images and lays them out on a matching PDF page. This preserves the CONTENT reliably; exact visual design (fonts, colors, animations) is simplified rather than pixel-matched.</div>`));
      mountUploader(body, {
        accept:'.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
        label:'Drop a PowerPoint (.pptx) file', sublabel:'',
        onAdd: async (fl)=>{ file = fl[0]; file._buf = await readFileAsArrayBuffer(file); paint(); }
      });
      if(file){
        mountFileList(body, [file], ()=>{ file=null; paint(); });
        const row = el(`<div class="btn-row"></div>`);
        const btn = el(`<button class="btn">📄 Convert to PDF</button>`);
        btn.onclick = doConvert;
        row.appendChild(btn);
        body.appendChild(row);
      }
    }
    const EMU_PER_PT = 12700;
    function getTag(parent, tag){ const all = parent.getElementsByTagName(tag); return all.length ? all[0] : null; }
    function getTags(parent, tag){ return Array.from(parent.getElementsByTagName(tag)); }

    async function doConvert(){
      const prog = mountProgress(body);
      try{
        prog.set(5, 'Reading .pptx…');
        const zip = await JSZip.loadAsync(file._buf);
        const parser = new DOMParser();
        async function readXml(path){
          const f = zip.file(path);
          if(!f) return null;
          const text = await f.async('string');
          return parser.parseFromString(text, 'application/xml');
        }
        const presDoc = await readXml('ppt/presentation.xml');
        const presRelsDoc = await readXml('ppt/_rels/presentation.xml.rels');
        if(!presDoc || !presRelsDoc) throw new Error('This does not look like a valid .pptx file.');

        const sldSzEl = getTag(presDoc,'p:sldSz');
        const slideCx = sldSzEl ? parseInt(sldSzEl.getAttribute('cx'),10) : 9144000;
        const slideCy = sldSzEl ? parseInt(sldSzEl.getAttribute('cy'),10) : 6858000;
        const pageW = slideCx / EMU_PER_PT, pageH = slideCy / EMU_PER_PT;

        const presRelMap = {};
        getTags(presRelsDoc,'Relationship').forEach(r=> presRelMap[r.getAttribute('Id')] = r.getAttribute('Target'));

        const sldIdLst = getTag(presDoc,'p:sldIdLst');
        const slidePaths = [];
        if(sldIdLst){
          getTags(sldIdLst,'p:sldId').forEach(sldId=>{
            const rid = sldId.getAttribute('r:id');
            const target = presRelMap[rid];
            if(target) slidePaths.push('ppt/'+target.replace(/^\.\.\//,''));
          });
        }
        if(!slidePaths.length) throw new Error('No slides found in this file.');

        const outDoc = await PDFDocument.create();
        let font, fontBold;
        try{ font = await embedUnicodeFont(outDoc); fontBold = font; }
        catch(e){ font = await outDoc.embedFont(StandardFonts.Helvetica); fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold); }

        for(let si=0; si<slidePaths.length; si++){
          prog.set(5 + (si/slidePaths.length)*85, `slide ${si+1}/${slidePaths.length}…`);
          const slidePath = slidePaths[si];
          const page = outDoc.addPage([pageW, pageH]);
          const marginX = Math.max(24, pageW*0.06);
          let y = pageH - Math.max(24, pageH*0.08);
          const maxWidth = pageW - marginX*2;
          let slideRelMap = {};

          try{
            const slideDoc = await readXml(slidePath);
            if(!slideDoc) throw new Error('slide file missing');
            const relsPath = slidePath.replace(/^(.*)\/([^/]+)$/, '$1/_rels/$2.rels');
            const slideRelsDoc = await readXml(relsPath);
            if(slideRelsDoc) getTags(slideRelsDoc,'Relationship').forEach(r=> slideRelMap[r.getAttribute('Id')] = r.getAttribute('Target'));

            const spTree = getTag(slideDoc,'p:spTree');
            const shapeNodes = spTree ? Array.from(spTree.childNodes).filter(n=>n.nodeType===1) : [];

            function drawWrapped(text, size, bold){
              const useFont = bold ? fontBold : font;
              const words = text.split(/\s+/).filter(Boolean);
              const lineHeight = size*1.3;
              let line = '';
              const flush = ()=>{
                if(!line) return;
                if(y - lineHeight < 20) return;
                try{ page.drawText(line, {x:marginX, y, size, font:useFont, color:rgb(0.08,0.08,0.08)}); }catch(e){ /* a character this font can't encode — skip this line */ }
                y -= lineHeight;
              };
              words.forEach(word=>{
                const testLine = line ? line+' '+word : word;
                let widthOk = true;
                try{ widthOk = useFont.widthOfTextAtSize(testLine, size) <= maxWidth; }catch(e){ widthOk = true; }
                if(!widthOk && line){ flush(); line = word; } else line = testLine;
              });
              flush();
            }

            for(const node of shapeNodes){
              const tag = node.tagName;
              if(tag==='p:sp'){
                const nvPr = getTag(node,'p:nvPr');
                const ph = nvPr ? getTag(nvPr,'p:ph') : null;
                const phType = ph ? ph.getAttribute('type') : null;
                const isTitle = phType==='title' || phType==='ctrTitle';
                const txBody = getTag(node,'p:txBody');
                if(!txBody) continue;
                const paras = getTags(txBody,'a:p');
                let maxSz = 0, anyBold = false;
                const paraTexts = [];
                paras.forEach(p=>{
                  const runs = getTags(p,'a:r');
                  let paraText = '';
                  runs.forEach(r=>{
                    const t = getTag(r,'a:t');
                    paraText += t ? t.textContent : '';
                    const rPr = getTag(r,'a:rPr');
                    if(rPr){
                      if(rPr.getAttribute('b')==='1') anyBold = true;
                      const sz = parseInt(rPr.getAttribute('sz')||'0',10);
                      if(sz>maxSz) maxSz = sz;
                    }
                  });
                  paraTexts.push(paraText);
                });
                const fullText = paraTexts.join('\n');
                if(!fullText.trim()) continue;
                const size = isTitle ? 22 : (maxSz ? Math.min(28, Math.max(10, maxSz/100)) : 14);
                const bold = isTitle || anyBold;
                y -= size*0.3;
                paraTexts.forEach(pt=>{
                  if(!pt.trim()){ y -= size*0.5; return; }
                  drawWrapped((isTitle?'':'• ')+pt.trim(), size, bold);
                });
                y -= size*0.4;
              } else if(tag==='p:pic'){
                try{
                  const blip = getTag(node,'a:blip');
                  const embed = blip ? blip.getAttribute('r:embed') : null;
                  const target = embed ? slideRelMap[embed] : null;
                  if(!target) continue;
                  const mediaPath = 'ppt/'+target.replace(/^\.\.\//,'');
                  const mediaFile = zip.file(mediaPath);
                  if(!mediaFile) continue;
                  const bytes = await mediaFile.async('uint8array');
                  const ext = mediaPath.split('.').pop().toLowerCase();
                  let embedded;
                  if(ext==='png') embedded = await outDoc.embedPng(bytes);
                  else if(ext==='jpg'||ext==='jpeg') embedded = await outDoc.embedJpg(bytes);
                  else continue;
                  const xfrm = getTag(node,'a:xfrm');
                  let ix = marginX, iy = Math.max(20,y-150), iw = 200, ih = 150;
                  if(xfrm){
                    const off = getTag(xfrm,'a:off'), extEl = getTag(xfrm,'a:ext');
                    if(off && extEl){
                      const ox = parseInt(off.getAttribute('x'),10)/EMU_PER_PT;
                      const oy = parseInt(off.getAttribute('y'),10)/EMU_PER_PT;
                      iw = parseInt(extEl.getAttribute('cx'),10)/EMU_PER_PT;
                      ih = parseInt(extEl.getAttribute('cy'),10)/EMU_PER_PT;
                      ix = ox; iy = pageH - oy - ih;
                    }
                  }
                  page.drawImage(embedded, {x:ix, y:iy, width:iw, height:ih});
                }catch(imgErr){ /* one image failed — keep the rest of the slide */ }
              }
            }
          }catch(slideErr){
            page.drawText(`Could not fully read slide ${si+1} (${slideErr.message})`, {x:24, y:pageH-40, size:11, font, color:rgb(0.7,0,0)});
          }
        }
        prog.set(95,'Preparing…');
        const bytes = await outDoc.save();
        downloadBlob(new Blob([bytes],{type:'application/pdf'}), file.name.replace(/\.pptx$/i,'')+'.pdf');
        prog.set(100,'Done'); prog.remove();
        mountResult(body, `${slidePaths.length} slide${slidePaths.length>1?'s':''} converted — PDF downloaded.`);
      }catch(err){ prog.remove(); mountResult(body,'Error: '+err.message).style.background='#FDEDEC'; }
    }
    paint();
  }
};

/* ===================== WORD -> PDF ===================== */'''

edits.append((
"/* ===================== WORD -> PDF ===================== */",
NEW_TOOLS_JS
))

applied, skipped, missing = 0, 0, 0
for old, new in edits:
    if new in c:
        skipped += 1
    elif old in c:
        c = c.replace(old, new, 1)
        applied += 1
    else:
        print("WARNING: pattern not found, check manually:\n", old[:100])
        missing += 1

with open('index.source.html', 'w', encoding='utf-8') as f:
    f.write(c)

print(f"Applied {applied}, already-present {skipped}, missing {missing}")
if missing:
    sys.exit(1)
