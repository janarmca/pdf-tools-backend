import subprocess

with open('index.source.html', encoding='utf-8') as f:
    src = f.read()

# The file has multiple inline <script> blocks (a diagnostic error-catcher,
# a pdf.js worker-path setup, then the real app code). The app code is
# always the LAST inline <script>...</script> block, immediately before
# </body> — so find that one specifically rather than the first.
start_tag = '<script>'
idx = src.rfind(start_tag)
if idx == -1:
    raise SystemExit("Could not find any <script> tag in index.source.html")
start = idx + len(start_tag)
end = src.find('</script>', start)
if end == -1:
    raise SystemExit("Could not find closing </script> after the last <script> tag")
script_body = src[start:end]

with open('/tmp/_body.js', 'w', encoding='utf-8') as f:
    f.write(script_body)

result = subprocess.run(
    ['npx', '--yes', 'terser', '/tmp/_body.js', '--compress', '--mangle'],
    capture_output=True, text=True
)
if result.returncode != 0:
    print(result.stderr)
    raise SystemExit("terser failed")

minified = result.stdout

# Rebuild index.html FRESH from index.source.html every time (rather than
# patching the previous index.html) — this guarantees the <head>, script
# tags, and everything else outside the main script always stay byte-for-byte
# in sync with the source.
new_html = src[:start] + minified + src[end:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Re-minified index.html successfully (rebuilt fresh from index.source.html).")
