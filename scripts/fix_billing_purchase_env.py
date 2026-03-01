import sys

# Fix billingController.ts
with open('src/p.billing/billingController.ts') as f:
    content = f.read()

# Add BACKEND_URL and UPLOAD_BASE_PATH imports
old_import = "import { getErrorMessage, isMysqlError } from '../utils/errorUtils';"
new_import = ("import { getErrorMessage, isMysqlError } from '../utils/errorUtils';\n"
              "import { BACKEND_URL, UPLOAD_BASE_PATH } from '../utils/env';")
content = content.replace(old_import, new_import, 1)

content = content.replace("process.env.BACKEND_URL", "BACKEND_URL")
# UPLOAD_BASE_PATH in billing
content = content.replace("process.env.UPLOAD_BASE_PATH", "UPLOAD_BASE_PATH")

with open('src/p.billing/billingController.ts', 'w') as f:
    f.write(content)

remaining = content.count('process.env.')
print(f'billing done — remaining process.env: {remaining}')
if remaining > 0:
    for i, line in enumerate(content.splitlines(), 1):
        if 'process.env.' in line:
            print(f'  L{i}: {line.strip()[:100]}')

# Fix purchaseController.ts
with open('src/p.purchase/purchaseController.ts') as f:
    content = f.read()

# Add UPLOAD_BASE_PATH import
old_import = "import { getErrorMessage } from '../utils/errorUtils';"
new_import = ("import { getErrorMessage } from '../utils/errorUtils';\n"
              "import { UPLOAD_BASE_PATH } from '../utils/env';")
if old_import in content:
    content = content.replace(old_import, new_import, 1)
else:
    # Find first import line and insert after
    lines = content.splitlines()
    for i, l in enumerate(lines):
        if l.startswith('import '):
            lines.insert(i, "import { UPLOAD_BASE_PATH } from '../utils/env';")
            break
    content = '\n'.join(lines) + '\n'

content = content.replace("process.env.UPLOAD_BASE_PATH", "UPLOAD_BASE_PATH")

with open('src/p.purchase/purchaseController.ts', 'w') as f:
    f.write(content)

remaining = content.count('process.env.')
print(f'purchase done — remaining process.env: {remaining}')
if remaining > 0:
    for i, line in enumerate(content.splitlines(), 1):
        if 'process.env.' in line:
            print(f'  L{i}: {line.strip()[:100]}')
