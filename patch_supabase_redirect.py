import sys

with open('index.source.html', encoding='utf-8') as f:
    ih = f.read()

old = '<script src="https://unpkg.com/@supabase/supabase-js@2"></script>'
new = '<script src="https://unpkg.com/@supabase/supabase-js@2.117.2/dist/umd/supabase.js"></script>'

applied, skipped, missing = 0, 0, 0
if old in ih:
    ih = ih.replace(old, new, 1)
    applied += 1
elif new in ih:
    skipped += 1
else:
    print("WARNING: pattern not found, check manually")
    missing += 1

with open('index.source.html', 'w', encoding='utf-8') as f:
    f.write(ih)

print(f"Applied {applied}, already-present {skipped}, missing {missing}")
if missing:
    sys.exit(1)
