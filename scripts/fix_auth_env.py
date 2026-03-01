import sys

with open('src/p.auth/adms/authController.ts') as f:
    content = f.read()

# Remove dotenv import and config
content = content.replace("import dotenv from 'dotenv';\n", '')
content = content.replace("dotenv.config();\n", '')

# Add env.ts import after getErrorMessage import
old_import = "import { getErrorMessage } from '../../utils/errorUtils';"
new_import = ("import { getErrorMessage } from '../../utils/errorUtils';\n"
              "import { EMAIL_FROM, JWT_SECRET, SINGLE_SESSION_ENFORCEMENT, VERIFY_EXCLUDE_CONTACTS, VERIFY_EXCLUDE_EMAILS, VERIFY_EXCLUDE_NAMES } from '../../utils/env';")
content = content.replace(old_import, new_import, 1)

# Replace all process.env usages
content = content.replace("process.env.EMAIL_FROM", "EMAIL_FROM")
content = content.replace("process.env.JWT_SECRET", "JWT_SECRET")
content = content.replace("process.env.SINGLE_SESSION_ENFORCEMENT === 'true'", "SINGLE_SESSION_ENFORCEMENT")
content = content.replace("process.env.SINGLE_SESSION_ENFORCEMENT == 'true'", "SINGLE_SESSION_ENFORCEMENT")
content = content.replace("process.env.VERIFY_EXCLUDE_EMAILS", "VERIFY_EXCLUDE_EMAILS")
content = content.replace("process.env.VERIFY_EXCLUDE_CONTACTS", "VERIFY_EXCLUDE_CONTACTS")
content = content.replace("process.env.VERIFY_EXCLUDE_NAMES", "VERIFY_EXCLUDE_NAMES")

with open('src/p.auth/adms/authController.ts', 'w') as f:
    f.write(content)

remaining = content.count('process.env.')
print(f'done — remaining process.env: {remaining}')
if remaining > 0:
    for i, line in enumerate(content.splitlines(), 1):
        if 'process.env.' in line:
            print(f'  L{i}: {line.strip()[:100]}')
