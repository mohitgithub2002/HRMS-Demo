# Kosh — the complete setup guide

From an empty installation to an organisation that runs its HR every day and pays its people every month.

This guide is written for three readers, in the order they work:

| Part | Who | What they do |
|---|---|---|
| [A. Install Kosh](#part-a--install-kosh) | IT person / platform owner | Put the system on a server once |
| [B. Create an organisation](#part-b--create-an-organisation) | Platform owner | Add each organisation (a Cantonment Board, a council, a company) |
| [C. The organisation's first day](#part-c--the-organisations-first-day) | Organisation Admin | Profile, numbers, way of working, sections, posts, users, rights |
| [D. Pay rules](#part-d--pay-rules-rates-heads-matrix-tax) | Accounts manager (+ Admin) | Pay matrix, DA, HRA, TA, statutory rates, pay heads, tax |
| [E. People](#part-e--people) | HR manager | Employees, IDs and bank, family and nominees, opening balances |
| [F. Attendance and leave](#part-f--attendance-and-leave) | HR manager, section heads | Holidays, office hours, devices, leave rules |
| [G. The first payroll](#part-g--the-first-payroll) | Accounts manager (+ Admin) | Work out, check, pay, payslips, close |
| [H. Every month after](#part-h--every-month-after) | Everyone | The monthly calendar |
| [I. Reference](#part-i--reference) | Everyone | Roles and rights, defaults, troubleshooting |

> **Status of each part.** Kosh is being built module by module (see `PLAN.md`). Each chapter says whether it is
> **✅ available now** or **🔜 arrives with Module N**. Chapters that are not yet available describe exactly how the
> screen will work, so you can prepare your data in advance — it is the same flow as the single-organisation system Kosh is built on.

---

## Part A — Install Kosh

✅ Available now

### A1. What you need

| | Smallest | For 50 organisations / 50,000 employees |
|---|---|---|
| Application server | 2 vCPU, 4 GB RAM | 4–8 vCPU, 16 GB RAM (or Vercel) |
| PostgreSQL | 16, 2 vCPU, 4 GB RAM, 20 GB disk | 16, 8 vCPU, 32 GB RAM, 200 GB SSD, daily backups + WAL |
| Node.js | 22 | 22 |

### A2. The database login — the one rule that matters

Kosh keeps organisations apart **inside the database** with row-level security. PostgreSQL skips those rules for
superusers and for roles with `BYPASSRLS`. So the application must connect as an **ordinary** login that owns the
database:

```sql
CREATE USER kosh WITH PASSWORD 'choose-a-strong-one' CREATEDB;   -- not SUPERUSER, not BYPASSRLS
CREATE DATABASE kosh_prod OWNER kosh;
```

In production Kosh refuses to start on a login that bypasses row-level security. (`CREATEDB` is only needed on the
machine where you write new migrations; a production login does not need it.)

### A3. Configuration

```bash
cp .env.example .env
```

Fill in:

| Setting | What it is |
|---|---|
| `DATABASE_URL` | `postgresql://kosh:…@host:5432/kosh_prod` |
| `APP_ENV` | `production` (or `training`, `test`, `development`) |
| `APP_URL` | The address people type, e.g. `https://hr.example.gov.in` |
| `DATA_ENCRYPTION_KEY`, `BLIND_INDEX_KEY`, `OTP_PEPPER` | Three different keys: run `openssl rand -base64 32` three times. **Keep a copy offline** — without `DATA_ENCRYPTION_KEY` the Aadhaar, PAN and bank numbers can never be read again. Every organisation's own keys are derived from these. |
| `SMS_PROVIDER` | `http` in production (`console` prints codes to the log and shows them on screen; refused in production) |
| `MESSAGE_GATEWAY_URL`, `MESSAGE_GATEWAY_TOKEN` | Your SMS / e-mail gateway (with `SMS_PROVIDER=http`) |
| `STORAGE_DRIVER` | `disk` on your own server, `database` on Vercel |
| `PLATFORM_OWNER_EMAIL`, `PLATFORM_OWNER_PASSWORD` | The first person who will open the platform console |

### A4. Install and start

```bash
npm install
npm run db:deploy      # creates every table, with row-level security
npm run db:seed        # creates the platform owner (and, outside production, two demo organisations)
npm run build
npm start              # http://localhost:3000 (put nginx with HTTPS in front)
```

Check: open `/platform/login`, sign in with the owner's email and password, enter the code (in a practice copy it is
shown on screen), and choose your own password when asked.

### A5. Backups

Back up the database every night and keep the WAL for point-in-time recovery. Back up the storage folder if
`STORAGE_DRIVER=disk`. Keep the three keys from A3 with the backups, but **not on the same disk**.

---

## Part B — Create an organisation

✅ Available now · Platform console → **New organisation**

Each organisation takes about two minutes:

1. **Details.** Full name (and in Hindi), a short name, the **organisation code** — 2 to 12 capital letters or digits
   that people type at sign-in (e.g. `DCB`, `AMBALA`). The code never changes. Choose the kind (Cantonment Board,
   municipal body, government body, company), city and state, a contact person, and whether it starts on a trial
   (with the number of days) or active. Set the most users and employees it may have.
2. **Modules.** Employees, users and settings are always on. Tick the rest: Recruitment, Attendance, Leave, Payroll,
   Loans & arrears, Tax & statutory, Pension, Reports, Ask AI. A module that needs another switches it on too (Leave
   needs Attendance; Loans, Tax and Pension need Payroll).
3. **Starter pack.**
   - *Government of India — 7th CPC* (recommended): sections and posts for the kind of organisation, and — as each
     module arrives — the pay matrix, DA / HRA / TA and statutory rates, pay heads, leave rules, tax slabs, due dates
     and pension tables. Every value can be changed by the organisation afterwards.
   - *Start empty*: only settings; the organisation enters everything itself.
4. **First Admin.** Name, login ID (e.g. `ADMIN`), mobile (the sign-in codes go here), email.
5. **Review** and **Create organisation**.

You get the organisation's **sign-in page** (`/o/CODE`), the Admin's **login ID** and a **one-time password**. The
password is shown **only once** — give it to the Admin privately. They must change it at first sign-in.

### Looking after organisations

On the organisation's page in the console:

- **Modules** — switch modules on or off at any time. Switching a module off hides it from every menu, screen and API
  of that organisation; its data stays and comes back when you switch it on again.
- **Limits** — the most users and employees, and the plan name.
- **Pause access** — with a reason. Everyone in that organisation is signed out at once and cannot sign in until you
  **Resume**. Nothing is deleted.
- **Give an Admin a new password** — for when the organisation's only Admin is locked out. It is recorded in both
  audit trails and must be changed at first sign-in.
- **Activity** — everything the platform team did to this organisation.

The console never shows an organisation's people, pay or documents — only counts.

---

## Part C — The organisation's first day

✅ Available now · the Admin signs in at `/o/CODE`

After signing in and choosing a password, the Admin's **Home** shows *Finish setting up …* with a progress ring. It
opens **Administration → Setup**, a checklist whose ticks are worked out from your real data — a step turns green
only when it is really done.

### C1. Organisation profile — *Administration → Organisation*

Name in English and Hindi, short name, address, city, state, PIN code, and a **brand colour** (used on your sign-in
page and as a small accent in the app). The code cannot be changed.

### C2. Tax and statutory details — *Administration → Settings → Tax and statutory details*

| Field | Used on |
|---|---|
| Deductor name and address | Form 24Q, Form 16 (empty = the organisation's name and address from C1) |
| TAN | TDS challans, Form 24Q, Form 16 |
| PAN of the organisation | Form 24Q, Form 16 |
| Person responsible for deducting tax, designation | Form 16 signature block, 24Q |
| DDO code, DDO registration no. | Pay bills, 24Q, NPS files |
| EPF establishment code | ECR file for contract and daily-wage staff |
| ESIC code | ESIC monthly file |
| Metro city | HRA exemption at 50% of Basic + DA (Delhi, Mumbai, Kolkata, Chennai), else 40% |
| Professional tax + monthly slabs | Switch on only where your state levies it; enter the slabs of monthly gross |

### C3. How work is approved — *Settings → How work is approved*

| | **Simple** (default) | **Two steps** |
|---|---|---|
| Who decides | The person who looks after the area decides on their own desk: HR manager for people, Accounts manager for pay, Admin for everything | Every entry is checked by a second person (a Checker), and by an Admin where the rules ask |
| Payroll | Three steps: *Work out → Review → Pay* | Five stages: *Run → Fix exceptions → Check → Approve & sign with OTP → Pay* |
| Good for | Small and medium offices | Large offices, audit-heavy bodies |

You can switch either way at any time; no user changes, because roles are only names for permission sets. Save the
choice once even if you keep *Simple*: that ticks the step.

### C4. Sections — *Administration → Sections*

Your departments. The Government pack adds the usual ones (Administration, Accounts, Revenue, Health, Engineering,
Water, Electrical, Education, Hospital, Estate, Horticulture, IT Cell for local bodies). For each:

- **Code** (e.g. `ACC`) and name in English and Hindi.
- **Attendance**: *Biometric device* (punches imported or pushed by the device) or *Muster* (HR enters days).
- **Weekly off**: leave empty to follow the organisation's setting; tick days for a section that works differently
  (a hospital might have no weekly off).
- Switch a section off instead of deleting it; its history stays.

### C5. Posts — *Administration → Posts*

Designations, each with:

- **Pay level** of the 7th CPC matrix (1 to 18) — the starting point for pay.
- **Group** A, B, C or D — decides group insurance and some rules.
- **Retires at** (usually 60; 62 for doctors). The date of retirement of each employee is worked out from it: the last
  day of the month in which they reach that age (born on the 1st → the last day of the month before).

### C6. Users and roles — *Administration → Users & roles*

Add the people who will run the system. Give each a **role**:

| Role | Login | Permissions | Does |
|---|---|---|---|
| Admin | Admin | Approver, Pay bill signer | Sees and manages everything; approves; signs pay bills |
| IT support | Admin | User & settings manager | Users and settings only — never pay, bank or Aadhaar |
| HR manager | HR & Accounts | HR | Employees, hiring, attendance, leave, and every request about them |
| Accounts manager | HR & Accounts | Payroll, Pension | Payroll, loans, arrears, tax, statutory files, pension |
| HR and Accounts manager | HR & Accounts | HR, Payroll, Pension | Both, for a small office |
| Section head | Employee | Reporting officer | Their own record, plus their section's attendance and leave |
| Employee | Employee | — | Own record, attendance, leave, payslips, tax |

In the **two-step** way, also create at least one **Checker** (HR & Accounts login with the Checker permission) —
nobody may approve their own entry. The User & settings manager may not also hold Approver or Pay bill signer.

Each new login gets a **one-time password**, shown once. Give it privately; the person sets their own at first sign-in.
**Reset password** gives a new one-time password and signs the person out everywhere. **Switch off** stops a login at
once. Employees' logins are created automatically when their records are approved (Module 4).

### C7. Sign-in rules — *Settings → Sign-in*

- **One-time code at every sign-in** — on by default and recommended. Turn it off only until your SMS gateway works
  (Part A3), then turn it back on.
- **Mobile + code alone for employees and pensioners** — lets people with no password sign in from their phone.

Five wrong passwords lock a login for 15 minutes. A session ends after 15 minutes without activity (with a 2-minute
warning).

### C8. Office hours — *Settings → Office hours*

Office start (09:00), grace minutes (15), half day if fewer than this many minutes are worked between the first and
last punch (240), weekly off (Saturday and Sunday by default — choose only Sunday for a six-day week), the day of
the month by which last month's attendance must be locked (25), and the biometric devices (Part F2).

### C9. Salary bank — *Settings → Salary bank*

The bank, the last four digits of the organisation's debit account (only these are kept), its IFSC, the file format
(Generic, SBI CMP, PNB bulk, Bank of Baroda bulk, Canara bulk) and the file type — an **Excel sheet** (most bank
portals take it) or the bank's text / CSV layout. The payroll makes the salary credit file in this format.

### C10. Payslips — *Settings → Payslips*

A footer line printed on every payslip, and whether to show the leave balance.

### C11. SMS gateway — *Settings → SMS gateway*

Sign-in codes, pay-bill signing codes and salary / pension notices go by SMS. Until it is set up, **Practice** shows
each message in the server log (and the sign-in screen shows the code on a practice copy — never in production).

1. Register your sender id and message templates on the DLT platform (the texts are in `src/core/connectors/sms.ts`;
   each ends with your organisation's name).
2. Enter the gateway address with placeholders: `{to}` `{text}` `{templateId}` `{senderId}` `{entityId}` `{apiKey}`,
   the method, sender id, DLT entity id and each template id.
3. Put the gateway's API key in a **server variable** (e.g. `SMS_API_KEY`) and enter only the variable's name. The
   key is never stored in the database.
4. Choose **Live gateway** and save. Every message is logged (number masked) in the organisation's message log.

### C12. E-mail — *Settings → E-mail*

Payslips (PDF attached) and Form 16 go by e-mail to people who have an address on record. Enter the sender name and
address, the SMTP server and port, and the names of the server variables that hold the SMTP user and password. With
no server set, e-mails are only logged.

When the checklist is green, press **Mark setup as finished**: the banner leaves Home.

---

## Part D — Pay rules (rates, heads, matrix, tax)

✅ Available · *Administration → Rates and rules* (also from Payroll → **Rates and rules**)

Tabs: **Rates** · **DA & TA by year** · **Pay heads** · **Pay matrix** · **Income tax** · **Due dates** · **Pension
tables**. Every new organisation starts with the Government pack below; nothing has to be typed before the first
payroll except checking the values against your own orders.

Every rate is **dated**: a change is a new row with the date it takes effect, never an edit of the past. A month's
pay uses the rates in force on the 1st of that month; a back-dated change produces arrears (Module 8). In the
two-step way HR / Accounts propose and an Admin approves.

### D1. The pay matrix

The 7th CPC matrix (levels 1–18, cells 1–40) from 1 January 2016 is loaded by the Government pack. A future pay
commission is added as a new matrix with its own date (Excel upload → approval). Check: Level 6, Cell 1 = ₹35,400.

### D2. Rates the payroll reads (Government pack defaults — check each against your orders)

| Rate | Default | From |
|---|---|---|
| Dearness allowance (DA) | 0% → 2, 4, 5, 7, 9, 12, 17, 31, 34, 38, 42, 46, 50, 53, 55, 58, **60%** | 1 Jan 2016 → … → **1 Jan 2026** (expected rate — check against the DA order in force) |
| HRA (X city) | 30% of Basic, at least ₹5,400 | 1 Jan 2024 |
| Transport allowance | Level 9+: ₹7,200 · Levels 3–8: ₹3,600 · Levels 1–2: ₹1,350 (₹3,600 when Basic ≥ ₹24,200) — plus DA on TA | 1 Jan 2016 |
| NPS | Employee 10% · employer 14% of Basic + DA | 2004 / 1 Apr 2019 |
| GPF | at least 6% of Basic · at most ₹5,00,000 a year · interest 7.1% · advance up to 75% · withdrawal up to 90% | — |
| Pension fund (OPS staff) | Employer 10% of Basic + DA | 1 Jan 2020 |
| Group insurance | Group A ₹120 · B ₹60 · C ₹30 a month | — |
| EPF (contract / daily wage) | 12% + 12% (EPS 8.33%) on wages up to ₹15,000 | 1 Sep 2014 |
| ESIC | 0.75% + 3.25% when wages ≤ ₹21,000 (rounded up to the rupee) | 1 Jul 2019 |

How the engine uses them (worked example that must match to the rupee): **Level 6, Cell 1, NPS, X city** →
Basic 35,400 + DA 21,240 + HRA 10,620 + TA 3,600 + DA on TA 2,160 = **gross ₹73,020**; NPS 10% of (Basic + DA) =
**₹5,664**. Every head is worked out in paise and rounded to the rupee (50 paise and up goes up).

### D3. Pay heads

Each head has a code, names in English and Hindi, kind (earning / deduction / employer share), how it is worked
out, and the **account head** it posts to (for the accounting summary). The pack includes:

- **Worked out by the system**: Basic, DA, HRA, TA, DA on TA, Wages, NPS, GPF, GPF advance recovery, Group
  insurance, EPF, ESIC, Income tax (TDS), Professional tax, Loan recovery, and the employer shares.
- **Percent of Basic for listed posts**: Non-practising allowance 20% for Medical Officers (counts for DA).
- **Fixed for listed posts**: Washing ₹150 (Safai Karamchari, Mali), Conservancy ₹500 (Safai Karamchari), Risk ₹400
  (Safai Karamchari, Pump Operator, Electrician).
- **Standing amounts per person** (entered under *Pay items*): Special allowance, Uniform, Licence fee (quarters),
  Court attachment, Co-operative society dues, Overpayment recovery.

Add your own heads (e.g. a local allowance) with *Add pay head*; change the posts a head applies to; switch a head
off from a date.

### D4. Income tax

Both regimes' slabs, standard deduction, rebate and cess are dated tables for each financial year. Each employee
chooses a regime (new regime by default) and declares investments under *My tax*; HR & Accounts verify proofs
before January. TDS is projected on the full year's income every month and adjusted in the last quarter — it is
never typed as a pay item. The pack loads the slabs for this financial year and the last; add next year's on the
Income tax tab when the Budget is passed (an Admin approves it).

### D5. Statutory calendar

Due dates (TDS deposit by the 7th, ECR and ESIC by the 15th, 24Q quarterly, NPS) are a dated table; reminders appear
on Home five days before each.

---

## Part E — People

✅ Available now · **Employees**

### E1. Before you start — gather for each person

Employee ID from the old system (kept if given), name (English and Hindi), gender, date of birth, date of joining,
section, post, pay level and cell, employee type (Permanent–OPS, Permanent–NPS, Contract, Daily wage, Re-employed,
Deputation), PAN, Aadhaar, PRAN (NPS) or UAN / ESIC (contract), bank account and IFSC, mobile, address, family and
nominees, and the annual increment month (January or July).

### E2. Add employees

- **One by one**: *Add employee*. The date of retirement is worked out from the post. PAN, Aadhaar and bank are
  checked (PAN format, Aadhaar Verhoeff check, IFSC) and duplicates are refused within the organisation.
- **Many at once**: download the **Excel template** (it carries a codes sheet with your sections, posts and types),
  fill one row per person, upload. Every row is checked and errors are listed by row; the upload is all-or-nothing.
  One approval issues all Employee IDs.

Aadhaar, PAN and bank numbers are encrypted with your organisation's own key and shown masked; HR, Checker, Payroll
and Approver can reveal PAN and bank to check a document — every look is recorded. Aadhaar is never shown in full.

### E3. Family and nominees

For GPF, gratuity, group insurance, family pension and NPS; shares must add to 100% per scheme.

### E4. Opening figures (cut-over)

Bring each person's position on the day you start: leave balances (Excel sheet, one column per leave), GPF balance,
running loans with instalments paid, tax already deducted this financial year. Each upload is checked and approved.

### E5. Employee logins

The moment a person's Employee ID is issued, Kosh creates their own Employee login: the login ID is the Employee ID
and there is no password — they sign in from their phone with **mobile + one-time code** (keep *mobile + code alone*
on under Settings → Sign-in). If someone prefers a password, open Users & roles → *Reset password* to give them a
one-time password. To make someone a **Section head**, open their login in Users & roles and choose the *Section
head* role; they then see and decide for their own section only (moving them to another section moves their access).

### E6a. Hiring new people — *Hiring* (✅ available)

1. **Sanctioned posts first** (*Employees → Sanctioned posts*): a vacancy can only be raised against a vacant
   sanctioned seat.
2. **Vacancy**: section, post, seats and the reservation break-up (must add up to the seats); an Admin approves it,
   then record the advertisement number, date and last date. Reference numbers are `<your code>/REC/<year>/<n>`.
3. **Applicants** one by one or from the Excel template; move each through Eligible → Shortlisted → Selected.
4. **Selection list** (no more than the seats) → an Admin approves → **appointment letter** in Hindi and English,
   signed by the authority named in *Settings → Tax and statutory details*.
5. **Joining checklist** (documents, medical, police verification, oath, bank, PAN) → a Checker approves → the
   Employee ID is issued, initial pay fixed at cell 1, the service book opened, the Employee login made and a welcome
   SMS sent. Contract and daily-wage staff can join without a vacancy.
6. **Registration files**: PRAN for NPS joiners and EPF / ESIC for contract staff, released like every other file.

### E6. Sanctioned posts, change requests and scanned service books

- **Employees → Sanctioned posts**: the sanctioned strength per section and post against filled posts. Change it with
  the sanction order number; recruitment (Module 11) can only open vacancies against vacant sanctioned posts.
- **Employees → Change requests**: what employees asked to change (address, mobile, bank, nominee). Bank changes need a
  proof document.
- **Employees → Scanned service books**: upload many PDFs at once; each file name starts with the Employee ID
  (`DEMO00009.pdf`, `DEMO00009 part 2.pdf`) and lands on that person's record.

---

## Part F — Attendance and leave

✅ Available now · **Attendance & leave**

### F1. Holiday calendar

Each year: gazetted and restricted holidays, set by HR (approved by a Checker in the two-step way). A locked month's
holidays cannot change.

### F2. Biometric devices

Import punch files from eSSL, ZKTeco (attlog.dat or export), Mantra, AEBAS or the Kosh template (Attendance →
Import); or let eSSL / ZKTeco devices push to Kosh: list each device's serial number under Settings → Office hours →
Biometric devices, and point the device's server address ("ADMS") at your Kosh address (`https://<your-kosh>/iclock`).
A serial number belongs to one organisation only — Kosh uses it to file the punches under the right organisation. Only new punches are saved; each file is kept with
its checksum. Sections without devices use the **muster**.

### F3. Daily status

Present, Late (after start + grace), Half day (after the half-day time), Absent, Missed punch, On duty, On leave,
Holiday, Weekly off, Dies-non. Employees ask for missed-punch / on-duty corrections; the section head decides.

### F4. Month lock

By the lock day, each section head (or HR) locks last month: every absent, missed punch and half day is decided
first (present, on duty, dies-non, or treated as leave). Locked totals feed the payroll.

### F5. Leave rules (Government pack defaults — confirm against your rules)

| Leave | Credit | Notes |
|---|---|---|
| Casual (CL) | 8 a year on 1 Jan | lapses 31 Dec; half days allowed |
| Earned (EL) | 15 on 1 Jan and 1 Jul | cap 300; holidays inside count |
| Half pay (HPL) | 10 on 1 Jan and 1 Jul | half Basic and DA |
| Commuted | 2 HPL per day | medical certificate |
| Extraordinary (EOL) | — | no pay |
| Maternity | 180 days a time | |
| Paternity | 15 days a time | |
| Child care (CCL) | 730 days in service | |
| Restricted holiday (RH) | 2 a year | from the RH list |

New joiners get credits pro rata. Each rule (credit, cap, pay effect, lapse, half day, certificate, who may
sanction) is a versioned table entry.

---

## Part G — The first payroll

✅ Available · *Payroll* (Accounts manager; the Admin in the simple way)

Run your first month **in parallel** with your old system, compare, and only then pay from Kosh.

1. **Check the inputs**: last month's attendance is locked for every section; standing pay items are entered; the
   rates in force on the 1st are right (Part D).
2. **Work out** the month for each pay group (Permanent–OPS, Permanent–NPS, Contract & daily wage; Pensioners with
   Module 10).
3. **Pre-checks** list what needs a decision: no bank account, negative net, pay after retirement or contract end,
   net change over 25%, a bank account used twice, no pay level, suspension, attendance not locked.
4. **Compare** the pay sheet with your old pay bill, person by person and head by head. Any difference over ₹1 needs
   an explanation (usually a rate or item not yet entered).
5. **Approve** (simple: one step; two steps: Checker, then an Admin signs with an OTP).
6. **Bank file** in your bank's format → upload to the bank → read the return file → re-pay failed credits.
7. **Finish the month**: payslips go to every employee (email + SMS link, in English and Hindi), the accounting
   summary by account head is made, and the month closes.

**On screen, the simple way** (*Payroll → This month*): three steps — **Work out salaries** (one button, every pay
group), **Review** (each flagged person: *It is fine — pay* or *Hold this pay*, one click), **Approve and pay** (bank
files made; download each and upload it to the bank), then **Finish the month**. A bill can be taken back until the
month is finished.

**The two-step way** (*Payroll → a bill*): five stages — Run → Fix exceptions → Check (a Checker) → Approve & sign (an
Admin with the *Pay bill signer* permission, with a one-time code sent to their own mobile; the code works only for
that bill) → Pay (the bank file is released by an approver before anyone can download it).

### G1. Pay items, increments, arrears and loans

- **Allowances and deductions** (*Payroll → Allowances and deductions*): standing amounts per person — GPF
  subscription, licence fee, society dues, court attachment, a one-off recovery — from a month, optionally to a month.
- **Increments and promotions**: on 1 January and 1 July the list of people due appears; confirm it (a Checker
  verifies). A promotion or MACP is fixed with the rule shown on screen.
- **Arrears and extra bills**: back-dated DA, increments or fixation are worked out month by month, due vs drawn,
  and paid in a supplementary bill through the same steps.
- **Loans**: festival, computer, vehicle, house-building advances — sanctioned through a Checker and an Admin, then
  recovered by the payroll every month until they reach zero.

### G2. Tax, funds and statutory files — *Tax and statutory* (✅ available)

| Tab | What to do |
|---|---|
| Calendar | Due dates for the month; reminders reach Accounts five days before each |
| Declarations | Check each employee's regime and investment proofs (they declare under *My tax*) before January |
| TDS & 24Q | Enter each month's challan (BSR code, number, date); make Form 24Q each quarter and run it through the FVU |
| Files | NPS (CRA), EPF ECR, ESIC and the pension-fund file for each month — previewed, released by an approver, downloaded |
| Form 16 | After March: make Part B, import Part A from TRACES, publish — employees download from *My pay* |
| Funds | GPF ledgers (opening balances, advances, interest, annual statement) and NPS contributions |

### G3. Pension — *Pension* (✅ available)

1. **Pensioners from the old records**: add each with PPO number, type, basic pension, commuted amount and date,
   bank account, family — a Checker approves each record.
2. **The pension bill** runs every month like a pay group (*Pension → Bills*): basic + dearness relief + medical
   allowance − commutation, additional pension at 80+, restoration after 15 years — all worked out from the dated
   tables (*Rates and rules → Pension tables*).
3. **Life certificates**: every November; pensioners upload a Jeevan Pramaan certificate from their own login, or the
   office enters one. A pension is held when a certificate is overdue and paid with the next bill once it comes.
4. **Retirements**: alerts at 12 and 6 months; prepare the case (*Pension → Cases*: calculator, no-dues from each
   section, Checker then Admin); the PPO is a PDF numbered `<your code>/PPO/<year>/<n>`; the retiree moves to the
   pension the day after retirement and the benefits are paid in a supplementary bill.
5. **Leaving service** (*Employees → Suspensions & leaving*): suspension, resignation, removal, dismissal, termination,
   end of contract, transfer out — the full and final settlement takes every loan and recovery into account.

---

## Part H — Every month after

| When | Who | What |
|---|---|---|
| 1st | System | Leave credits (1 Jan / 1 Jul), increments due (1 Jan / 1 Jul), retirements, exits |
| Day 1–lock day | Section heads, HR | Decide attendance requests; lock last month |
| By the 7th | Accounts | TDS deposited, challan entered |
| By the 15th | Accounts | ECR and ESIC files for last month |
| Around the 20th | Accounts | Work out, review and pay this month's salary |
| End of quarter | Accounts | Form 24Q |
| November | Pension | Life certificates |
| June | Accounts | Form 16 to everyone |

---

## Part H2 — Reports and dashboards (✅ available)

*Reports* lists 25 standard reports in five groups — people, attendance and leave, payroll, funds and tax, pension
and control — each with filters (month, section, type of staff) and an Excel and PDF download. A login sees a report
only if it holds the *Reports* right **and** may see what the report reads; reporting officers see their own section.
Run **Report 25 — Ghost-employee check** every month before paying: a salary account that also takes someone's
pension, two pensions into one account, pay after retirement or leaving, pay with no attendance.

Home shows each login what needs them today ("My work") and the figures of their desk; the Admin also sees headcount
by type, retirements in the next six months and the filings due.

## Part H3 — Ask AI (✅ available, a platform add-on)

People ask questions in plain words ("How many staff retire this year?", "What was my net pay in October?") and get an
answer worked out from the records — only what their own login may already see — and from your documents.

1. **Platform owner**: switch on the *Ask AI* module for the organisation in the console.
2. **Once per installation**: the read-only database role. The migration creates it when its database login may; if
   *Settings → Ask* says the role is missing, a database administrator runs
   `psql -d <database> -v app=<application user> -f scripts/ask-role.sql` once.
3. **Admin, *Settings → Ask***: choose the AI service (Gemini, GPT or Claude) and the model, paste the service's API
   key (saved encrypted with your organisation's key, never shown again), press **Test**, then choose who may ask —
   office staff or everyone. Decide first whether your policy allows records to be sent to an outside AI service.
4. **Documents** (*Ask → Documents*): paste your policies, orders and circulars as text, each for everyone, office
   staff or the Admin only. Ask quotes them with their reference.
5. Every question is in the audit trail with the look-ups it made (never the rows); each person may ask 30 questions
   in 10 minutes.

## Part I — Reference

### I1. Who may do what (summary)

| Area | Admin | HR manager | Accounts manager | Checker (two steps) | Section head | Employee |
|---|---|---|---|---|---|---|
| Users, settings | ✓ (with IT support) | | | | | |
| Organisation, sections, posts | ✓ | sections and posts | | | | |
| Employees, service book | ✓ | ✓ | view | check | own section, view | own record |
| Attendance | ✓ | ✓ | view | check | decide, lock own section | own, requests |
| Leave | ✓ | ✓ | view | | decide own section | apply |
| Rates and rules | approve | propose | propose | | | |
| Payroll, loans, arrears | approve, sign | | ✓ | check | | own payslips |
| Tax and statutory | release files | | ✓ | check | | own declarations |
| Pension | approve, sign | | ✓ | check | | pensioners: own |
| Audit trail | ✓ | | | | | |

Rules that always hold: nobody approves their own entry; nobody decides their own pay, loan or arrears; the IT
support login never sees pay, bank or Aadhaar; a section head sees only their own section (moving the person moves
the access); access ends on retirement, resignation, transfer or death.

### I2. How your data is kept apart

Every organisation's rows carry its id. PostgreSQL row-level security lets a query see only the rows of the
organisation it runs for, and the application adds the same filter itself — two independent walls. Aadhaar, PAN and
bank numbers are encrypted with your organisation's own key. Every change is in your audit trail, which nobody can
edit. Details: [ARCHITECTURE.md](./ARCHITECTURE.md).

### I3. Troubleshooting

| Problem | Fix |
|---|---|
| "We could not find an organisation with this code." | Check the code with your Admin; it is shown on your sign-in page `/o/CODE`. |
| No code arrives by SMS | Check `SMS_PROVIDER=http` and the gateway; meanwhile the Admin may turn off *one-time code at every sign-in*. |
| "Too many wrong tries" | Wait 15 minutes, or ask your Admin to reset your password. |
| The only Admin is locked out | The platform owner opens the organisation in the console → *Give an Admin a new password*. |
| "Your organisation's access is paused" | The platform owner paused it; they resume it from the console. |
| A menu item is missing | The module is not switched on for your organisation (platform owner), or your role does not include it (Admin). |
| App refuses to start: "bypasses row-level security" | Connect with an ordinary database login (Part A2). |
