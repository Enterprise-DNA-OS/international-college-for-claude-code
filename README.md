# International College for Claude Code

Students, enrolments, attendance, tuition and support actions in a database your college owns. Built by Enterprise DNA. MIT licence.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free code, your installation and database. | Your fields, policy checks, eBECAS migration, preferred stack and a web front end if needed. | Installed, connected and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=ebecas) | [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=ebecas) |

Use Claude Code, Codex, OpenCode or Cursor. All agents read the same data and recipes through AGENTS.md and CLAUDE.md.

## What works today

Review intakes, reconcile missing attendance marks, record academic progress, review CoE dates, reconcile tuition instalments and assign pastoral support actions. Australian ELICOS and New Zealand evidence checks stay separate. Read-only dashboards and four branded document types come from the same records.

The free base covers college back-office records. eBECAS also supplies class allocation, portals, financial functions and integrations outside this base. There is no claim of full parity or that eBECAS cannot produce similar analysis. Read the [scope](docs/why-no-front-end.md) and [evidence rules](docs/compliance.md) before using real student records.

## Quick start

Node 20 or newer:

```bash
git clone https://github.com/Enterprise-DNA-OS/international-college-for-claude-code.git
cd international-college-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

The fictional Harbour International College demo has six students, three courses and four intakes in Sydney and Auckland. Relative dates keep the first seed useful. It includes repeated absence, missing marks, overdue tuition, a CoE that ends early, expired agent evidence and missing NZ insurance. Seed is repeatable and does not overwrite existing records.

Ask /attendance-watch, /fees-due or /weekly-review. The [CLI guide](docs/cli.md) includes write recipes. Minutes and cents are stored as integers. All dates are read in UTC.

### Real records

Use a fresh DATA_DIR, run npm run migrate, then import. Do not seed real records. Embedded PGlite allows one process at a time. For a shared installation, set DATABASE_URL to your own PostgreSQL database and arrange least-privilege access, encryption, backups and retention. No hosted database is provisioned by this code.

## Commands

/add, /agent-review, /attendance-watch, /attention, /balances, /coe-expiry, /compliance, /courses, /customise, /draft-support, /enrol, /enrolment, /enrolments, /evidence, /export, /fee, /fees-due, /import, /intake-readiness, /intakes, /log, /mark, /missing-marks, /new-view, /payment, /progress, /progress-review, /quiet-students, /resolve, /risk-and-fees, /schedule, /student, /students, /support, /support-due, /weekly-review

Every read accepts --json. Ambiguous names list candidates and exit 1. Unknown commands fail. The routing table is in CLAUDE.md.

## Documents and views

One brand.json controls the business name, logo and colours. npm run docs creates an enrolment schedule draft, fee statement, attendance record and support review worksheet for each enrolment. A trained staff member checks each document. These are not government CoEs or intention-to-report notices.

npm run view creates the college week, attendance coverage and fee-balance dashboards. /new-view adds another read-only report. /draft-support writes a support invitation with internal evidence in drafts. Remove internal evidence before sending. Nothing sends from this system.

## Ten questions you can ask today

Supported questions, not claims that eBECAS lacks equivalent reports:

1. Which students have both attendance concerns and unpaid tuition? (`risk-and-fees`)
2. Which attendance percentages hide missing register marks? (`attendance-watch`)
3. Which taught days still need a mark for each student? (`missing-marks`)
4. Which CoE end dates fall before the course finishes? (`coe-expiry`)
5. Which students need an academic progress review? (`progress-review`)
6. Which support actions are waiting for a named owner to finish them? (`support-due`)
7. Which active students have no contact note for a fortnight? (`quiet-students`)
8. Which agents have students at academic risk and an expired agreement? (`agent-review`)
9. Which fee instalments fall due this week, by currency? (`fees-due`)
10. Which enrolments are missing agreements or NZ insurance evidence? (`compliance`)

## Your first hour: ten things to ask for

1. Put our college name and logo on the statements.
2. Map one small eBECAS cohort into the new records.
3. Add our campus and intake identifiers.
4. Match the attendance settings to our registration conditions.
5. Add our agreement evidence references.
6. Set academic review reminders to our documented policy.
7. Add the named support team and its escalation steps.
8. Add a field for a student's preferred contact method.
9. Make a view for one campus's missing marks.
10. Add an evidence rule for our particular provider obligations.

/customise writes a migration, applies it and runs the tests. Applied migrations are never rewritten. Changes to legal rules require source review.

## Switching from eBECAS

The vendor confirms filtered grid exports. Export and map your columns once, then load students, courses, intakes and enrolments in one command. This is not a complete one-day migration of college history. Attendance history, financial records and supporting documents require separate reviewed mapping. See the [switch guide](docs/replace-ebecas.md).

```bash
npm run college -- import ebecas mapped-enrolments.csv --dry-run
npm run college -- import ebecas mapped-enrolments.csv
npm run college -- export --out=./exports/first-backup
```

Reimporting matching records does not duplicate them. Conflicting records fail and the entire import rolls back. Imports never manufacture compliance evidence. Keep the original source files and reconcile all records before cutover.

## Validation and ownership

npm test builds a temporary database and exercises every read, enrolment capacity, attendance boundaries and missing marks, evidence writes, exact receipt balances, support resolution, import rollback, export, draft generation and branded paperwork. CI runs PGlite checks on Windows and Linux, and PostgreSQL 16 checks with a concurrent-capacity test. Local results and CI status are separate evidence.

MIT licence. Hosting, agent subscriptions and operations cost separately. Government reporting and student notifications stay with authorised college staff. Enterprise DNA can customise and operate your version through Omni by Enterprise DNA: [30 minutes with Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=ebecas).
