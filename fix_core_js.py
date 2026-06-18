
import re
with open('assets/js/_archive/08_helpData.js', 'r', encoding='utf-8') as f:
    archive_data = f.read()
    
# Extract App.helpData from archive
match_archive = re.search(r'App\.helpData = \{.*?\n\};', archive_data, re.DOTALL)
if not match_archive:
    print('Could not find App.helpData in archive')
    exit(1)
help_data_clean = match_archive.group(0)

with open('assets/js/core.js', 'r', encoding='utf-8') as f:
    core_data = f.read()

# Replace in core.js
match_core = re.search(r'App\.helpData = \{.*?\n\};', core_data, re.DOTALL)
if not match_core:
    print('Could not find App.helpData in core.js')
    exit(1)

new_core_data = core_data.replace(match_core.group(0), help_data_clean)

with open('assets/js/core.js', 'w', encoding='utf-8') as f:
    f.write(new_core_data)
print('Replaced App.helpData successfully.')

