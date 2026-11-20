const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('class GameController'));
const els = new Map();
function el(id) { if (!els.has(id)) els.set(id, {children:[], classList:{add(){},remove(){}}, appendChild(c){this.children.push(c)}, prepend(){}, set innerHTML(v){this.children=[]; this._html=v}, get innerHTML(){return this._html||''}}); return els.get(id); }
const document = {getElementById:el, createElement:()=>({classList:{add(){},remove(){}}})};
const ctx = {window:{addEventListener(){}},document,console,localStorage:{getItem(){return null},setItem(){}}};
ctx.LifeModel=require('../life-model.js');vm.createContext(ctx); vm.runInContext(script + '\nglobalThis.api={GameController,REGIONS,REGION_FAMILIES};',ctx);
const {GameController,REGIONS,REGION_FAMILIES}=ctx.api;
function game(year){const g=Object.create(GameController.prototype);g.reset();g.state.birthYear=year;g.state.region=REGIONS[0];g.state.family=REGION_FAMILIES[REGIONS[0].id][0];g.state.cohorts=[];g.buildYearByYearChronicle();return g}
let failures=0;function test(name,fn){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
test('每个出生年份的年度关键事件不被覆盖，2026结卷',()=>{for(let y=1980;y<=1989;y++){const c=game(y).state.eventsChain; for(const flag of ['isHouseFork','isStockBullFork','isP2PFork','isHouseCrashSettle','isFinalYear']) assert(c.some(e=>e[flag]),`${y} missing ${flag}`); assert(c.at(-1).isFinalYear,`${y} final`);}});
test('少年游戏经历被记录并触发后续选项',()=>{let g=game(1984);g.renderCurrentEvent=()=>{};g.handleOption({playedGamesGamer:true,effect:{}},{year:1997,age:13});assert.equal(g.state.playedGamesGamer,true)});
test('普通高中滑档不会被记录成重点高中',()=>{let g=game(1984);g.state.stats.study=50;g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isMiddleSchoolFork);g.renderCurrentEvent();let b=el('card-actions').children.find(b=>b.innerHTML.includes('滑档'));assert(b);b.onclick();assert.equal(g.state.schoolTrack,'normal_hs')});

test('各出生年份和不同选择均能走到结卷并显示同龄人',()=>{for(let y=1980;y<=1989;y++){for(let choice of [0,1,2]){let g=game(y);g.state.cohorts=[{name:'小陈',origin:'虚构',region:'射阳',status:'初生'}];let steps=0;while(g.state.currentStep<g.state.eventsChain.length){g.renderCurrentEvent();let buttons=el('card-actions').children.filter(b=>typeof b.onclick==='function');assert(buttons.length,`${y} ${g.state.currentStep} no choices`);buttons[Math.min(choice,buttons.length-1)].onclick();assert(++steps<160,'infinite loop')}assert(g.state.firstLifeSnapshot,`${y} missing ending`);assert(el('end-cohort-matrix').children.length>0,`${y} no cohort matrix`);}}});


test('初生同龄人不会以学龄儿童身份出现',()=>{let g=game(1984);g.state.cohorts=[{name:'小陈'},{name:'小王'},{name:'小李'},{name:'小张'}];g.updateCohortsForAge(0);assert(g.state.cohorts.every(c=>c.status.includes('襁褓')))});


test('关键选择留下真实记录供回顾',()=>{let g=game(1984);g.renderCurrentEvent=()=>{};g.handleOption({text:'自选道路',log:'选择了自选道路',effect:{}},{year:2002,age:18,isEighteenFork:true});assert(g.state.majorDecisions.some(d=>d.year===2002 && d.choice==='选择了自选道路'))});


