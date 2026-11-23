"""Port enums and models from the original schema into Kosh's: boardId → tenantId (RLS default), a tenantId on
child tables, unique keys and indexes rescoped to the tenant, and real relations for employeeId / sectionId / postId
(so kosh_tenant_fks can guard them). usage: port_schema.py Name [Name ...]"""
import re, sys
O = "/home/user/HRMS-Payroll-System/prisma/schema.prisma"
N = "/home/user/HRMS-Demo/prisma/schema.prisma"
TENANT = 'tenantId String @default(dbgenerated("current_setting(\'app.tenant_id\'::text, true)"))'
REF = {"employeeId": "Employee", "sectionId": "Section", "postId": "Post"}
src = open(O).read(); dst = open(N).read()

def block(name):
    m = re.search(r'(?:^///[^\n]*\n)*^(model|enum) ' + name + r' \{.*?^\}', src, re.S | re.M)
    if not m: raise SystemExit("not found: " + name)
    return m.group(0), m.group(1)

backrefs = {}
out = []
for name in sys.argv[1:]:
    if re.search(r'^(model|enum) ' + name + r' \{', dst, re.M): print("skip (exists)", name); continue
    text, kind = block(name)
    if kind == "enum": out.append(text); continue
    lines = text.split("\n")
    body = []
    has_tenant = False
    fields = {}
    for ln in lines:
        m = re.match(r'^(\s+)boardId(\s+)String\b.*$', ln)
        if m:
            body.append(f"{m.group(1)}{TENANT}"); has_tenant = True; continue
        ln = ln.replace("[boardId", "[tenantId").replace("boardId_", "tenantId_")
        f = re.match(r'^\s+(\w+)\s+(\w+)(\??)', ln)
        if f: fields[f.group(1)] = (f.group(2), f.group(3))
        # drop relations to models Kosh does not have (the Board, the old migration console)
        if re.match(r'^\s+\w+\s+(Board|RecordVerification|MigrationFile|MigrationRow|ParallelRun|ParallelDiff)\b', ln): continue
        body.append(ln)
    if not has_tenant:
        at = next(i for i, l in enumerate(body) if l.startswith("model ")) + 2  # after "model X {" and its id line
        body.insert(at, "  " + TENANT)
    # relations for bare reference columns
    rel_lines = []
    for col, target in REF.items():
        if col in fields and fields[col][0] == "String":
            relname = col[:-2]
            if relname in fields: continue  # relation already declared
            opt = fields[col][1]
            rel_lines.append(f"  {relname} {target}{opt} @relation(fields: [{col}], references: [id]{', onDelete: Cascade' if target == 'Employee' and not opt else ''})")
            backrefs.setdefault(target, []).append(name)
    if rel_lines:
        # insert before the first @@ line or the closing brace
        idx = next((i for i, l in enumerate(body) if l.strip().startswith("@@")), len(body) - 1)
        body[idx:idx] = ([""] if body[idx - 1].strip() else []) + rel_lines + [""]
    out.append("\n".join(body))
    print("ported", name)

# back-relations on Employee / Section / Post
for target, models in backrefs.items():
    m = re.search(r'^model ' + target + r' \{.*?^\}', dst, re.S | re.M)
    blk = m.group(0)
    add = "".join(f"\n  {mod[0].lower() + mod[1:]}s {mod}[]" for mod in models if not re.search(r'\s' + mod + r'\[\]', blk))
    if add:
        i = blk.rfind("\n\n  @@") if "\n\n  @@" in blk else blk.rfind("\n}")
        nb = blk[:i] + add + blk[i:]
        dst = dst.replace(blk, nb)
dst = dst.rstrip() + "\n\n" + "\n\n".join(out) + "\n"
open(N, "w").write(dst)
