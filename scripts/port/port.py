"""Port files from the single-tenant original into Kosh: import paths, theme classes, tenancy idioms.
usage: python3 port.py <src-relative-path-in-original> [...]   (paths under src/, files or directories)"""
import os, re, sys, shutil
O = "/home/user/HRMS-Payroll-System/src"
N = "/home/user/HRMS-Demo/src"
IMPORTS = {
    '"@/lib/audit"': '"@/core/audit"', '"@/lib/auth/session"': '"@/core/auth/session"', '"@/lib/outbox"': '"@/core/outbox"',
    '"@/lib/auth/access"': '"@/core/auth/access"', '"@/lib/auth/roles"': '"@/core/auth/roles"', '"@/lib/auth/menu"': '"@/core/auth/menu"',
    '"@/lib/errors"': '"@/core/errors"', '"@/lib/approvals/details"': '"@/core/approvals/details"',
    '"@/lib/approvals/engine"': '"@/core/approvals/engine"', '"@/lib/approvals/registry"': '"@/core/approvals/registry"',
    '"@/lib/approvals/areas"': '"@/core/approvals/areas"', '"@/lib/approvals"': '"@/core/approvals"',
    '"@/lib/crypto"': '"@/core/crypto"', '"@/lib/dates"': '"@/core/dates"', '"@/lib/money"': '"@/core/money"',
    '"@/lib/validators"': '"@/core/validators"', '"@/lib/storage"': '"@/core/storage"', '"@/lib/i18n"': '"@/i18n"',
    '"@/lib/i18n/types"': '"@/core/i18n/types"', '"@/lib/i18n/en"': '"@/i18n/en"', '"@/lib/i18n/server"': '"@/core/i18n/server"',
    '"@/lib/i18n/client"': '"@/core/i18n/client"', '"@/lib/http"': '"@/lib/api-client"', '"@/lib/api/route"': '"@/core/api/route"',
    '"@/lib/api/files"': '"@/core/api/files"', '"@/lib/request-meta"': '"@/core/request-meta"', '"@/lib/sequence"': '"@/core/sequence"',
    '"@/modules/settings/service"': '"@/modules/settings/store"', '"@/lib/csv"': '"@/core/csv"', '"@/lib/pdf"': '"@/core/pdf"',
    '"@/lib/rate-limit"': '"@/core/rate-limit"', '"@/lib/env"': '"@/core/env"', '"@/lib/connectors/sms"': '"@/core/connectors/messages"',
}
CLASSES = [
    (r'text-ink-(950|900)\b', 'text-ink'), (r'text-ink-(800|700)\b', 'text-ink-2'), (r'text-ink-(600|500)\b', 'text-muted'),
    (r'text-ink-(400|300)\b', 'text-faint'), (r'\bbg-white\b', 'bg-surface'), (r'bg-ink-50(/\d+)?\b', 'bg-surface-2'),
    (r'bg-ink-100(/\d+)?\b', 'bg-sunken'), (r'bg-ink-200(/\d+)?\b', 'bg-line'), (r'border-ink-(100|200)(/\d+)?\b', 'border-line'),
    (r'border-ink-(300|400)(/\d+)?\b', 'border-line-strong'), (r'ring-ink-\d{2,3}(/\d+)?\b', 'ring-line'), (r'divide-ink-\d{2,3}(/\d+)?\b', 'divide-line'),
    (r'\bshadow-sm shadow-brand-900/20\b', 'shadow-card'), (r'outline-brand-600', 'outline-brand-500'),
]
def port_text(s):
    for a, b in IMPORTS.items(): s = s.replace(a, b)
    s = re.sub(r'import \{ db, type (Tx|DbLike) \} from "@/lib/db";', r'import type { DbLike, Tx } from "@/core/tenancy/scoped";', s)
    s = re.sub(r'import \{ db \} from "@/lib/db";\n', '', s)
    s = re.sub(r'import type \{ (Tx|DbLike|Tx, DbLike|DbLike, Tx) \} from "@/lib/db";', r'import type { DbLike, Tx } from "@/core/tenancy/scoped";', s)
    s = s.replace('boardId: actor.boardId, ', '').replace(', boardId: actor.boardId', '').replace('{ boardId: actor.boardId }', '{}')
    s = re.sub(r'(?<![.\w])db\.', 'actor.db.', s)
    s = re.sub(r'\bseal\((?!actor\.tenantId)', 'seal(actor.tenantId, ', s)
    s = re.sub(r'\bdecrypt\((?!actor\.tenantId)', 'decrypt(actor.tenantId, ', s)
    s = re.sub(r'\bblindIndex\((?!actor\.tenantId|tenantId)', 'blindIndex(actor.tenantId, ', s)
    s = s.replace('href="/home"', 'href="/"').replace('redirect("/home")', 'redirect("/")')
    for a, b in CLASSES: s = re.sub(a, b, s)
    # Hindi names are optional in Kosh: fall back to the English name.
    s = re.sub(r'locale === "hi" \? ([\w.?\[\]]+?)\.nameHi : \1\.name\b', lambda m: f'(locale === "hi" && {m.group(1)}.nameHi) || {m.group(1)}.name', s)
    s = s.replace("Board's", "organisation's").replace("FoxPro", "the old system")
    # requireActor lives in the guard module in Kosh.
    def fix_req(m):
        rest = [x.strip() for x in m.group(1).split(',') if x.strip() and x.strip() != 'requireActor']
        out = ('import { ' + ', '.join(rest) + ' } from "@/core/auth/session";\n') if rest else ''
        return out + 'import { requireActor } from "@/core/auth/guard";'
    s = re.sub(r'import \{ ([^}]*\brequireActor\b[^}]*)\} from "@/core/auth/session";', fix_req, s)
    return s
def port(rel):
    src = os.path.join(O, rel); dst = os.path.join(N, rel)
    if os.path.isdir(src):
        for root, _, files in os.walk(src):
            for f in files: port(os.path.relpath(os.path.join(root, f), O))
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if src.endswith((".ts", ".tsx")):
        open(dst, "w").write(port_text(open(src).read()))
    else:
        shutil.copy(src, dst)
    print("ported", rel)
if __name__ == "__main__":
    for r in sys.argv[1:]: port(r)