const cases = [
 ['普通高中17岁应继续上学',()=>{let g=game(1984);g.state.schoolTrack='normal_hs';g.state.career='student';g.renderOptions({age:17});assert(!el('card-actions').children.some(b=>b.innerHTML.includes('实习单位')))}],
 ['大学录取后仍是学生',()=>{let g=game(1984);g.state.schoolTrack='normal_hs';g.state.stats.study=80;g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isEighteenFork);g.renderCurrentEvent();el('card-actions').children.find(b=>b.innerHTML.includes('南京普通一本')).onclick();assert.equal(g.state.career,'student');assert.equal(g.state.education,'university')}],
 ['复读后应有下一年结果',()=>{let g=game(1984);g.state.schoolTrack='normal_hs';g.state.stats.study=80;g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isEighteenFork);g.renderCurrentEvent();el('card-actions').children.find(b=>b.innerHTML.includes('高复班')).onclick();assert(g.state.eventsChain.some(e=>e.isRetakeExamFork && e.age===19))}],
 ['已有职业可选择继续',()=>{let g=game(1984);g.state.career='industry';g.renderOptions({age:22,isCareerAffinityFork:true});assert(el('card-actions').children.some(b=>b.innerHTML.includes('继续当前工作')))}]
];for(const [name,fn] of cases)test(name,fn);


const extraCases = [
 ['大学生19岁与21岁显示校园生活',()=>{let g=game(1984);g.state.education='university';g.state.career='student';for(const age of [19,21]){g.renderOptions({age});let text=el('card-actions').children.map(b=>b.innerHTML).join(' ');assert(text.includes('大学'));assert(!/正式入职|外企写字楼|公职人员/.test(text));}}],
 ['复读升本科后22岁仍在校，23岁可毕业择业',()=>{let g=game(1984);g.state.schoolTrack='normal_hs';g.state.stats.study=80;g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isEighteenFork);g.renderCurrentEvent();el('card-actions').children.find(b=>b.innerHTML.includes('高复班')).onclick();g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isRetakeExamFork);g.renderCurrentEvent();el('card-actions').children.find(b=>b.innerHTML.includes('考入本科')).onclick();assert.equal(g.state.graduationAge,23);g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isCareerAffinityFork&&e.age===22);g.renderCurrentEvent();assert(el('card-actions').children.some(b=>b.innerHTML.includes('继续完成大学学业')));el('card-actions').children[0].onclick();assert.equal(g.state.career,'student');g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isCareerAffinityFork&&e.age===23);assert(g.state.currentStep>=0);g.renderCurrentEvent();let job=el('card-actions').children.find(b=>b.innerHTML.includes('工友前辈'));assert(job);job.onclick();assert.equal(g.state.education,'graduated');assert.equal(g.state.career,'industry')}],
 ['已有职业留岗后保留职业',()=>{let g=game(1984);g.state.career='boss';g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isCareerAffinityFork);g.renderCurrentEvent();el('card-actions').children.find(b=>b.innerHTML.includes('继续当前工作')).onclick();assert.equal(g.state.career,'boss')}]
];for(const [name,fn] of extraCases)test(name,fn);



test('16岁剧情不能把技校生写成重点高中生',()=>{let g=game(1984);g.state.schoolTrack='tech';g.state.career='student';g.renderOptions({age:16});let text=el('card-actions').children.map(b=>b.innerHTML).join(' ');assert(!/重点高中|尖子班/.test(text));assert(/技校|技能/.test(text))});


test('技校背景不能直接获得依赖学历的机关或教师岗位',()=>{let g=game(1984);g.state.schoolTrack='tech';g.state.education='school';g.state.career='industry';g.state.family={affinityTrack:'system',parentWish:'',familyPerk:''};g.renderOptions({age:22,isCareerAffinityFork:true});let text=el('card-actions').children.map(b=>b.innerHTML).join(' ');assert(!text.includes('考录机关事业单位/直属小学'));});


test('已经入厂或开店后，19岁不再重复第一次入职或开店',()=>{for(const career of ['industry','boss']){let g=game(1986);g.state.career=career;g.state.education='finished';g.renderOptions({age:19});let text=el('card-actions').children.map(b=>b.innerHTML).join(' ');assert(!/正式入职|第一个三平米|自立门户/.test(text))}});
test('18岁完成技校就业后结束在校状态',()=>{let g=game(1986);g.state.schoolTrack='tech';g.state.currentStep=g.state.eventsChain.findIndex(e=>e.isEighteenFork);g.renderCurrentEvent();el('card-actions').children[0].onclick();assert.equal(g.state.education,'finished')});

process.exitCode=failures?1:0;
