const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const D = require('../gym-core.js');
const exercise = (weight = 100, overrides = {}) => ({ id: 'e1', name: 'Chest Press', equipment: 'Cable', loadUnit: 'lb', trackingMode: 'bilateral', notes: '', sets: [{id: 's1', weight, reps: 10, rir: 2}], ...overrides });
const session = (id, gymId, day, weight = 100, overrides = {}) => ({id, gymId, title:'Upper', startedAt:`2026-10-${day}T10:00:00Z`, finishedAt:`2026-10-${day}T11:00:00Z`, exercises:[exercise(weight)], ...overrides});
const logs = [session('a1','apartment','10',100), session('u1','university','11',200),session('a2','apartment','12',110),session('old',undefined,'13',300)];

test('same exercise across gyms has completely isolated points', () => {
  const key = D.series(logs, 'apartment')[0].key;
  assert.deepEqual(D.points(logs,'apartment',key).map(p=>p.weight),[100,110]);
  assert.deepEqual(D.points(logs,'university',key).map(p=>p.weight),[200]);
  assert.deepEqual(D.points(logs,'previous',key).map(p=>p.weight),[300]);
});
test('machine, units, tracking mode, and unilateral sides are separate series', () => {
  const exercises = [exercise(100), exercise(120,{equipment:'Plate-loaded'}),exercise(50,{loadUnit:'kg'}),exercise(0,{trackingMode:'unilateral',sets:[{left:{weight:30,reps:10},right:{weight:40,reps:10}}]})];
  const sessions = [session('x','apartment','10',100,{exercises})];
  assert.equal(D.series(sessions,'apartment').length,5);
  const left = D.series(sessions,'apartment').find(s=>s.side==='left');
  const right = D.series(sessions,'apartment').find(s=>s.side==='right');
  assert.equal(D.points(sessions,'apartment',left.key)[0].weight,30);
  assert.equal(D.points(sessions,'apartment',right.key)[0].weight,40);
});
test('normalization tolerates case and whitespace without losing machine identity',()=>{
  assert.equal(D.exerciseKey(exercise()),D.exerciseKey(exercise(1,{name:' chest   PRESS ',equipment:' CABLE '})));
  assert.notEqual(D.exerciseKey(exercise()),D.exerciseKey(exercise(1,{equipment:''})));
});
test('previous sets use one preceding workout at the exact setup',()=>{
  const current = {id:'current', gymId:'apartment',startedAt:'2026-10-14T10:00:00Z'};
  assert.equal(D.previous(logs,current,exercise()).session.id,'a2');
  assert.equal(D.previous(logs,{...current,gymId:'university'},exercise()).session.id,'u1');
  assert.equal(D.previous(logs,current,exercise(1,{equipment:'Other'})),null);
  assert.equal(D.previous(logs,logs[2],exercise()).session.id,'a1');
  const longerOld = session('older','apartment','09',90,{exercises:[exercise(90,{sets:[{weight:90,reps:10},{weight:95,reps:8}]})]});
  assert.equal(D.previous([...logs,longerOld],current,exercise()).exercise.sets[1],undefined);
});
test('invalid and empty sets cannot create strength records',()=>{
  const exercises = [exercise(Infinity),exercise(0),exercise(100,{sets:[{weight:100,reps:''}]}),exercise(100,{sets:[{weight:100,reps:1.5}]})];
  assert.equal(D.series([session('x','apartment','10',100,{exercises})],'apartment').length,0);
});
test('same-day sessions retain timestamp order and duplicate exercise blocks use the best set',()=>{
  const early = session('a','apartment','10',100);
  const late = session('b','apartment','10',120,{finishedAt:'2026-10-10T15:00:00Z',exercises:[exercise(120),exercise(130)]});
  const key=D.series([late,early],'apartment')[0].key;
  assert.deepEqual(D.points([late,early],'apartment',key).map(p=>p.weight),[100,130]);
});

