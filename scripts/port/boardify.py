"""Second pass for ported services: the original's `fn(boardId, …, tx = db)` helpers become `fn(db, …)` over the
organisation's client; boardId filters go (RLS + the scoped client do it); compound unique keys get the tenant.
usage: boardify.py file [file ...]"""
import re, sys
def fix(s):
    # Signatures: boardId parameter → the client; the trailing optional client parameter goes.
    s = re.sub(r'\((\s*)boardId: string,', r'(\1tx: DbLike,', s)
    s = re.sub(r'\(boardId: string\)', '(tx: DbLike)', s)
    s = re.sub(r',\s*tx\??: DbLike(?: = db)?\)', ')', s)
    s = re.sub(r',\s*db_?\??: (?:Tx \| typeof db|DbLike)(?: = db)?\)', ')', s)
    s = s.replace('(tx ?? db)', 'tx').replace('(tx ?? actor.db)', 'tx')
    # Helpers that took the client and then boardId: drop boardId.
    s = re.sub(r'\((tx|db): (Tx|DbLike), boardId: string, ', r'(\1: \2, ', s)
    s = re.sub(r'\((tx|db), (?:actor|r|e|input|task|payload|p|a|row)\.boardId, ', r'(\1, ', s)
    s = re.sub(r'\((tx|db), boardId, ', r'(\1, ', s)
    # boardId later in the list → the client.
    s = re.sub(r', boardId: string\)', ', db: DbLike)', s)
    s = re.sub(r', boardId: string, ', ', db: DbLike, ', s)
    s = re.sub(r', actor\.boardId\)', ', actor.db)', s)
    s = re.sub(r', actor\.boardId, ', ', actor.db, ', s)
    s = s.replace('tenantId: TENANT', 'tenantId: actor.tenantId')
    # Calls with a trailing tx: fn(x.boardId, a, b, tx) → fn(tx, a, b)
    for _ in range(3):
        s = re.sub(r'(\w+)\((?:actor|r|e|input|task|payload|p|a)\.boardId, ((?:[^()]|\([^()]*\))*?), (tx|db)\)', r'\1(\3, \2)', s)
    s = re.sub(r'(\w+)\((?:actor|input)\.boardId(\s*[,)])', r'\1(actor.db\2', s)
    s = re.sub(r'(\w+)\((?:r|e|task|payload|p|a|row)\.boardId(\s*[,)])', r'\1(tx\2', s)
    s = re.sub(r'(\w+)\(boardId(\s*[,)])', r'\1(tx\2', s)
    # getSetting(db, key, tx) → getSetting(tx, key)
    s = re.sub(r'getSetting\((\w+(?:\.\w+)?), ("\w+"), (tx|db)\)', r'getSetting(\3, \2)', s)
    # emit(tx, x.boardId, …) → emit(tx, …)
    s = re.sub(r'emit\((\w+), (?:\w+\.)?boardId, ', r'emit(\1, ', s)
    # filters and data
    s = re.sub(r'where: \{ boardId(?:: [\w.]+)?, ', 'where: { ', s)
    s = re.sub(r'where: \{ boardId(?:: [\w.]+)? \}', 'where: {}', s)
    s = re.sub(r'\{ boardId(?:: [\w.]+)?, ', '{ ', s)
    s = re.sub(r'\n(\s*)boardId(?:: [\w.]+)?,\n', '\n', s)
    s = re.sub(r', boardId(?:: [\w.]+)?(?= [},])', '', s)
    # compound unique lookups: findUnique by boardId_… → findFirst by the same fields
    s = re.sub(r'findUnique\(\{ where: \{ boardId_\w+: \{ ([^{}]*) \} \}', r'findFirst({ where: { \1 }', s)
    s = re.sub(r'findUniqueOrThrow\(\{ where: \{ boardId_\w+: \{ ([^{}]*) \} \}', r'findFirstOrThrow({ where: { \1 }', s)
    s = re.sub(r'boardId_(\w+): \{ ', r'tenantId_\1: { tenantId: actor.tenantId, ', s)
    s = s.replace('import { db, type DbLike, type Tx } from "@/lib/db";', 'import type { DbLike, Tx } from "@/core/tenancy/scoped";')
    s = s.replace('import { db, type DbLike } from "@/lib/db";', 'import type { DbLike } from "@/core/tenancy/scoped";')
    return s
for f in sys.argv[1:]:
    s = open(f).read(); n = fix(s)
    if n != s: open(f, "w").write(n); print("boardified", f)
