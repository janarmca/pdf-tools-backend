# Independent check of tick copies with pyHanko (signature integrity), pypdf (structure) and poppler (render).
# Run in a folder that has root.pem (from gen-certs.sh):  python3 validate-stamped.py <stamped1.pdf> [<stamped2.pdf> ...]
import sys, glob, subprocess, pypdf
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext
from pyhanko.keys import load_cert_from_pemder
vc = ValidationContext(trust_roots=[load_cert_from_pemder('root.pem')], allow_fetching=False)
bad = 0
for f in sys.argv[1:]:
    r = PdfFileReader(open(f,'rb')); res = []
    for s in r.embedded_signatures:
        st = validate_pdf_signature(s, vc)
        try: ml = str(st.modification_level).split('.')[-1]
        except Exception: ml = 'SUSPICIOUS'
        res.append((st.intact, st.valid, ml))
    pr = pypdf.PdfReader(f); n = len(pr.pages[0].get('/Annots') or [])
    out = f.replace('.pdf','')
    rc = subprocess.run(['pdftoppm','-r','50','-png','-f','1','-l','1',f,out], capture_output=True, text=True).returncode
    ok = bool(res) and all(x[0] and x[1] for x in res) and rc == 0 and n >= 2
    bad += (not ok)
    print(('OK  ' if ok else 'BAD ') + f.split('/')[-1][:48].ljust(48), 'pyHanko(intact,valid,changes)=', res, 'annots', n, 'poppler', rc)
print('ALL DOWNLOADED COPIES VALIDATE' if not bad else 'PROBLEMS: %d' % bad)
