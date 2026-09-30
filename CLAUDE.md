# International College for Claude Code

For international-college enrolment, finance and student-support staff in Australia and New Zealand. All demo records are fictional. Read README.md, docs/cli.md and docs/compliance.md first.

## Rules

Read the affected record before changing it. Use scripts/college.mjs for recurring work. Never invent evidence, send messages, report to a regulator or cancel a student's enrolment. Regulatory flags require trained staff review. Ambiguity means list the candidates. Keep receipts separate by currency. A missing attendance mark is unknown. Never seed real records. Do not open or print credentials.

## Routing

| Request | Recipe |
|---|---|
| Review the college decisions | /attention |
| Find a student | /students |
| Review course settings | /courses |
| Review intake capacity | /intakes |
| Review enrolments | /enrolments |
| Prepare the next intake | /intake-readiness |
| Review attendance coverage and risk | /attendance-watch |
| Complete the attendance register | /missing-marks |
| Review course progress | /progress-review |
| Review CoE dates | /coe-expiry |
| Reconcile tuition balances | /balances |
| Prepare the tuition follow-up | /fees-due |
| Review education agent agreements and referrals | /agent-review |
| Review pastoral care actions | /support-due |
| Find students without recent contact | /quiet-students |
| Review evidence against configured rules | /compliance |
| Find attendance risk with overdue fees | /risk-and-fees |
| Read one student | /student |
| Read the full enrolment history | /enrolment |
| Add a student or course record | /add |
| Place a student in an intake | /enrol |
| Record a taught day | /schedule |
| Mark attendance | /mark |
| Record an academic review | /progress |
| Record verified enrolment evidence | /evidence |
| Record a tuition invoice | /fee |
| Record a confirmed receipt | /payment |
| Assign a student support action | /support |
| Close a completed support action | /resolve |
| Record a student contact | /log |
| Draft a support invitation | /draft-support |
| Import a mapped eBECAS export | /import |
| Export college records | /export |
| Monday review | /weekly-review |
| Change the system | /customise |
| Add a report | /new-view |

Recipes live in .claude/commands. All coding agents use the same scripts and database. New migrations go in supabase/migrations. Drafts go in drafts. Shared production access, retention and backups must be configured by the operator. Never delete history without explicit approval.

Built and run through Omni by Enterprise DNA.
