set -e
# CA hierarchy: root (CCA India 2022 test) -> intermediate -> signer
openssl req -x509 -newkey rsa:2048 -nodes -keyout root.key -out root.pem -days 3650 -subj "/C=IN/O=India PKI/CN=CCA India 2022 TEST" -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -keyout int.key -out int.csr -subj "/C=IN/O=Test Sub CA/CN=(n)Code Solutions TEST CA 2022" 2>/dev/null
printf "basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n" > int.ext
openssl x509 -req -in int.csr -CA root.pem -CAkey root.key -CAcreateserial -out int.pem -days 1800 -extfile int.ext 2>/dev/null
openssl req -newkey rsa:2048 -nodes -keyout user.key -out user.csr -subj "/C=IN/ST=Tamil Nadu/O=Personal/CN=JANARTHANAN TEST/serialNumber=abc123" 2>/dev/null
printf "keyUsage=critical,digitalSignature,nonRepudiation\ncrlDistributionPoints=URI:http://crl.example.in/test.crl\nauthorityInfoAccess=OCSP;URI:http://ocsp.example.in\n" > user.ext
openssl x509 -req -in user.csr -CA int.pem -CAkey int.key -CAcreateserial -out user.pem -days 700 -extfile user.ext 2>/dev/null
cat int.pem root.pem > chain.pem
# expired signer
openssl req -newkey rsa:2048 -nodes -keyout old.key -out old.csr -subj "/C=IN/O=Personal/CN=EXPIRED TEST" 2>/dev/null
openssl x509 -req -in old.csr -CA int.pem -CAkey int.key -CAcreateserial -out old.pem -days 1 -extfile user.ext 2>/dev/null
# ECDSA signer
openssl ecparam -name prime256v1 -genkey -noout -out ec.key
openssl req -new -key ec.key -out ec.csr -subj "/C=IN/O=EC Personal/CN=EC TEST" 2>/dev/null
openssl x509 -req -in ec.csr -CA int.pem -CAkey int.key -CAcreateserial -out ec.pem -days 700 -extfile user.ext 2>/dev/null
echo certs ok

python3 - <<'PY'
import datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
ik=serialization.load_pem_private_key(open('int.key','rb').read(),None); ic=x509.load_pem_x509_certificate(open('int.pem','rb').read())
k=rsa.generate_private_key(65537,2048)
n=x509.Name([x509.NameAttribute(NameOID.COUNTRY_NAME,'IN'),x509.NameAttribute(NameOID.COMMON_NAME,'EXPIRED REAL TEST')])
c=(x509.CertificateBuilder().subject_name(n).issuer_name(ic.subject).public_key(k.public_key()).serial_number(777).not_valid_before(datetime.datetime(2020,1,1)).not_valid_after(datetime.datetime(2021,1,1)).sign(ik,hashes.SHA256()))
open('exp.pem','wb').write(c.public_bytes(serialization.Encoding.PEM))
open('exp.key','wb').write(k.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
PY
# time-stamp authority certificate (for the pyHanko document-timestamp test)
openssl req -newkey rsa:2048 -nodes -keyout tsa.key -out tsa.csr -subj "/C=IN/O=Test TSA/CN=TEST TSA" 2>/dev/null
printf "keyUsage=critical,digitalSignature\nextendedKeyUsage=critical,timeStamping\n" > tsa.ext
openssl x509 -req -in tsa.csr -CA int.pem -CAkey int.key -CAcreateserial -out tsa.pem -days 700 -extfile tsa.ext 2>/dev/null
