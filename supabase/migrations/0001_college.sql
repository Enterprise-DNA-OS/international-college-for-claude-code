CREATE TABLE agents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, name text NOT NULL CHECK(length(trim(name))>0), agreement_until date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE students (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_id text UNIQUE NOT NULL, name text NOT NULL CHECK(length(trim(name))>0), email text, country text, date_of_birth date,
 visa_until date, insurance_until date, emergency_contact text, orientation_on date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE courses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, name text NOT NULL, jurisdiction text NOT NULL CHECK(jurisdiction IN ('AU','NZ')),
 sector text NOT NULL CHECK(sector IN ('ELICOS','VET','LANGUAGE')), weekly_hours numeric(6,2) NOT NULL CHECK(weekly_hours>0), attendance_required boolean NOT NULL DEFAULT false,
 attendance_threshold numeric(5,2) NOT NULL DEFAULT 80 CHECK(attendance_threshold BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(jurisdiction<>'AU' OR sector<>'ELICOS' OR (attendance_required AND attendance_threshold>=80))
);
CREATE TABLE intakes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, course_id uuid NOT NULL REFERENCES courses(id), campus text NOT NULL,
 starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on), capacity integer NOT NULL CHECK(capacity>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE enrolments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_id text UNIQUE NOT NULL, student_id uuid NOT NULL REFERENCES students(id), intake_id uuid NOT NULL REFERENCES intakes(id),
 agent_id uuid REFERENCES agents(id), status text NOT NULL DEFAULT 'active' CHECK(status IN ('offered','active','completed','withdrawn')),
 coe text, coe_until date, agreement_ref text, progress text NOT NULL DEFAULT 'unknown' CHECK(progress IN ('unknown','satisfactory','at-risk','unsatisfactory')),
 progress_on date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id,intake_id)
);
CREATE TABLE sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), intake_id uuid NOT NULL REFERENCES intakes(id), held_on date NOT NULL, minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 1440),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(intake_id,held_on)
);
CREATE TABLE attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrolment_id uuid NOT NULL REFERENCES enrolments(id), session_id uuid NOT NULL REFERENCES sessions(id),
 attended_minutes integer NOT NULL CHECK(attended_minutes>=0), approved_absence boolean NOT NULL DEFAULT false, evidence text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(enrolment_id,session_id)
);
CREATE TABLE invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_id text UNIQUE NOT NULL, enrolment_id uuid NOT NULL REFERENCES enrolments(id), description text NOT NULL,
 due_on date NOT NULL, amount_cents integer NOT NULL CHECK(amount_cents>0), currency text NOT NULL CHECK(currency IN ('AUD','NZD')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text UNIQUE NOT NULL, invoice_id uuid NOT NULL REFERENCES invoices(id), amount_cents integer NOT NULL CHECK(amount_cents>0), paid_on date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE support_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrolment_id uuid NOT NULL REFERENCES enrolments(id), reason text NOT NULL, owner text NOT NULL, due_on date NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')), resolution text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(status<>'closed' OR length(trim(resolution))>0)
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrolment_id uuid NOT NULL REFERENCES enrolments(id), body text NOT NULL CHECK(length(trim(body))>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=clock_timestamp(); RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['agents','students','courses','intakes','enrolments','sessions','attendance','invoices','payments','support_cases','notes'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',t);
END LOOP; END $$;
CREATE FUNCTION check_attendance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_intake uuid; actual_intake uuid; max_minutes integer;
BEGIN SELECT intake_id INTO expected_intake FROM enrolments WHERE id=NEW.enrolment_id;
 SELECT intake_id,minutes INTO actual_intake,max_minutes FROM sessions WHERE id=NEW.session_id;
 IF expected_intake IS DISTINCT FROM actual_intake OR NEW.attended_minutes>max_minutes THEN RAISE EXCEPTION 'Attendance must match intake and scheduled minutes'; END IF; RETURN NEW; END $$;
CREATE TRIGGER valid_attendance BEFORE INSERT OR UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION check_attendance();
CREATE VIEW v_attendance AS
 SELECT e.id,e.external_id,s.name student,c.jurisdiction,c.sector,i.code intake,c.attendance_required,c.attendance_threshold,
 count(ss.id)::int scheduled_days,count(a.id)::int marked_days,
 coalesce(sum(ss.minutes),0)::int scheduled_minutes,coalesce(sum(a.attended_minutes),0)::int attended_minutes,
 round(100.0*sum(a.attended_minutes)/nullif(sum(ss.minutes) FILTER(WHERE a.id IS NOT NULL),0),2) marked_percent,
 count(ss.id) FILTER(WHERE a.attended_minutes=0 AND NOT a.approved_absence)::int unapproved_absent_days,
 CASE WHEN count(ss.id)=0 THEN 'no schedule' WHEN count(ss.id)>count(a.id) THEN 'incomplete register' ELSE 'complete' END coverage
 FROM enrolments e JOIN students s ON s.id=e.student_id JOIN intakes i ON i.id=e.intake_id JOIN courses c ON c.id=i.course_id
 LEFT JOIN sessions ss ON ss.intake_id=i.id AND ss.held_on<=current_date
 LEFT JOIN attendance a ON a.session_id=ss.id AND a.enrolment_id=e.id
 WHERE e.status='active' GROUP BY e.id,s.name,c.id,i.code;
CREATE VIEW v_balances AS
 SELECT f.id,f.external_id,e.id enrolment_id,s.name student,f.description,f.due_on,f.currency,f.amount_cents,
 coalesce(sum(p.amount_cents),0)::bigint paid_cents,(f.amount_cents-coalesce(sum(p.amount_cents),0))::bigint balance_cents
 FROM invoices f JOIN enrolments e ON e.id=f.enrolment_id JOIN students s ON s.id=e.student_id LEFT JOIN payments p ON p.invoice_id=f.id
 GROUP BY f.id,e.id,s.name;
CREATE VIEW v_enrolments AS
 SELECT e.id,e.external_id,s.name student,s.external_id student_number,i.code intake,i.campus,c.name course,c.jurisdiction,c.sector,e.status,
 i.starts_on,i.ends_on,e.coe,e.coe_until,e.progress,e.progress_on,a.name agent,
 (SELECT max(n.created_at)::date FROM notes n WHERE n.enrolment_id=e.id) last_contact,
 (SELECT count(*)::int FROM support_cases sc WHERE sc.enrolment_id=e.id AND sc.status='open') open_cases
 FROM enrolments e JOIN students s ON s.id=e.student_id JOIN intakes i ON i.id=e.intake_id JOIN courses c ON c.id=i.course_id LEFT JOIN agents a ON a.id=e.agent_id;
CREATE VIEW v_compliance AS
 SELECT e.id,e.external_id,s.name student,'AGREEMENT' rule,'Missing written agreement reference' finding,'National Code Standard 3 / NZQA Code' source
 FROM enrolments e JOIN students s ON s.id=e.student_id WHERE e.status='active' AND nullif(trim(e.agreement_ref),'') IS NULL
 UNION ALL
 SELECT e.id,e.external_id,s.name,'COE','CoE missing or ends before intake','National Code Standard 8' FROM enrolments e JOIN students s ON s.id=e.student_id JOIN intakes i ON i.id=e.intake_id JOIN courses c ON c.id=i.course_id WHERE e.status='active' AND c.jurisdiction='AU' AND (nullif(trim(e.coe),'') IS NULL OR e.coe_until IS NULL OR e.coe_until<i.ends_on)
 UNION ALL
 SELECT id,external_id,student,'REGISTER',coverage,'National Code Standard 8 / local attendance policy' FROM v_attendance WHERE coverage<>'complete'
 UNION ALL
 SELECT id,external_id,student,'ATTENDANCE','Recorded attendance below configured threshold; staff review required','National Code Standard 8 / local attendance policy' FROM v_attendance WHERE attendance_required AND coverage='complete' AND marked_percent<attendance_threshold
 UNION ALL
 SELECT id,external_id,student,'ABSENCE','More than five unapproved absent days in recorded course; review pattern','National Code Standard 8.6.4' FROM v_attendance WHERE jurisdiction='AU' AND sector='ELICOS' AND unapproved_absent_days>5
 UNION ALL
 SELECT e.id,e.external_id,s.name,'PROGRESS','Progress unknown, at risk or unsatisfactory','National Code Standard 8 / provider academic policy' FROM enrolments e JOIN students s ON s.id=e.student_id WHERE e.status='active' AND e.progress<>'satisfactory'
 UNION ALL
 SELECT e.id,e.external_id,s.name,'NZ_INSURANCE','Insurance date missing or expires before course end','NZQA Code: international learner insurance' FROM enrolments e JOIN students s ON s.id=e.student_id JOIN intakes i ON i.id=e.intake_id JOIN courses c ON c.id=i.course_id WHERE e.status='active' AND c.jurisdiction='NZ' AND (s.insurance_until IS NULL OR s.insurance_until<i.ends_on)
 UNION ALL
 SELECT e.id,e.external_id,s.name,'NZ_VISA','Visa date missing or expires before course end','NZQA Code: international learner records' FROM enrolments e JOIN students s ON s.id=e.student_id JOIN intakes i ON i.id=e.intake_id JOIN courses c ON c.id=i.course_id WHERE e.status='active' AND c.jurisdiction='NZ' AND (s.visa_until IS NULL OR s.visa_until<i.ends_on)
 UNION ALL
 SELECT e.id,e.external_id,s.name,'NZ_ORIENTATION','Orientation date missing','NZQA Code: orientation and support' FROM enrolments e JOIN students s ON s.id=e.student_id JOIN intakes i ON i.id=e.intake_id JOIN courses c ON c.id=i.course_id WHERE e.status='active' AND c.jurisdiction='NZ' AND s.orientation_on IS NULL
 UNION ALL
 SELECT e.id,e.external_id,s.name,'CONTACT','Emergency contact missing','Provider pastoral care policy' FROM enrolments e JOIN students s ON s.id=e.student_id WHERE e.status='active' AND nullif(trim(s.emergency_contact),'') IS NULL
 UNION ALL
 SELECT e.id,e.external_id,s.name,'CONTACT_HOURS','ELICOS weekly hours below twenty','ELICOS Standards / ASQA attendance guidance' FROM enrolments e JOIN students s ON s.id=e.student_id JOIN intakes i ON i.id=e.intake_id JOIN courses c ON c.id=i.course_id WHERE e.status='active' AND c.jurisdiction='AU' AND c.sector='ELICOS' AND c.weekly_hours<20;
