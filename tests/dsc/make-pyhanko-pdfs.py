# Signs PDFs with pyHanko (an independent implementation) so the verifier is not only tested against our own openssl-built files.
import pypdf
from pyhanko.sign import signers, fields, timestamps
from pyhanko.sign.fields import SigFieldSpec
from pyhanko.sign.signers import PdfTimeStamper
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.keys import load_cert_from_pemder, load_private_key_from_pemder
w0 = pypdf.PdfWriter(); w0.add_blank_page(300, 200); w0.write('ph_base.pdf')
def sg(cert, key, pss=False):
    return signers.SimpleSigner.load(key, cert, ca_chain_files=('chain.pem',), prefer_pss=pss)
def sign(src, out, signer, field, md='sha256', sub=fields.SigSeedSubFilter.ADOBE_PKCS7_DETACHED, reason='ph test'):
    w = IncrementalPdfFileWriter(open(src, 'rb'))
    fields.append_signature_field(w, SigFieldSpec(sig_field_name=field))
    meta = signers.PdfSignatureMetadata(field_name=field, md_algorithm=md, subfilter=sub, reason=reason, location='Chennai')
    with open(out, 'wb') as f: signers.sign_pdf(w, meta, signer=signer, output=f)
u = sg('user.pem', 'user.key')
sign('ph_base.pdf', 'ph_pades.pdf', u, 'Sig1', sub=fields.SigSeedSubFilter.PADES)
sign('ph_base.pdf', 'ph_sha512.pdf', u, 'Sig1', md='sha512')
sign('ph_base.pdf', 'ph_sha384.pdf', u, 'Sig1', md='sha384')
sign('ph_base.pdf', 'ph_pss.pdf', sg('user.pem', 'user.key', pss=True), 'Sig1')
sign('ph_sha512.pdf', 'ph_two.pdf', sg('ec.pem', 'ec.key'), 'Sig2', reason='second')
cert = load_cert_from_pemder('tsa.pem'); key = load_private_key_from_pemder('tsa.key', passphrase=None); ca = load_cert_from_pemder('int.pem')
ts = timestamps.DummyTimeStamper(tsa_cert=cert, tsa_key=key, certs_to_embed=[cert, ca], override_md='sha256')
with open('ph_docts.pdf', 'wb') as f: PdfTimeStamper(ts).timestamp_pdf(IncrementalPdfFileWriter(open('ph_sha512.pdf', 'rb')), 'sha256', None, output=f)
b = bytearray(open('ph_docts.pdf', 'rb').read())
k = bytes(b).index(b'%PDF-1.') + 7           # flip the PDF version digit: a byte inside the signed range
b[k] = ord('9') if b[k] != ord('9') else ord('8')
open('ph_docts_tampered.pdf', 'wb').write(bytes(b))
print('pyhanko pdfs ok')