function app() {
  const storage = new Map();
  const context = vm.createContext({WorkoutDomain:D,console,URLSearchParams,structuredClone,Date,Math,JSON,Set,Map,Blob,
    location:{search:''},window:{WORKOUT_LOGGER_CLOUD:{}},navigator:{},
    document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},confirm:()=>true});
  let source = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replaceAll('\r\n','\n');
  source=source.replace(/\nrender\(\);\nvoid initCloud\(\);\nvoid initServiceWorker\(\);\s*$/,'');
  vm.runInContext(source,context);
  return {context,storage,run:code=>vm.runInContext(code,context)};
}
test('legacy hydration preserves values and assigns Previous gym, without guessing load units',()=>{
  const a=app(); a.context.input={templates:[{id:'t',name:'My routine',exercises:[exercise(10)]}],sessions:[session('s',undefined,'10')],activeWorkout:session('active',undefined,'15')};
  const migrated=a.run('hydrateState(input)');
  assert.equal(migrated.templates[0].gymId,'previous');
  assert.equal(migrated.sessions[0].gymId,'previous');
  assert.equal(migrated.activeWorkout.gymId,'previous');
  assert.equal(migrated.sessions[0].exercises[0].sets[0].weight,100);
  assert.equal(a.run('hydrateWorkoutLike({exercises:[{name:"Press",sets:[]}]}).exercises[0].loadUnit'),'unspecified');
  assert.equal(migrated.selectedGymId,'apartment');
});
test('edited gym and removed sets survive older backups, archives, and cloud records',()=>{
  const a=app();
  a.context.old=session('s','previous','10',100,{updatedAt:'2026-10-10T12:00:00Z'});
  a.context.edited={...a.context.old,gymId:'university',updatedAt:'2026-10-20T12:00:00Z',revisionAt:'2026-10-20T12:00:00Z',exercises:[]};
  const result=a.run('hydrateState(mergeCloudStates({sessions:[edited]},{sessions:[old]}))');
  assert.equal(result.sessions[0].gymId,'university');
  assert.equal(result.sessions[0].exercises.length,0);
  a.storage.set('codex.workoutLoggerWeb.sessionArchive.v1',JSON.stringify([a.context.old]));
  assert.equal(a.run('recoverStateFromLocalBackups({sessions:[edited]}).sessions[0].exercises.length'),0);
});
test('deleted templates and discarded or finished workouts do not revive from sync',()=>{
  const a=app();
  assert.equal(a.run('hydrateState(mergeCloudStates({deletedTemplateIds:["t"]},{templates:[{id:"t",name:"Old",exercises:[]}]})).templates.length'),0);
  assert.equal(a.run('hydrateState({activeWorkout:{id:"w"},deletedSessionIds:["w"]}).activeWorkout'),null);
  assert.equal(a.run('hydrateState({activeWorkout:{id:"w"},sessions:[{id:"w"}]}).activeWorkout'),null);
});
test('template copies are independent and new workouts retain selected gym and machine',()=>{
  const a=app();
  a.run('state.selectedGymId="university"; state.templates=[{id:"t",gymId:"previous",name:"Upper",exercises:[{id:"e",name:"Press",equipment:"Old machine",loadUnit:"lb",notes:"",sets:[]}]}]; render=()=>{}; copyTemplateToGym("t");');
  assert.equal(a.run('editingTemplate.gymId'),'university');
  assert.equal(a.run('editingTemplate.exercises[0].equipment'),'');
  assert.equal(a.run('state.templates[0].exercises[0].equipment'),'Old machine');
  assert.notEqual(a.run('editingTemplate.id'),'t');
  a.run('editingTemplate.exercises[0].equipment="New machine"; const workout=workoutFromTemplate(editingTemplate);');
  assert.equal(a.run('workout.gymId'),'university');
  assert.equal(a.run('workout.exercises[0].equipment'),'New machine');
});
test('previous placeholders cannot use a different gym or the edited session itself',()=>{
  const a=app(); a.context.input=logs;
  a.run('state=hydrateState({sessions:input,selectedGymId:"university",activeWorkout:{id:"now",gymId:"apartment",startedAt:"2026-10-14T12:00:00Z",exercises:input[0].exercises}})');
  assert.equal(a.run('previousSetForExercise(state.activeWorkout.exercises[0],0).weight'),110);
  assert.equal(a.run('previousSetForExercise(state.sessions.find(s=>s.id==="a2").exercises[0],0,null,"session:a2")?.weight'),100);
});
test('missing effort remains unknown and legacy records do not appear in new gym stats',()=>{
  const a=app();
  assert.equal(a.run('averageRir([{sets:[{weight:100,reps:10,rir:""}]}])'),'—');
  a.context.input=[session('old',undefined,'10')];
  assert.equal(a.run('state=hydrateState({sessions:input}); trackedExerciseNames().length'),0);
  assert.ok(a.run('renderStrengthMain().includes("fresh baseline")'));
});
test('local reload remembers the gym and preserves equipment and units',()=>{
  const a=app(); a.context.input=logs;
  a.run('state=hydrateState({sessions:input,selectedGymId:"university"}); saveState(); state=loadState();');
  assert.equal(a.run('state.selectedGymId'),'university');
  assert.equal(a.run('state.sessions.find(s=>s.id==="a1").exercises[0].equipment'),'Cable');
  assert.equal(a.run('state.sessions.find(s=>s.id==="a1").exercises[0].loadUnit'),'lb');
});
test('cloud writes retain gym metadata and deletion markers in the existing JSON row',async()=>{
  const a=app(); a.context.input=logs;
  a.run('state=hydrateState({sessions:input,selectedGymId:"apartment",deletedTemplateIds:["deleted"]}); cloudUser={id:"test-user"};');
  let saved;
  a.context.capture=value=>{saved=value; return {error:null};};
  await a.run('cloudClient={from:()=>({upsert:async value=>capture(value)})}; pushCloudState(false);');
  assert.equal(saved.user_id,'test-user');
  assert.equal(saved.data.sessions.find(s=>s.id==='a1').gymId,'apartment');
  assert.equal(saved.data.sessions.find(s=>s.id==='old').gymId,'previous');
  assert.equal(saved.data.deletedTemplateIds[0],'deleted');
});
test('entry page and offline cache ship the same complete v21 asset set',()=>{
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  for(const asset of ['styles.css','gym-core.js','app.js']) {
    assert.ok(html.includes(`./${asset}?v=21`));
    assert.ok(sw.includes(`./${asset}?v=21`));
    assert.ok(fs.existsSync(path.join(root,asset)));
  }
  assert.ok(html.indexOf('gym-core.js') < html.indexOf('app.js?v='));
});
