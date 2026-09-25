import sys

with open('index.source.html', encoding='utf-8') as f:
    c = f.read()

old = "TOOL_IMPL.resumebuilder = { mount(container){ mountEmbeddedTool(container, 'Resume_build.html', 'Resume Builder', true); } };"
new = "TOOL_IMPL.resumebuilder = { mount(container){ mountEmbeddedTool(container, 'Resume_build.html?v=2', 'Resume Builder', true); } };"

if new in c:
    print("Already present, skipped")
elif old in c:
    c = c.replace(old, new, 1)
    with open('index.source.html', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Applied 1")
else:
    print("WARNING: pattern not found, check manually")
    sys.exit(1)
