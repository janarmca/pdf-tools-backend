import re, subprocess, tempfile, os

with open('index.source.html', encoding='utf-8') as f:
    html = f.read()

def minify_script(m):
    code = m.group(1)
    if not code.strip():
        return m.group(0)
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tf:
        tf.write(code)
        tmp_path = tf.name
    try:
        result = subprocess.run(
            ['npx', '--yes', 'terser', tmp_path, '--compress', '--mangle'],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        minified = result.stdout
    finally:
        os.unlink(tmp_path)
    return m.group(0).replace(code, minified)

pattern = re.compile(r'(?<=<script>)(.*?)(?=</script>)', re.S)
out = pattern.sub(minify_script, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(out)

print("Re-minified index.html successfully (rebuilt fresh from index.source.html).")
