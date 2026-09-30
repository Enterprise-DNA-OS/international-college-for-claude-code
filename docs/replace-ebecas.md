# Replace the college back office from eBECAS

The importer covers students, courses, intakes and enrolments. It does not claim complete eBECAS feature parity or a universal export layout. No real customer export was available for this build.

## Export and map once

1. In eBECAS, select the students and enrolments you intend to move. Export the relevant grids and keep the originals. The [vendor's feature page](https://ebecas.com.au/features/) confirms filtered grid exports and reports, but does not promise fixed column headers or a universal CSV schema.
2. Save a working copy as UTF-8 CSV. Join the student and course details to each enrolment if your grids export them separately. Map your labels to the columns below. Your college's dates, regulatory sector and capacity must be explicitly supplied. Do not guess missing evidence.
3. Keep one row per enrolment, with stable eBECAS student and enrolment identifiers. The fixture in examples/mapped-enrolments.csv illustrates the required mapping. It is synthetic, not a vendor-supplied sample.
4. In a fresh database, run migrate, then the dry run and import. Do not seed a database containing real records.

```bash
npm run migrate
npm run college -- import ebecas mapped-enrolments.csv --dry-run
npm run college -- import ebecas mapped-enrolments.csv
npm run college -- enrolments
npm run college -- compliance
```

| Column | Mapping |
|---|---|
| Enrolment ID | Unique source enrolment identifier |
| Student ID, Student Name | Stable source student identifier and name |
| Email, Country | Optional student contact and nationality fields |
| Course Code, Course Name | Your source course identifier and label |
| Jurisdiction | AU or NZ, confirmed by the operator |
| Sector | ELICOS, VET or LANGUAGE |
| Intake Code, Campus | Source cohort identifier and delivery location |
| Start Date, End Date | Intake dates in YYYY-MM-DD |
| Capacity, Weekly Hours | Positive integers from the college's approved setup |
| Attendance Required | yes or no, based on applicable conditions and policy |
| Status | offered, active, completed or withdrawn |

This version models one intake per enrolment, with a shared intake timetable. Split intakes when students have different approved dates or schedules. It does not implement eBECAS rolling class allocation.

A dry run rolls back every row. A real import is one transaction. Reimporting matching identifiers adds no duplicates. Differences in identity, course configuration, intake configuration, enrolment assignment or status stop the whole import so staff can reconcile them. Existing locally recorded contact details and evidence are preserved. This is a migration importer, not bidirectional synchronisation. Blank or malformed required values fail. Reimporting is not a way to update students' names or statuses.

## Evidence and history

Attendance registers, CoE and visa evidence, contracts, invoices, receipts, grades, agent commissions, homestay placements, files and messages need separate mapping. The base deliberately imports none of these as verified evidence. Retain the original exports and documents. The evidence, schedule, mark, progress, fee, payment and log commands record reviewed data in the new database. Enterprise DNA can author and test bulk history mapping for the actual exports as part of customisation.

The [vendor's PRISMS import guide](https://support.equatorit.com/classic/published/ebecas/prisms-import) documents a PRISMS-to-eBECAS workflow. It is not evidence that an eBECAS export can be uploaded directly to PRISMS, and this rebuild does neither.

## Reconcile before cutover

Compare student and enrolment counts, duplicate identifiers, courses, dates and campuses. Reconcile fee totals separately by currency against the finance system. Verify every required document, attendance period and live reporting obligation before stopping eBECAS. Start with a small cohort and keep the original system available while staff test the replacement. One command loads the mapped core records; a full regulated-college migration is not promised in a day.

Export your new records with `npm run college -- export --out=./exports/first-backup`. Use a new folder each time. It writes every domain collection as CSV and a complete JSON snapshot. The snapshot is portable data, not an automated database restore. Maintain actual database backups separately.
