import subprocess, sys, re
def base_pdf(extra=b''):
    return None
def make(out, signer, key, md='sha256', noattr=False, certfile='chain.pem', tamper=False, append=False, reason='Testing', name='JANARTHANAN TEST'):
    SZ=12000
    objs=[]
    objs.append(b"<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [5 0 R] /SigFlags 3 >> >>")
    objs.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objs.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Annots [5 0 R] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>")
    st=b"BT /F1 18 Tf 20 100 Td (Signed test document) Tj ET"
    objs.append(b"<< /Length %d >>\nstream\n"%len(st)+st+b"\nendstream")
    objs.append(b"<< /Type /Annot /Subtype /Widget /FT /Sig /Rect [0 0 0 0] /T (Signature1) /P 3 0 R /V 6 0 R /F 132 >>")
    sig=(b"<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [0 0000000000 0000000000 0000000000] /Contents <"+b"0"*SZ+b"> /Name ("+name.encode()+b") /Reason ("+reason.encode()+b") /Location (Nagercoil) /M (D:20261014100000+05'30') >>")
    objs.append(sig)
    pdf=b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"; offs=[]
    for i,o in enumerate(objs):
        offs.append(len(pdf)); pdf+=b"%d 0 obj\n"%(i+1)+o+b"\nendobj\n"
    xr=len(pdf)
    pdf+=b"xref\n0 %d\n0000000000 65535 f \n"%(len(objs)+1)+b"".join(b"%010d 00000 n \n"%o for o in offs)
    pdf+=b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n"%(len(objs)+1,xr)
    ci=pdf.index(b"/Contents <")+len(b"/Contents <")
    c0=ci-1; c1=ci+SZ+1
    br=b"/ByteRange [0 %010d %010d %010d]"%(c0,c1,len(pdf)-c1)
    pdf=pdf.replace(b"/ByteRange [0 0000000000 0000000000 0000000000]",br)
    data=pdf[:c0]+pdf[c1:]
    open('data.bin','wb').write(data)
    cmd=['openssl','cms','-sign','-binary','-in','data.bin','-signer',signer,'-inkey',key,'-outform','DER','-md',md]
    if certfile: cmd.extend(['-certfile',certfile])
    if noattr: cmd.append('-noattr')
    sigder=subprocess.check_output(cmd)
    h=sigder.hex().encode()
    assert len(h)<=SZ, len(h)
    pdf=pdf[:ci]+h+b"0"*(SZ-len(h))+pdf[ci+SZ:]
    if tamper:
        pdf=pdf.replace(b"Signed test document",b"Signed test documenT")
    if append:
        pdf+=b"\n% appended after signing\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    open(out,'wb').write(pdf)
make('t_ok.pdf','user.pem','user.key')
make('t_tampered.pdf','user.pem','user.key',tamper=True)
make('t_appended.pdf','user.pem','user.key',append=True)
make('t_sha1.pdf','user.pem','user.key',md='sha1')
make('t_noattr.pdf','user.pem','user.key',noattr=True)
make('t_expired.pdf','old.pem','old.key')
make('t_ec.pdf','ec.pem','ec.key')
make('t_nochain.pdf','user.pem','user.key',certfile=None)
open('t_unsigned.pdf','wb').write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n")
print('pdfs ok')
make('t_expired2.pdf','exp.pem','exp.key')
