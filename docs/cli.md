# College command recipes

Run `npm run college -- help`. Every read supports --json. Names match case-insensitively and UUID prefixes work. Ambiguous matches list candidates and exit 1. All dates use YYYY-MM-DD and the database session uses UTC. Money uses whole cents, never floating point. Do not put real student information into the fictional demo.

```bash
npm run college -- add student --id=ST-900 --name="Example Learner" --country=JP
npm run college -- add agent --code=DEMO --name="Example Education" --until=2027-01-01
npm run college -- add course --code=GE --name="General English" --jurisdiction=AU --sector=ELICOS --hours=20 --attendance=yes
npm run college -- add intake --code=GE-OCT --course=GE --campus=Sydney --from=2026-10-01 --to=2026-12-18 --capacity=20
npm run college -- enrol --id=EN-900 --student=ST-900 --intake=GE-OCT --agent=DEMO
npm run college -- evidence EN-900 --agreement=AG-900 --coe=VERIFIED-REFERENCE --until=2026-12-18
npm run college -- evidence student ST-900 --visa=2027-01-01 --insurance=2027-01-01 --orientation=2026-10-01 --emergency="Recorded contact reference"
npm run college -- schedule GE-OCT --date=2026-10-01 --minutes=240
npm run college -- mark EN-900 --date=2026-10-01 --minutes=240
npm run college -- progress EN-900 --state=satisfactory --note="Reviewed assessment evidence"
npm run college -- fee EN-900 --id=INV-900 --description="Tuition instalment" --due=2026-10-01 --cents=120000 --currency=AUD
npm run college -- payment INV-900 --reference=RCPT-900 --cents=60000 --date=2026-10-01
npm run college -- support EN-900 --reason="Discuss attendance" --owner="Student Support" --due=2026-10-02
npm run college -- resolve <case-id> --note="Meeting and agreed plan recorded"
npm run college -- log EN-900 --note="Student called about next week's timetable"
npm run college -- draft-support EN-900
npm run college -- enrolment EN-900 --json
```

Replace the sample dates and evidence references with reviewed records. Attendance cannot be marked in the future or exceed scheduled minutes. Use `--approved=yes --evidence="reference"` for an authorised absence; it remains non-attendance. One session represents the total taught minutes for one intake on one date. The scheduled day must fall within that intake.

Progress states: unknown, satisfactory, at-risk, unsatisfactory. Attendance evidence does not automatically set academic progress. Fees accept AUD and NZD. Receipts cannot exceed the recorded outstanding amount or reuse a receipt reference. This is a receipt register, not a bank feed, tax ledger or payment processor.

Core import is documented in [replace-ebecas.md](replace-ebecas.md). `npm run view` writes three read-only dashboards into views. `npm run docs` writes four document types into docs-out. Change brand.json for your business name, logo and colours. The enrolment schedule accompanies your reviewed terms; it is not a government CoE. The support worksheet is not a formal notice.

Embedded mode runs one process at a time. Do not run two CLIs against the same embedded database concurrently. Shared PostgreSQL is supported via DATABASE_URL. Intake placement and receipt recording lock the affected parent record inside a transaction.
