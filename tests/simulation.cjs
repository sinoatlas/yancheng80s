// Uses real renderer/choice handlers with a minimal DOM, no replacement simulation rules.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
const M=require('../life-model.js');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const js=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('class GameController'));
function make(seed,year=1986,region='yd',family=0,gender='male'){
 const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{children:[],classList:{add(){},remove(){}},appendChild(x){this.children.push(x)},prepend(){},set innerHTML(x){this._html=x;this.children=[]},get innerHTML(){return this._html||''}});return elements.get(id)}
 const ctx={LifeModel:M,console,window:{addEventListener(){}},document:{getElementById:el,createElement:()=>({})},localStorage:{getItem(){return null},setItem(){}}};vm.createContext(ctx);vm.runInContext(js+'\nglobalThis.api={GameController,REGIONS,REGION_FAMILIES,COHORT_TEMPLATES};',ctx);
 const {GameController,REGIONS,REGION_FAMILIES,COHORT_TEMPLATES}=ctx.api,g=Object.create(GameController.prototype);g.reset();g.state.birthYear=year;g.state.gender=gender;g.state.personName=gender==='female'?'陈晓梅':'徐浩';g.state.region=REGIONS.find(r=>r.id===region);g.state.family=REGION_FAMILIES[region][family%REGION_FAMILIES[region].length];Object.entries(g.state.family.stat||{}).forEach(([k,v])=>g.state.stats[k]+=v);g.state.cohorts=JSON.parse(JSON.stringify(COHORT_TEMPLATES));M.init(g.state,seed);g.buildYearByYearChronicle();return {g,el};
}
function run(index,all=false,cohorts=false){
 let seed=20261120+Math.floor(index/10),policy=index%10,rng=seed;const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/2**32};
 const regions=['th','yd','dt','df','jh','fn','sy','bh','xs'];const {g,el}=make(seed,cohorts?1980+Math.floor(index/10):all?1980+index%10:1986,all?regions[(index*7+Math.floor(index/10))%9]:'yd',all?Math.floor(index/9):0,all&&index%2?'female':'male');
 const trace=[],violations=[];let count=0;
 try{while(g.state.currentStep<g.state.eventsChain.length){assert(count++<160,'循环没有结束');const e=g.state.eventsChain[g.state.currentStep];g.renderCurrentEvent();const options=el('card-actions').children.filter(b=>b.onclick&&!b.disabled);assert(options.length,'无有效选项');let chosen=options[Math.floor(rand()*options.length)];
  const find=t=>options.find(b=>b.innerHTML.includes(t));
  if(e.isAnnualPlan)chosen=find(['平衡生活','进修学习','投入工作','陪伴家人','锻炼休息'][policy%5])||chosen;
  if(e.age<15 && policy<5)chosen=options[0];
  if(e.isMiddleSchoolFork)chosen=find(policy<4?'省重点高中':policy<7?'机电技校':'跟着亲友下海')||chosen;
  if(e.isEighteenFork)chosen=find(policy===3?'高复班':'南京普通一本')||chosen;
  if(e.isRetakeExamFork)chosen=find('考入本科')||chosen;
  if(e.isCareerAffinityFork)chosen=find(policy<3?'企业岗位':policy===3?'公共服务':policy<7?'继续当前工作':'自主经营')||chosen;
  if(e.isHouseFork)chosen=find(policy%3===0?'按揭':policy%3===1?'家乡小楼':'租住')||chosen;
  if(e.isCareerCrisisFork)chosen=find(policy%2?'企业岗位':'继续当前工作')||chosen;
  const choice=chosen.innerHTML.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();chosen.onclick();
  for(const [k,v] of Object.entries(g.state.stats))assert(Number.isFinite(v),k+' 非数值');
  if(g.state.education==='university')assert.equal(g.state.career,'student','在校全职工作');
  if(trace.length)assert(e.year>=trace.at(-1).year,'人生事件时间倒退');
  trace.push({year:e.year,age:e.age,event:e.title,choice,career:g.state.career,education:g.state.education,cash:g.state.stats.wealth,skill:g.state.life.skill,health:g.state.stats.health,kind:e.kind||null});
 }
 const s=g.state,l=s.life;assert(s.firstLifeSnapshot,'未结卷');assert.equal(l.ledger.length,2027-s.birthYear);assert.equal(new Set(l.ledger.map(r=>r.year)).size,l.ledger.length);
 for(let i=0;i<l.ledger.length;i++){const r=l.ledger[i];assert(Math.abs(r.close-(r.open+r.events+r.income-r.expense))<0.0002,'年度不守恒');if(i){assert.equal(r.open,l.ledger[i-1].close,'期初断裂');assert.equal(r.year,l.ledger[i-1].year+1,'账本年份断裂或倒退')}assert(r.principal>=0&&r.mortgage>=0);}
 const graduation=trace.find(t=>t.education==='graduated');if(graduation)assert(l.ledger.find(r=>r.year===graduation.year).income>0,'毕业工作当年未计收入');
 assert.equal(l.ledger.filter(r=>r.age>=18).length,Object.values(l.focusYears).reduce((a,b)=>a+b,0));
 assert.equal(s.firstLifeSnapshot.wealth,M.netWorth(s));
 if(l.home)assert(l.home.balance>=0);assert.equal(el('end-cohort-matrix').children.length,4);
 }catch(e){violations.push(e.message)}
 const s=g.state;return {run:index+1,seed,policy,birthYear:s.birthYear,gender:s.gender,region:s.region.name,family:s.family.name,violations,summary:{career:s.career,education:s.education,wealth:M.netWorth(s),cash:s.stats.wealth,skill:s.life.skill,bonds:s.life.bonds,health:s.stats.health,turningPoints:trace.filter(t=>t.kind).map(t=>t.kind),promotions:s.life.promotions,plans:s.life.plans},trace,ledger:s.life.ledger};
}
if(require.main===module){
const cohorts=process.argv.includes('--cohorts'),all=process.argv.includes('--all')||cohorts,n=cohorts?100:all?200:100,reports=Array.from({length:n},(_,i)=>run(i,all,cohorts)),bad=reports.filter(r=>r.violations.length);
const stats={runs:n,failures:bad.length,uniqueEndings:new Set(reports.map(r=>JSON.stringify(r.summary))).size,cashRange:[Math.min(...reports.map(r=>r.summary.cash)),Math.max(...reports.map(r=>r.summary.cash))],healthRange:[Math.min(...reports.map(r=>r.summary.health)),Math.max(...reports.map(r=>r.summary.health))],turningPointRuns:reports.filter(r=>r.summary.turningPoints.length).length};
fs.mkdirSync(path.join(__dirname,'reports'),{recursive:true});fs.writeFileSync(path.join(__dirname,'reports',cohorts?'cohorts-100.json':all?'all-200.json':'yandu-1986-100.json'),JSON.stringify({stats,reports},null,2));console.log(JSON.stringify({stats,errors:bad.map(r=>({run:r.run,errors:r.violations}))},null,2));process.exitCode=bad.length?1:0;
}
module.exports={make,run};
