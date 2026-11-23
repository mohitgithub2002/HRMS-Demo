"""Port an original integration test: the factory and core imports, db.<model> → tenantDb(boardId).<model>,
compound keys and boardId fields rescoped to the tenant. usage: port_test.py name [name ...]"""
import re, sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
from port import port_text
for name in sys.argv[1:]:
    s = open(f"/home/user/HRMS-Payroll-System/tests/integration/{name}.test.ts").read()
    s = s.replace('import { db } from "@/lib/db";', 'import { tenantDb } from "@/core/tenancy/scoped";')
    s = port_text(s)
    s = s.replace("actor.db.", "tenantDb(boardId).")  # port_text turned db. into actor.db.
    s = re.sub(r'boardId_(\w+): \{ boardId,', r'tenantId_\1: { tenantId: boardId,', s)
    s = re.sub(r'(create|data|where): \{ boardId, ', r'\1: { ', s)
    s = re.sub(r'(create|data|where): \{ boardId \}', r'\1: {}', s)
    FACTORY = {"makeSection", "makePost", "makeEmployee", "makeUser", "makeBoard", "tenantDb"}
    s = re.sub(r'\b(\w+)\(boardId, ', lambda m: m.group(0) if m.group(1) in FACTORY else f"{m.group(1)}(tenantDb(boardId), ", s)
    s = re.sub(r'\b(\w+)\(boardId\)', lambda m: m.group(0) if m.group(1) in FACTORY else f"{m.group(1)}(tenantDb(boardId))", s)
    s = re.sub(r', boardId\)', ', tenantDb(boardId))', s)
    s = s.replace("(await ledgerBalances(id))", "(await ledgerBalances(tenantDb(boardId), id))")
    s = s.replace("eventType:", "type:")
    open(f"/home/user/HRMS-Demo/tests/integration/{name}.test.ts", "w").write(s)
    print("ported test", name)
