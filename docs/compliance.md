# Compliance evidence, scope and sources

Checked 30 September 2026. This base checks stored evidence for staff review. It does not certify a college, determine a visa outcome or send a government report. Each configured course names its jurisdiction and sector. NZ courses never receive Australian attendance or CoE rules.

| Check | Meaning and source |
|---|---|
| AGREEMENT | Missing agreement reference, not a review of the agreement's contents. Australian National Code Standard 3 covers written agreements. NZ international learner records also require enrolment documentation. |
| COE | Australian CoE reference or expiry missing, or expiry before the intake ends. This is a date reconciliation check supporting National Code Standard 8, not PRISMS validation. |
| REGISTER | No scheduled taught days or some past sessions are unmarked. This is evidence quality, never proof of absence. Applies to the schedule the college recorded, which must be checked against the approved timetable. |
| ATTENDANCE | Recorded attendance below the configured course threshold, only when every recorded past session is marked. AU ELICOS defaults to the National Code minimum of 80%. Higher applicable requirements need configuration. VET is not given this test by default. Enable it where the provider's registration conditions require monitoring. |
| ABSENCE | More than five recorded unapproved absent days in an AU ELICOS course. This conservative review prompt counts the course total, not a legally determined continuous absence period. Staff check the pattern, authorisation and intervention policy. |
| PROGRESS | Progress unknown, at risk or unsatisfactory. Status comes from a staff academic review, not an automated assessment grade. The 30-day reminder in progress-review is a local workflow setting, not a statutory deadline. |
| NZ_INSURANCE | Insurance date missing or ending before the course. Staff must check the actual policy and suitability, not just this date. |
| NZ_VISA | Visa evidence date missing or ending before the course. No online visa validation or immigration decision. |
| NZ_ORIENTATION | No orientation date recorded. Staff review evidence of appropriate orientation and ongoing support. |
| CONTACT | Emergency contact not recorded. Local pastoral care completeness check, not a claim that a single field fulfils the Code. |
| CONTACT_HOURS | An AU ELICOS course records fewer than 20 weekly hours. The setting must reflect the approved face-to-face timetable. |

## Australian sources

- [ASQA overseas student attendance](https://www.asqa.gov.au/for-providers/provider-obligations/esos-requirements/overseas-student-attendance): ELICOS contact hours, attendance monitoring, intervention and the distinction from VET registration conditions.
- [National Code of Practice 2018](https://www.legislation.gov.au/F2017L01182/latest/text): Standards 3 and 8. Check the current instrument and applicable regulator's conditions before deployment.
- [Department of Education Standard 8 factsheet](https://www.education.gov.au/esos-framework/resources/standard-8-overseas-student-visa-requirements): monitoring, reporting and review responsibilities.

The percentage is attended minutes divided by scheduled minutes for marked past sessions. Missing marks remain unknown. Approved absences do not become attended minutes. The minimum 80% is not an automatic reporting trigger. The 70% exception has further conditions and staff discretion; this base does not automate it. Staff own notification, compassionate circumstances, intervention and the full internal and external appeal process. No timer assumes calendar days are working days. No PRISMS, AVETMISS, VSL or TCSI submission is implemented. Under-18 welfare, accommodation oversight, refund rules and record-retention policies require a separate implementation before that scope is used.

## New Zealand sources

- [NZQA international tertiary learner Code summary](https://www2.nzqa.govt.nz/tertiary/the-code/the-code-for-learners/the-code-summary-tertiary/): documentation, visa and insurance records, orientation and learner support.
- [NZQA insurance for international learners](https://www2.nzqa.govt.nz/tertiary/the-code/the-code-for-education-providers/code-resources-for-school-signatories/insurance-for-international-learners/): verify coverage and record decisions.
- [NZQA self-review and attestation](https://www2.nzqa.govt.nz/tertiary/the-code/the-code-for-education-providers/self-review-and-attestation/): annual self-review obligations remain with the provider. This base does not submit an attestation.

Support actions store an owner, due date and resolution. They help keep evidence but do not implement the whole Pastoral Care Code. There is no universal NZ attendance percentage applied by this build. Configure the provider's actual policy. Production student data requires controlled access, encryption, backups, data retention and the college's privacy process. Demo records are invented and contain no real students.
