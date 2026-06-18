import os

path = r'f:\moalab\survey\assets\js\app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '<div class="h-64 relative" id="ri-pay-dist${suffix}"></div>'
replacement = '<div class="h-64 relative"><canvas id="ri-pay-dist${suffix}"></canvas></div>'

if target in content:
    new_content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success: Tag replaced.")
else:
    print("Error: Target string not found.")
    # Show a snippet to debug
    idx = content.find('ri-pay-dist')
    if idx != -1:
        print(f"DEBUG: Found 'ri-pay-dist' at index {idx}. Snippet: {content[idx-50:idx+50]}")
    else:
        print("DEBUG: 'ri-pay-dist' not found at all!")
