import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
export const reads={
 students:'select external_id,name,country,visa_until,insurance_until from students order by name',
 courses:'select code,name,jurisdiction,sector,weekly_hours,attendance_required,attendance_threshold from courses order by code',
 intakes:`select i.code,c.name course,i.campus,i.starts_on,i.ends_on,i.capacity,count(e.id)::int enrolled from intakes i join courses c on c.id=i.course_id left join enrolments e on e.intake_id=i.id and e.status in ('active','offered') group by i.id,c.name order by i.starts_on,i.code`,
 enrolments:'select external_id,student,intake,status,coe_until,progress,open_cases from v_enrolments order by external_id',
 'intake-readiness':`select external_id,student,intake,starts_on,coe,progress from v_enrolments where status in ('active','offered') and starts_on between current_date and current_date+30 order by starts_on,external_id`,
 'attendance-watch':`select external_id,student,intake,scheduled_days,marked_days,marked_percent,coverage from v_attendance order by marked_percent nulls first,external_id`,
 'missing-marks':`select e.external_id,s.name student,i.code intake,ss.held_on from enrolments e join students s on s.id=e.student_id join intakes i on i.id=e.intake_id join sessions ss on ss.intake_id=i.id left join attendance a on a.enrolment_id=e.id and a.session_id=ss.id where e.status='active' and ss.held_on<=current_date and a.id is null order by ss.held_on,e.external_id`,
 'progress-review':`select external_id,student,intake,progress,progress_on,ends_on from v_enrolments where status='active' and (progress<>'satisfactory' or progress_on is null or progress_on<current_date-30) order by ends_on,external_id`,
 'coe-expiry':`select external_id,student,intake,coe,coe_until,ends_on from v_enrolments where status='active' and jurisdiction='AU' and (coe is null or coe_until is null or coe_until<ends_on or coe_until<=current_date+60) order by coe_until nulls first,external_id`,
 balances:'select external_id,student,due_on,currency,amount_cents,paid_cents,balance_cents from v_balances order by due_on,external_id',
 'fees-due':`select external_id,student,due_on,currency,balance_cents from v_balances where balance_cents>0 and due_on<=current_date+7 order by due_on,external_id`,
 'agent-review':`select a.code,a.name,a.agreement_until,count(e.id)::int enrolments,count(e.id) filter(where e.progress in ('at-risk','unsatisfactory'))::int progress_flags from agents a left join enrolments e on e.agent_id=a.id and e.status='active' group by a.id order by a.code`,
 'support-due':`select sc.id,e.external_id,s.name student,sc.reason,sc.owner,sc.due_on from support_cases sc join enrolments e on e.id=sc.enrolment_id join students s on s.id=e.student_id where sc.status='open' order by sc.due_on,sc.id`,
 'quiet-students':`select external_id,student,intake,last_contact,open_cases from v_enrolments where status='active' and (last_contact is null or last_contact<current_date-14) order by last_contact nulls first,external_id`,
 compliance:'select external_id,student,rule,finding,source from v_compliance order by external_id,rule',
 attention:`select external_id,student,rule finding from v_compliance union all select e.external_id,b.student,'OVERDUE_FEE' from v_balances b join enrolments e on e.id=b.enrolment_id where b.balance_cents>0 and b.due_on<current_date union all select e.external_id,s.name,'SUPPORT_OVERDUE' from support_cases sc join enrolments e on e.id=sc.enrolment_id join students s on s.id=e.student_id where sc.status='open' and sc.due_on<current_date order by external_id,finding`,
 'risk-and-fees':`select a.external_id,a.student,a.marked_percent,a.coverage,b.currency,sum(b.balance_cents)::bigint overdue_cents from v_attendance a join v_balances b on b.enrolment_id=a.id where b.due_on<current_date and b.balance_cents>0 and (a.marked_percent<a.attendance_threshold or a.coverage<>'complete') group by a.external_id,a.student,a.marked_percent,a.coverage,b.currency order by a.external_id`,
};
const entities={student:['students','external_id','name'],course:['courses','code','name'],intake:['intakes','code','code'],enrolment:['enrolments','external_id','external_id'],agent:['agents','code','name'],invoice:['invoices','external_id','external_id'],case:['support_cases','id','reason']};
const allTables=['agents','students','courses','intakes','enrolments','sessions','attendance','invoices','payments','support_cases','notes'];
export async function match(db,kind,value){
 if(!value)throw Error(`Specify ${kind}`);const [t,k,n]=entities[kind];
 let rows=await db.query(`select * from ${t} where lower(${k}::text)=lower($1) or lower(${n}::text)=lower($1) or id::text=lower($1) order by id`,[value]);
 if(!rows.length)rows=await db.query(`select * from ${t} where starts_with(lower(${k}::text),lower($1)) or starts_with(id::text,lower($1)) order by id`,[value]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${kind}:\n${rows.map(r=>`${r.id}  ${r[k]}  ${r[n]}`).join('\n')}`:`Not found: ${kind} ${value}`);return rows[0];
}
function options(args){const pos=[],o={};for(const x of args){if(x.startsWith('--')){const i=x.indexOf('=');o[x.slice(2,i<0?undefined:i)]=i<0?true:x.slice(i+1);}else pos.push(x);}return {pos,o};}
const req=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}=value`);return o[k].trim();};
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Use a valid YYYY-MM-DD date');return v;};
const number=(v,min=0)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||Number(v)<min||Number(v)>2147483647)throw Error(`Expected integer >= ${min}`);return Number(v);};
const oneOf=(v,allowed)=>{if(!allowed.includes(v))throw Error(`Expected one of ${allowed.join(', ')}`);return v;};
const yes=v=>oneOf(v,['yes','no'])==='yes';
const today=()=>new Date().toISOString().slice(0,10);
async function tx(db,fn,dry=false){await db.exec('BEGIN');try{const x=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return x;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function insert(db,t,fields){const keys=Object.keys(fields);return db.query(`insert into ${t} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(fields));}
async function enrol(db,external,s,intake,agent,status='active'){
 await db.query('select id from intakes where id=$1 for update',[intake.id]);
 const [{n}]=await db.query("select count(*)::int n from enrolments where intake_id=$1 and status in ('active','offered')",[intake.id]);
 if(['active','offered'].includes(status)&&n>=intake.capacity)throw Error('Intake at capacity');
 return insert(db,'enrolments',{external_id:external,student_id:s.id,intake_id:intake.id,agent_id:agent?.id||null,status});
}
async function importRows(db,file,dry){
 const rows=parseCsv(fs.readFileSync(file,'utf8'));if(!rows.length)throw Error('No import rows');
 const seen=new Set();
 return tx(db,async()=>{
  let added=0,unchanged=0;
  for(const raw of rows){
   const r={};for(const key of ['Enrolment ID','Student ID','Student Name','Course Code','Course Name','Jurisdiction','Sector','Intake Code','Campus','Start Date','End Date','Capacity','Weekly Hours','Attendance Required','Status']){r[key]=pick(raw,key).trim();if(!r[key])throw Error(`Missing import column or value: ${key}`);}
   if(seen.has(r['Enrolment ID']))throw Error('Duplicate Enrolment ID in import');seen.add(r['Enrolment ID']);
   const jur=oneOf(r.Jurisdiction,['AU','NZ']),sector=oneOf(r.Sector,['ELICOS','VET','LANGUAGE']);
   const start=date(r['Start Date']),end=date(r['End Date']);if(end<start)throw Error('End Date precedes Start Date');
   const capacity=number(r.Capacity,1),hours=number(r['Weekly Hours'],1),attend=yes(r['Attendance Required']),status=oneOf(r.Status,['offered','active','completed','withdrawn']);
   await db.query('insert into students(external_id,name,email,country) values($1,$2,$3,$4) on conflict(external_id) do nothing',[r['Student ID'],r['Student Name'],pick(raw,'Email')||null,pick(raw,'Country')||null]);
   const s=await match(db,'student',r['Student ID']);if(s.name!==r['Student Name'])throw Error('Student identity differs; review mapping before import');
   await db.query('insert into courses(code,name,jurisdiction,sector,weekly_hours,attendance_required) values($1,$2,$3,$4,$5,$6) on conflict(code) do nothing',[r['Course Code'],r['Course Name'],jur,sector,hours,attend]);
   const c=await match(db,'course',r['Course Code']);if(c.name!==r['Course Name']||c.jurisdiction!==jur||c.sector!==sector||Number(c.weekly_hours)!==hours||c.attendance_required!==attend)throw Error('Course configuration differs; review mapping before import');
   await db.query('insert into intakes(code,course_id,campus,starts_on,ends_on,capacity) values($1,$2,$3,$4,$5,$6) on conflict(code) do nothing',[r['Intake Code'],c.id,r.Campus,start,end,capacity]);
   const i=await match(db,'intake',r['Intake Code']);if(i.course_id!==c.id||i.starts_on!==start||i.ends_on!==end||i.campus!==r.Campus||i.capacity!==capacity)throw Error('Intake configuration differs; review mapping before import');
   const [old]=await db.query('select * from enrolments where external_id=$1',[r['Enrolment ID']]);
   if(old){if(old.student_id!==s.id||old.intake_id!==i.id||old.status!==status)throw Error('Enrolment differs; reconcile before import');unchanged++;}
   else{await enrol(db,r['Enrolment ID'],s,i,null,status);added++;}
  }
  return [{rows:rows.length,added,unchanged,dry_run:dry,evidence:'Import does not assert CoE, agreement, attendance, payment or visa evidence.'}];
 },dry);
}
export async function run(db,args){
 const {pos,o}=options(args);const [cmd='help',a,b]=pos;
 if(cmd==='help')return [{commands:[...Object.keys(reads),'student','enrolment','add','enrol','schedule','mark','progress','evidence','fee','payment','support','resolve','log','draft-support','import','export'].join(', ')}];
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='student'){const s=await match(db,'student',a);return {student:s,enrolments:await db.query('select * from v_enrolments where student_number=$1',[s.external_id])};}
 if(cmd==='enrolment'){const e=await match(db,'enrolment',a);return {enrolment:(await db.query('select * from v_enrolments where id=$1',[e.id]))[0],attendance:await db.query('select * from v_attendance where id=$1',[e.id]),balances:await db.query('select * from v_balances where enrolment_id=$1',[e.id]),notes:await db.query('select body,created_at from notes where enrolment_id=$1 order by created_at',[e.id]),support:await db.query('select * from support_cases where enrolment_id=$1 order by due_on',[e.id])};}
 if(cmd==='add'){
  if(a==='student')return insert(db,'students',{external_id:req(o,'id'),name:req(o,'name'),email:o.email||null,country:o.country||null,date_of_birth:o.dob?date(o.dob):null});
  if(a==='agent')return insert(db,'agents',{code:req(o,'code'),name:req(o,'name'),agreement_until:o.until?date(o.until):null});
  if(a==='course')return insert(db,'courses',{code:req(o,'code'),name:req(o,'name'),jurisdiction:oneOf(req(o,'jurisdiction'),['AU','NZ']),sector:oneOf(req(o,'sector'),['ELICOS','VET','LANGUAGE']),weekly_hours:number(req(o,'hours'),1),attendance_required:yes(req(o,'attendance'))});
  if(a==='intake'){const c=await match(db,'course',req(o,'course'));return insert(db,'intakes',{code:req(o,'code'),course_id:c.id,campus:req(o,'campus'),starts_on:date(req(o,'from')),ends_on:date(req(o,'to')),capacity:number(req(o,'capacity'),1)});}
  throw Error('add requires student, agent, course or intake');
 }
 if(cmd==='import'){if(a!=='ebecas'||!b)throw Error('Use import ebecas file.csv [--dry-run]');return importRows(db,b,Boolean(o['dry-run']));}
 if(cmd==='export'){
  const out=path.resolve(req(o,'out'));fs.mkdirSync(out,{recursive:true});
  const snapshot=await tx(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');const x={};for(const t of allTables)x[t]=await db.query(`select * from ${t} order by id`);return x;});
  const csv=x=>'"'+String(x??'').replaceAll('"','""')+'"';
  for(const [name,rows] of Object.entries(snapshot)){const keys=rows.length?Object.keys(rows[0]):(await db.query('select column_name from information_schema.columns where table_schema=current_schema() and table_name=$1 order by ordinal_position',[name])).map(r=>r.column_name);fs.writeFileSync(path.join(out,name+'.csv'),[keys.map(csv).join(','),...rows.map(r=>keys.map(k=>csv(r[k] instanceof Date?r[k].toISOString():r[k])).join(','))].join('\r\n')+'\r\n',{flag:'wx'});}
  fs.writeFileSync(path.join(out,'snapshot.json'),JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});return [{directory:out,records:Object.values(snapshot).reduce((n,r)=>n+r.length,0)}];
 }
 if(cmd==='enrol')return tx(db,async()=>enrol(db,req(o,'id'),await match(db,'student',req(o,'student')),await match(db,'intake',req(o,'intake')),o.agent?await match(db,'agent',o.agent):null,o.status?oneOf(o.status,['active','offered']):'active'));
 if(cmd==='schedule'){
  const i=await match(db,'intake',a),on=date(req(o,'date'));if(on<i.starts_on||on>i.ends_on)throw Error('Session must be inside intake dates');
  return insert(db,'sessions',{intake_id:i.id,held_on:on,minutes:number(req(o,'minutes'),1)});
 }
 if(cmd==='payment')return tx(db,async()=>{const f=await match(db,'invoice',a);await db.query('select id from invoices where id=$1 for update',[f.id]);const [balance]=await db.query('select balance_cents from v_balances where id=$1',[f.id]);const amount=number(req(o,'cents'),1);if(amount>Number(balance.balance_cents))throw Error('Payment exceeds outstanding balance');return insert(db,'payments',{reference:req(o,'reference'),invoice_id:f.id,amount_cents:amount,paid_on:date(o.date||today())});});
 if(cmd==='resolve'){const c=await match(db,'case',a);if(c.status!=='open')throw Error('Case is already closed');return db.query("update support_cases set status='closed',resolution=$1 where id=$2 returning *",[req(o,'note'),c.id]);}
 if(cmd==='evidence'&&a==='student'){
  const s=await match(db,'student',b),patch={};for(const [flag,col] of [['visa','visa_until'],['insurance','insurance_until'],['orientation','orientation_on'],['emergency','emergency_contact']])if(o[flag])patch[col]=flag==='emergency'?req(o,flag):date(o[flag]);
  if(!Object.keys(patch).length)throw Error('Specify visa, insurance, orientation or emergency evidence');const keys=Object.keys(patch);return db.query(`update students set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(patch),s.id]);
 }
 if(['mark','progress','evidence','fee','support','log','draft-support'].includes(cmd)){
  const e=await match(db,'enrolment',a);
  if(cmd==='mark'){
   const on=date(req(o,'date'));if(on>today())throw Error('Cannot mark future attendance');
   const [ss]=await db.query('select * from sessions where intake_id=$1 and held_on=$2',[e.intake_id,on]);if(!ss)throw Error('Schedule the session first');
   const minutes=number(req(o,'minutes'));const approved=o.approved?yes(o.approved):false;if(approved&&!o.evidence)throw Error('Approved absence requires evidence');
   return db.query('insert into attendance(enrolment_id,session_id,attended_minutes,approved_absence,evidence) values($1,$2,$3,$4,$5) on conflict(enrolment_id,session_id) do update set attended_minutes=excluded.attended_minutes,approved_absence=excluded.approved_absence,evidence=excluded.evidence returning *',[e.id,ss.id,minutes,approved,o.evidence||null]);
  }
  if(cmd==='progress')return tx(db,async()=>{const state=oneOf(req(o,'state'),['unknown','satisfactory','at-risk','unsatisfactory']);await insert(db,'notes',{enrolment_id:e.id,body:'Progress review: '+req(o,'note')});return db.query('update enrolments set progress=$1,progress_on=current_date where id=$2 returning *',[state,e.id]);});
  if(cmd==='evidence'){
   const patch={};if(o.agreement)patch.agreement_ref=req(o,'agreement');if(o.coe){patch.coe=req(o,'coe');patch.coe_until=date(req(o,'until'));}if(!Object.keys(patch).length)throw Error('Specify --agreement or --coe and --until');const keys=Object.keys(patch);return db.query(`update enrolments set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(patch),e.id]);
  }
  if(cmd==='fee')return insert(db,'invoices',{external_id:req(o,'id'),enrolment_id:e.id,description:req(o,'description'),due_on:date(req(o,'due')),amount_cents:number(req(o,'cents'),1),currency:oneOf(req(o,'currency'),['AUD','NZD'])});
  if(cmd==='support')return insert(db,'support_cases',{enrolment_id:e.id,reason:req(o,'reason'),owner:req(o,'owner'),due_on:date(req(o,'due'))});
  if(cmd==='log')return insert(db,'notes',{enrolment_id:e.id,body:req(o,'note')});
  if(cmd==='draft-support'){
   const [s]=await db.query('select name from students where id=$1',[e.student_id]);const records=await run(db,['enrolment',e.id]);
   const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`support-${e.id}-${Date.now()}.md`);
   fs.writeFileSync(file,`# Draft for staff review\n\nHello ${s.name},\n\nWe would like to arrange a student support meeting to review your course and any help you need. Please contact the student support team to arrange a time.\n\n## Internal evidence, remove before sending\n\n${JSON.stringify(records,null,2)}\n\nThis is a support invitation, not an intention-to-report notice. No message has been sent.\n`,{flag:'wx'});return [{draft:file}];
  }
 }
 throw Error(`Unknown command: ${cmd}`);
}
export function display(value){
 if(Array.isArray(value)){if(!value.length)return '(none)';const keys=Object.keys(value[0]);return table(value,keys.map(key=>({key,label:key.replace(/_cents$/,''),width:key==='finding'?100:50,...(key.endsWith('_cents')?{format:(v,row)=>`${row.currency||''} ${(Number(v)/100).toFixed(2)}`.trim()}: {})})));}
 return Object.entries(value).map(([key,v])=>key+'\n'+display(Array.isArray(v)?v:[v])).join('\n\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):display(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
