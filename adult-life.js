/* 成年生活模型：所有人物与参数均为虚构；无真实医疗、婚育或经济预测。 */
(function(root){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(100,n)),round=n=>Math.round(n*10000)/10000;
  const titles={memory:'旧本子还在',hospital:'身体撑不住了：住院与休养',debt:'现金周转已经吃紧',era:'时代突然改变了日常',relationship:'爱人与自己的生活',parents:'父母慢慢老去',children:'孩子与养育的打算',health:'身体、运动与休息',housing:'把日子安顿在哪里',transport:'通勤与家人的距离',work:'工作之外，还有生活',single:'一个人的生活也值得经营',hub:'这一年，你想认真安排哪件事'};
  const A={
    init(s){if(s.adult)return s.adult;
      s.adult={relationship:'single',partner:null,children:[],parents:[
        {id:'father',label:'父亲',birthYear:s.birthYear-28,health:82,closeness:65,care:null},
        {id:'mother',label:'母亲',birthYear:s.birthYear-26,health:86,closeness:68,care:null}],
        inlaws:[],exercise:'occasional',exerciseYears:0,stress:20,social:50,car:null,year:null,
        streak:null,hospitalizedYears:[],actionCounts:{},choices:{},seen:{},followups:[],notices:[],feedback:null,yearEffect:{},childPlan:'undecided'};
      return s.adult;
    },
    begin(s,year){const a=this.init(s);if(a.year!==year){a.year=year;a.yearEffect={};}},
    elders(s){const a=this.init(s);return [...a.parents,...(a.relationship==='married'?a.inlaws:[])];},
    improveBonds(s,n){const a=this.init(s);for(const person of [...this.elders(s),...a.children,...(a.partner&&['dating','married'].includes(a.relationship)?[a.partner]:[])])person.closeness=clamp(person.closeness+n);s.life.bonds=clamp(s.life.bonds+n);},
    weakest(s){return this.elders(s).slice().sort((a,b)=>a.health-b.health)[0];},
    event(s,year,topic,extra={}){this.init(s);return {year,age:year-s.birthYear,icon:'🍃',typeTag:'成年生活',isAdultLife:true,topic,key:topic+'-'+year,title:titles[topic]||'生活的回响',...extra,desc:this.description(s,topic,year,extra)};},
    description(s,topic,year,extra={}){const a=this.init(s),p=a.partner;
      if(topic==='hospital')return `输液架旁放着一袋换洗衣服，手机在枕边亮了几次。你把工作群调成了静音。\n身体状态${s.stats.health}，已低于20的游戏警戒线。你需要住院观察和休养，本年劳动收入减少55%，增加恢复费用，并暂停额外长期计划。身体限制不能靠点“继续加班”跳过。`;
      if(topic==='debt')return `现金${s.stats.wealth.toFixed(1)}万。低于0意味着周转欠款并计息，低于-5万会暂停额外长期计划，并影响睡眠和家庭压力。可以缩减支出、盘活车辆，或按实际收入逐步偿还。`;
      if(topic==='era')return this.era(s,year).description;
      if(topic==='memory')return `${s.playedGamesGamer?'收拾柜子，翻到一张旧游戏光盘。盒子背面有同学用圆珠笔写的名字，你擦了擦，字还在。':s.schoolTrack==='prov_key'||s.schoolTrack==='normal_hs'?'搬动纸箱，底下是一本中学的练习本。末页写过想去的城市，旁边算了一道没有做完的题。':'抽屉里有一张旧合照。那时刚离开学校，几个人站得很直，还不太会在镜头前笑。'}\n同学群里有人发来一段排练的录音。唱到一半忘了词，旁边的人笑了。你听完，又点了一遍。`;
      if(topic==='relationship'&&p&&['dating','married'].includes(a.relationship)&&p.closeness<30)return `你进门时，${p.name}没再问“吃过没有”。饭菜罩在桌上，想说的话却越来越少。你总想着忙完这一阵再好好陪伴，可这一阵已经过了几年。关系${Math.round(p.closeness)}/100，低于30会持续增加压力、影响心情；低于15连续两年，对方也可能选择离开。`;
      if(topic==='relationship')return a.relationship==='single'?'朋友的邀约、独处的自在、对亲密关系的期待，都可以由你自己选择。认识一个人并不等于马上结婚。':a.relationship==='separated'?'关系已经结束。共同养育的责任与各自的新生活，仍需要慢慢安排。':`你与${p.name}已相处${year-p.since}年。关系${p.closeness}/100；${p.closeness<35?'最近的沉默和争执越来越多。':'相处需要日常的小事来维系。'}${a.relationship==='married'?'你们共同承担家庭开支。':'是否进入婚姻，可以慢慢商量。'}`;
      if(topic==='parents'){const e=this.weakest(s);return this.elders(s).map(e=>`${e.label}${year-e.birthYear}岁，身体状态${Math.round(e.health)}`).join('；')+`。${e.health<55?`${e.label}最近需要更多照护；安排会持续两年，届时再商量。`:'电话里总说“我们都好，你忙你的”。可上次回家，你看见他们上台阶时，悄悄扶了一下墙。' }`;}
      if(topic==='children')return a.children.length? a.children.map(c=>`${c.name}${year-c.birthYear}岁，亲近程度${Math.round(c.closeness)}/100`).join('；')+'。小时候总追着你讲个不停，如今有时只回一句“没什么”。你想知道，自己错过了多少没来得及听的小事。':a.relationship==='married'?'是否养育孩子、什么时候开始，由你们共同决定。选择养育后，费用、时间和关系都会持续变化。':'目前没有孩子。单身或交往阶段也有自己的生活重点，不会被自动推进婚育路线。';
      if(topic==='health')return `身体状态${s.stats.health}/100，压力${Math.round(a.stress)}/100。${a.exercise==='regular'?`规律运动已坚持${a.exerciseYears}年。`:'运动还没有成为稳定的习惯。'}${s.stats.health<25?'身体已难以支持满负荷工作，需要一段恢复时间。':'眼前的生活方式，会影响几年后的状态。'}`;
      if(topic==='housing')return s.life.home?`已有住房，未还贷款${s.life.home.balance.toFixed(1)}万。房子除了资产，也决定了你和家人如何生活。`:'曾经没买房，不代表以后不能重新安排。请结合储蓄、家庭和每年还款决定；继续租住也能认真经营生活。';
      if(topic==='transport')return a.car?`车龄${year-a.car.year}年，估值${a.car.value.toFixed(1)}万，贷款${a.car.balance.toFixed(1)}万。它方便通勤和照护，也需要持续花费。`:'公交、骑行和私家车各有代价。车能减少通勤与探亲负担，但每年都有持有费用。';
      if(topic==='work')return `你在${{industry:'技术岗位',company:'企业岗位',system:'公共服务岗位',boss:'自己的生意',biz:'商贸经营',apprentice:'学徒岗位'}[s.career]||'当前岗位'}积累了${s.life.experience[s.career]||0}年经验。${a.children.length?'孩子的日常也需要人照看。':a.relationship==='married'?'爱人也有自己的工作与安排。':'工作之外，你仍有自己的生活。'}努力如何分配，比单纯坚持更重要。`;
      if(topic==='single')return '没有婚姻并不意味着没有关系。老友、父母、兴趣与独处，都能让生活有自己的形状。';
      if(topic==='followup')return extra.message||'曾经作出的安排，正在日常里显出影响。';
      return '选择一个方向，看看眼下有哪些可行的安排；浏览菜单不会消耗一年。';
    },
    adapt(s,ev){if(ev.isHouseFork)return {...ev,...this.event(s,ev.year,'housing')};if(ev.isEra)return {...ev,...this.eraEvent(s,ev.year)};if(ev.isMarriageFork)return {...ev,...this.event(s,ev.year,'relationship')};if(ev.isParentIllnessFork)return {...ev,...this.event(s,ev.year,'parents')};return ev;},
    yearlyEvent(s,year){const a=this.init(s),age=year-s.birthYear;if(age<18||(age<23&&s.career==='student'))return null;
      if(s.stats.health<20)return this.event(s,year,'hospital');
      if(a.partner&&['dating','married'].includes(a.relationship)&&a.partner.closeness<30)return this.event(s,year,'relationship',{title:'关系进入危机：这次不能再用忙来搪塞'});
      if(s.stats.wealth<-5)return this.event(s,year,'debt');
      for(const f of a.followups)if(f.kind==='three-year'&&year>f.year+1)f.seen=true;
      const follow=a.followups.find(f=>!f.seen&&f.year<=year);if(follow)return this.event(s,year,'followup',{followId:follow.id,message:follow.message,title:'此前的选择，留在了生活里'});
      if(s.stats.health<30||a.stress>=80)return this.event(s,year,'health');
      if(a.partner&&['dating','married'].includes(a.relationship)&&a.partner.closeness<35&&year-(a.choices.relationship||0)>=2)return this.event(s,year,'relationship');
      const elder=this.weakest(s);if(elder.health<55&&(!elder.care||elder.care.until<year)&&year-(a.choices.parents||0)>=2)return this.event(s,year,'parents');
      const child=a.children.find(c=>[3,6,12,16].includes(year-c.birthYear)&&!a.seen['child-'+c.id+'-'+(year-c.birthYear)]);
      if(child)return this.event(s,year,'children',{childId:child.id,milestone:year-child.birthYear,title:`${child.name}${year-child.birthYear}岁了，陪伴也要换一种方式`});
      if([30,40].includes(age)&&!a.seen['memory-'+age])return this.event(s,year,'memory',{title:age===30?'箱底的练习本':'同学发来一段录音'});
      const cycle=['relationship','health','parents','transport','children','housing','work','single'];let topic=cycle[Math.max(0,age-23)%cycle.length];
      if(topic==='single'&&['dating','married'].includes(a.relationship))topic='work';
      if(topic==='children'&&!a.children.length&&a.relationship!=='married')topic='single';
      return this.event(s,year,topic);
    },
    options(s,ev,M){const a=this.init(s),year=ev.year,b=M.base(year),p=a.partner;
      const o=(id,text,extra={})=>({adultAction:id,text,effect:{},...extra});let out=[];
      if(ev.topic==='memory')out=[o('memory-call','【给那位老同学打个电话】留出这个晚上；亲友联系+8'),o('memory-practice','【把搁下的爱好重新捡起来】先试两年；每年少2%工作收入，压力-3'),o('memory-keep','【把本子收好，接着过日子】心情+3；不必把所有旧愿望都补完')];
      if(ev.topic==='hospital')return [o('hospital-care','【接受住院休养，安排工作交接】本年减少工作、增加恢复支出；家人或亲友协助')];
      if(ev.topic==='debt')out=[o('debt-budget','【先把周转稳住】本年基本生活支出少30%，暂停额外计划；心情-3'),...(a.car?[o('sell-car','【卖掉车，结清车贷】盘活现有资产，停止车辆持有费')]:[]),o('debt-repay','【按正常收入逐步偿还】压力+5；债务继续计息，不会自动清零')];
      if(ev.topic==='era'){
        const student=s.career==='student';
        out=student?[o('era-study','【调整学习安排，保持与老师同学联系】学识+4、压力-3'),o('era-family','【与家人一起稳住作息】健康+3，给学习和家人都留一点余地')]:[
          o('era-adapt',`${['boss','biz'].includes(s.career)?'【调整经营方式，联系老客户】':'【适应工作调整，学习新工具】'}花基础年收入5%，技能+3，缓和本年部分收入损失`),
          o('era-family','【把家人的安排先稳下来】本年工作收入再少10%，关系+6；分担照护、生活与孩子的需要'),
          o('era-hold','【先守住原来的工作与生活】不额外投入，承受时代变化带来的影响')];
        return out;
      }
      if(ev.topic==='hub')return ['relationship','parents','children','health','work','housing','transport',...(['single','separated'].includes(a.relationship)?['single']:[])].map(t=>({text:`【${titles[t]}】查看可以作的安排`,adultTopic:t,effect:{}}));
      if(ev.topic==='followup')return [o('acknowledge','【记住这段变化】带着这份经历继续生活')];
      if(ev.topic==='relationship'){
        if(['single','separated'].includes(a.relationship))out=[o('meet','【接受朋友介绍，慢慢认识】开始一段交往，之后再决定是否继续'),o('stay-single','【继续享受独身生活】把这一年留给老友和自己；社交+6、心情+3')];
        else{out=[o('couple-time',`【留出固定相处时间】本年工作收入少5%，关系+10、压力-5；花费${(b*.03).toFixed(2)}万`),o('couple-boundary','【商量各自的时间与分工】关系+5、压力-3，不把所有责任压给一个人'),o('couple-busy','【先把工作忙完】关系-7，问题仍会留到以后')];
          if(a.relationship==='dating'&&year-p.since>=1)out.unshift(o('marry','【商量好共同生活，简单成家】支出1万；以后共同承担生活开支', {req:{wealth:1}}));
          if(a.relationship==='dating'||p.closeness<35)out.push(o('separate','【认真谈过后，结束这段关系】共同预算结束；已有孩子的责任继续保留'));}
      }
      if(ev.topic==='single')out=[o('friends','【约老友见面，保持联系】社交+10、心情+5，花费基础年收入的3%'),o('hobby','【认真经营自己的爱好】压力-8、心情+6，花费基础年收入的4%'),...(['single','separated'].includes(a.relationship)?[o('meet','【愿意认识一个新的人】慢慢交往，不急于进入婚姻')]:[]),o('quiet','【好好过一个人的日常】散步、做饭、休息；健康+2、心情+2')];
      if(ev.topic==='parents'){
        const e=this.weakest(s);
        out=[o('visit-parents','【安排一次认真探望】与双方仍有联系的父母相处，关系+6；花费基础年收入4%'),o('call-parents','【固定联系，问问日常】关系+3，了解他们的生活，不只在出事时联系')];
        if(e.health<55)out.unshift(o('care-self',`【亲自多照顾${e.label}】未来两年工作收入少12%，照护费为基础年收入5%；老人恢复较快，你的压力增加`),o('care-paid',`【为${e.label}安排付费协助】未来两年每年照护费为基础年收入15%；减少亲自奔波`),o('care-share',`【与亲友协商轮流照护${e.label}】未来两年收入少5%、照护费为基础年收入8%；需社交或家人关系达到45`,{adultLocked:a.social<45&&s.life.bonds<45?'需要可协商的亲友支持':''}));
      }
      if(ev.topic==='children'){
        if(a.children.length){const c=a.children.find(c=>c.id===ev.childId)||a.children[0],age=year-c.birthYear;
          out=[o('child-time',`【陪${c.name}${age<6?'玩耍与照顾日常':age<12?'适应学校生活':'聊聊自己的想法'}】本年收入少8%，亲近+9，成长体验+4`),o('child-support',`【给${c.name}安排适合的活动】本年额外花费基础年收入8%，成长体验+6；亲自陪伴仍然重要`),o('child-listen',`【听${c.name}说，再一起作决定】亲近+5、压力-3，保留孩子自己的节奏`)];}
        else out=[o('no-child','【暂不养育孩子】保留两人或自己的生活安排，不设成败评价')];
        if(a.relationship==='married'&&a.children.length<2&&year-s.birthYear>=24&&year-s.birthYear<=42&&(!a.children.length||year-a.children.at(-1).birthYear>=3))out.push(o('have-child',`【共同决定${a.children.length?'再养育一个孩子':'开始养育孩子'}】一次准备支出1万，今后每年有养育费用；婴幼儿阶段伴侣工作安排也会变化`,{req:{wealth:1}}));
      }
      if(ev.topic==='health')out=[o('exercise','【建立规律运动习惯】以后每年健康+3、压力-4；工作收入少2%，花费基础年收入2%，坚持越久越容易感到变化'),o('recover',`【安排一段恢复期】本年收入少20%，健康+10、压力-12；${s.life.activePlan?'中断额外长期计划，':''}花费基础年收入6%`),o('slow-exercise','【先从日常步行做起】运动改为轻量，健康+2、压力-4'),o('push-through','【眼下继续硬撑】压力+8；状态太差时仍会被迫减少工作，无法靠选择取消身体限制')];
      if(ev.topic==='work'){
        const text={industry:'学习设备改进，减少返工',company:'把项目经验整理成自己的本领',system:'改进服务流程，学习业务',boss:'整理客户与成本，稳住经营',biz:'梳理供货和客户，减少无效奔波',apprentice:'跟师傅认真练一项手艺'}[s.career]||'继续积累工作经验';
        out=[o('work-skill',`【${text}】技能+4，本年收入少3%`),o('work-boundary','【与同事或合作方协商工作边界】本年收入少5%，压力-10；为家人和自己留出时间'),o('work-extra','【接下额外任务】本年工作收入多10%，压力+10；相处时间减少')];
      }
      if(ev.topic==='housing'){
        if(!s.life.home){const aid=M.aid(s),q=M.housing('julonghu',year),local=s.region?.id==='th'?'old_town':'self_built',v=M.housing(local,year);
          out=[o('house-mortgage',`【再考虑按揭安家】总价${q.price.toFixed(1)}万，首付${q.down.toFixed(1)}万、贷款${q.loan.toFixed(1)}万，20年；家庭支持最多${aid.toFixed(1)}万`,{req:{wealth:Math.max(0,q.down-aid)}}),o('house-local',`【在熟悉的地方安家】总投入${v.price.toFixed(1)}万，扣除可用家庭支持后全款支付`,{req:{wealth:Math.max(0,v.price-aid)}}),o('rent-care','【继续租住，也把家收拾好】花费0.2万，心情+4；保留迁移和现金的余地')];
        }else out=[o('home-maintain','【修整维护，把住处变得顺手】花费基础年收入8%，家人相处与心情各+4'),o('home-time','【在家一起吃顿饭或好好休息】心情+3，关系+3；不再增加住房投入')];
      }
      if(ev.topic==='transport')out=a.car?[o('keep-car',`【继续使用这辆车】每年承担养护${(b*.08).toFixed(2)}万${a.car.balance>0?'及还款':''}，换取通勤与照护的便利`),o('sell-car',`【卖车，改回公共交通】按当前估值${a.car.value.toFixed(1)}万出售并结清${a.car.balance.toFixed(1)}万车贷`)] : [o('car-cash','【全款买一辆家用车】支出5.5万；每年花基础年收入8%养护，通勤压力减少', {req:{wealth:5.5}}),o('car-loan','【贷款买家用车】首付2万、贷款3.5万，3年还清；每年还有养护费',{req:{wealth:2}}),o('transit','【继续公交、骑行或步行】不承担车辆费用，保留现金')];
      if(ev.topic!=='followup')out.push({text:'【我想安排另一件事】看看爱人、父母、孩子、工作、健康或房车',adultTopic:'hub',effect:{}});
      return out;
    },
    choose(s,ev,id,M){const a=this.init(s),year=ev.year,b=M.base(year),available=this.options(s,ev,M).find(o=>o.adultAction===id);
      if(!available||available.adultLocked||available.req&&Object.entries(available.req).some(([k,v])=>s.stats[k]<v))return false;
      this.begin(s,year);const p=a.partner,notes=[];let log='';
      const spend=n=>{s.stats.wealth=round(s.stats.wealth-n);},effect=(key,n)=>{s.stats[key]=clamp(s.stats[key]+n);},close=(who,n)=>{who.closeness=clamp(who.closeness+n);},stress=n=>{a.stress=clamp(a.stress+n);},work=n=>{a.yearEffect.income=(a.yearEffect.income??1)*n;};
      const follow=(years,message)=>a.followups.push({id:year+'-'+id,year:year+years,message,seen:false});
      if(id==='memory-call'){a.social=clamp(a.social+8);a.seen['memory-'+ev.age]=true;log='电话接通，你们先问了问家里。过了一会儿，才说起当年的事。挂断时，饭已经凉了。';follow(2,'老同学又发来一条消息，没有什么要紧的事。你们接着上次的话聊了几句。');}
      if(id==='memory-practice'){a.hobbyUntil=year+1;a.seen['memory-'+ev.age]=true;log='你把旧东西擦干净，放到桌上。第一晚只练了十分钟，手有些生。第二天，它还放在那里。';follow(2,'两年的空闲一点点攒起来，旧爱好又回到日常。没有因此换一种身份，只是有些晚上，你愿意把灯多留一会儿。');}
      if(id==='memory-keep'){effect('mood',3);a.seen['memory-'+ev.age]=true;log='你把本子合上，放回纸箱最上面。厨房的水开了，你起身去关火。';}
      if(id==='hospital-care'){a.yearEffect.hospital=true;M.cancelPlan(s,year);s.life.direction='health';s.life.directionYear=year;log='你把几项工作交给同事，收起手机。床头那袋换洗衣服叠得整齐，上面放着一只带盖的饭盒。';}
      if(id==='debt-budget'){s.life.recovery='budget';M.cancelPlan(s,year);effect('mood',-3);log='你缩减日常开支，暂停额外投入，先让周转逐渐回到能承受的范围。';}
      if(id==='debt-repay'){stress(5);log='你选择用正常收入逐步偿还欠款，利息和压力暂时仍在。';}
      if(id==='era-study'){effect('study',4);stress(-3);log='外面的变化打乱了日常，你重新安排学习，保持与老师同学的联系。';}
      if(id==='era-family'){if(M.working(s))work(.9);this.improveBonds(s,6);effect('health',3);stress(-3);a.yearEffect.eraFamily=true;log='你把家人的作息、联系与照护安排好，减少了当期工作投入，让这一段日子更有依靠。';}
      if(id==='era-adapt'){spend(b*.05);s.life.skill=clamp(s.life.skill+3);a.yearEffect.eraAdapt=true;log='你付出学习和调整成本，尝试适应变化；只能缓和部分冲击，不能把外部困难一笔抹去。';}
      if(id==='era-hold')log='你守住原来的工作安排，承受这一年的收入和生活变化。';
      if(id==='acknowledge'){const f=a.followups.find(f=>f.id===ev.followId);if(f)f.seen=true;log=ev.desc;}
      if(id==='meet'){
        if(!['single','separated'].includes(a.relationship))return false;
        a.relationship='dating';const name=s.gender==='female'?'林远':'林宁';a.partner={name,since:year,closeness:58,health:80,work:'在职',preference:M.random(s)<.5?'重视共同时间':'尊重独立空间'};
        a.inlaws=[{id:'partner-father',label:'爱人的父亲',birthYear:s.birthYear-29,health:80,closeness:50,care:null},{id:'partner-mother',label:'爱人的母亲',birthYear:s.birthYear-27,health:84,closeness:52,care:null}];log=`经朋友介绍，你开始认识${name}。对方${a.partner.preference}，你们决定慢慢了解。`;follow(2,`与${name}相识之后，生活中多了一个需要互相理解的人。关系是否走得长，还要看日常的相处。`);
      }
      if(id==='marry'){if(a.relationship!=='dating'||year-p.since<1)return false;a.relationship='married';p.marriedYear=year;spend(1);close(p,8);log=`你与${p.name}商量了开支和分工，开始共同生活。双方父母与日常预算也进入了新的安排。`;follow(1,'回想成家时的约定，再看看如今的关系、时间和家庭预算，下一步依然可以重新商量。');}
      if(id==='separate'){a.relationship='separated';stress(8);effect('mood',-5);log=`你与${p.name}认真谈过，结束了这段关系。${a.children.length?'孩子仍然需要你们分别承担照顾责任。':'接下来需要重新经营自己的日常。'}`;}
      if(id==='couple-time'){work(.95);spend(b*.03);close(p,p.preference==='重视共同时间'?12:10);stress(-5);log=`你和${p.name}吃完饭，没有马上起身。说了几件不大的事，收碗时水已经凉了。`;}
      if(id==='couple-boundary'){close(p,p.preference==='尊重独立空间'?7:5);stress(-3);log=`你与${p.name}把工作和家务摊开商量，重新分配了彼此承担的事情。`;}
      if(id==='couple-busy'){close(p,-7);log=`你把相处往后放，${p.name}感到被忽略；忙碌没有自动解决关系里的问题。`;}
      if(id==='stay-single'||id==='friends'){a.social=clamp(a.social+(id==='friends'?10:6));effect('mood',id==='friends'?5:3);if(id==='friends')spend(b*.03);log='你把时间留给自己与老友。没有进入婚姻，也仍在经营值得珍惜的关系。';}
      if(id==='hobby'){spend(b*.04);stress(-8);effect('mood',6);log='你认真经营起一项爱好，生活里多了工作之外值得期待的事情。';}
      if(id==='quiet'){effect('health',2);effect('mood',2);log='你做饭、散步，整理住处，把一个人的日常过得踏实。';}
      if(id==='visit-parents'||id==='call-parents'){for(const e of this.elders(s))close(e,id==='visit-parents'?6:3);if(id==='visit-parents')spend(b*.04);log=id==='visit-parents'?'父亲往你碗里夹菜。饭后一起下楼，他在台阶前停了一下。你也停下，等他把鞋带系好。':'电话那头说，没什么事，就是问问。你没有挂，听他们说完菜价和邻居家的小事。';}
      if(id.startsWith('care-')){const e=this.weakest(s);if(e.health>=55)return false;e.care={mode:id.slice(5),until:year+1};close(e,6);s.parentSacrifice=true;log=`你为${e.label}安排了${{self:'亲自照护',paid:'付费协助',share:'亲友轮流协助'}[e.care.mode]}，会持续到${year+1}年；费用与时间将在每年体现。`;follow(2,`此前为${e.label}安排的两年照护告一段落。老人当前的身体、关系与自己的负担，都需要重新看看。`);}
      if(id==='no-child'){a.childPlan='not-now';log='你暂时没有选择养育，把当前的生活安排放在前面。这个决定不需要被判成失败。';}
      if(id==='have-child'){if(a.relationship!=='married')return false;spend(1);const c={id:'child-'+(a.children.length+1),name:a.children.length?'小禾':'小满',birthYear:year,closeness:65,growth:50};a.children.push(c);a.childPlan='parenting';stress(8);log=`你们共同决定养育${c.name}。新的家庭成员到来，未来的开支、陪伴与工作分工都会持续改变。`;follow(1,`${c.name}来到家里后的第一年，睡眠、开支和相处时间都发生了变化。养育不是一次点击，往后还要一起慢慢学。`);}
      if(id.startsWith('child-')){const c=a.children.find(c=>c.id===ev.childId)||a.children[0];if(!c)return false;if(id==='child-time'){work(.92);close(c,9);c.growth=clamp(c.growth+4);log=`你留出时间陪${c.name}度过这个阶段，收入少了一点，但彼此更愿意说话了。`;}if(id==='child-support'){a.yearEffect.childExtra=(a.yearEffect.childExtra||0)+b*.08;c.growth=clamp(c.growth+6);log=`你为${c.name}安排了适合的活动，也提醒自己：费用不能代替真正的相处。`;}if(id==='child-listen'){close(c,5);stress(-3);log=`你放下手机，听${c.name}把那件小事从头说完。孩子说到一半抬头确认你还在听，后面的话便一点点多了起来。`;}if(ev.milestone)a.seen['child-'+c.id+'-'+ev.milestone]=true;}
      if(id==='exercise'){const fresh=a.exercise!=='regular';a.exercise='regular';if(fresh)a.exerciseYears=0;log='你把规律运动写进日常安排。它需要持续投入时间，效果会在往后的年份慢慢出现。';if(fresh)follow(3,'几年前，你曾决定建立运动习惯。现在是否还在坚持、身体与压力怎样，都值得回头看一看。');}
      if(id==='recover'){work(.8);a.yearEffect.healthCost=b*.06;effect('health',10);stress(-12);M.cancelPlan(s,year);log='你安排了一段恢复时间，暂停额外负担；收入受到影响，但开始给身体留下恢复的余地。';}
      if(id==='slow-exercise'){a.exercise='occasional';effect('health',2);stress(-4);log='你先从日常步行做起，给紧绷的生活留出一点空间。';}
      if(id==='push-through'){stress(8);log='你仍把眼前工作放在前面。身体的限制不会因此消失，之后可能被迫降低工作负荷。';}
      if(id==='work-skill'){s.life.skill=clamp(s.life.skill+4);work(.97);log='你把岗位经历整理成能反复使用的本领，短期收入少了一些，技能却留了下来。';}
      if(id==='work-boundary'){work(.95);stress(-10);if(p&&['dating','married'].includes(a.relationship))close(p,3);log='你协商减少无效加班，把工作边界说清楚，给自己的生活腾出空间。';}
      if(id==='work-extra'){work(1.1);stress(10);if(p&&['dating','married'].includes(a.relationship))close(p,-4);for(const c of a.children)close(c,-3);log='你接下额外任务，收入增加；爱人、孩子或自己的休息时间受到挤占。';}
      if(id==='house-mortgage'||id==='house-local'){if(!M.buy(s,id==='house-mortgage'?'julonghu':s.region?.id==='th'?'old_town':'self_built',year))return false;log=`你在${year}年重新安排了住房。${s.life.home.balance?'每年还款开始进入日常预算。':'全款安家，留下了一个熟悉的落脚处。'}`;follow(2,'安家两年，房子的意义已经进入通勤、相处和每年的收支。估值并不等于手头可以花的钱。');}
      if(id==='rent-care'){spend(.2);effect('mood',4);log='你继续租住，也认真收拾这个暂时的家，保留资金和迁移的余地。';}
      if(id==='home-maintain'){spend(b*.08);effect('mood',4);this.improveBonds(s,4);log='你修整了住处，让日常用起来更顺手，家不只是账本上的一个价格。';}
      if(id==='home-time'){effect('mood',3);this.improveBonds(s,3);const memory=s.logs?.find(r=>r.age>=7&&r.age<=13&&!r.title.includes('重心'));log='你在家好好吃饭和休息，没有再增加住房投入。'+(memory?`饭后想起小时候的一幕：${memory.text} 窗外有车经过。你把碗放进水池，水龙头开得很小。`:'');}
      if(id==='car-cash'||id==='car-loan'){if(a.car)return false;const loan=id==='car-loan';spend(loan?2:5.5);a.car={year,value:5.5,balance:loan?3.5:0,payment:loan?3.5*.06/(1-Math.pow(1.06,-3)):0,paidYears:0};log=`你${loan?'贷款':'全款'}添置了一辆家用车。以后通勤和照护方便一些，也有每年的养护${loan?'与还款':''}。`;follow(2,'用车两年，便利和费用都真实留在了生活里。是否继续持有，可以再按当前需要决定。');}
      if(id==='sell-car'){if(!a.car)return false;s.stats.wealth=round(s.stats.wealth+a.car.value-a.car.balance);a.car=null;log='你按当前估值卖车并结清余款，回到公共交通，停止以后的车辆支出。';}
      if(id==='keep-car')log='你继续使用这辆车，承担持有费用，也保留通勤与照护的便利。';
      if(id==='transit')log='你继续公交、骑行或步行，把这部分现金留给其他生活需要。';
      if(!log)return false;
      const times=a.actionCounts[id]||0;a.actionCounts[id]=times+1;
      if(id==='couple-time'&&times%3===1)log=`晚上你和${p.name}出门走了走。到路口时，谁也没有急着往回拐。`;
      if(id==='couple-time'&&times%3===2)log=`你比平时早些到家，${p.name}正在晾衣服。你接过两只衣架，把窗边的位置让出来。`;
      if(id==='call-parents'&&times%2===1)log='电话接通，先听见电视声。你问今天吃了什么，父母说了几样，又问你吃了没有。';
      if(id==='visit-parents'&&times%2===1)log='临走时，母亲往袋子里又放了一把青菜。你说够了，她还是把袋口系紧，送到门外。';
      a.choices[ev.topic]=year;a.feedback={year,title:titles[ev.topic]||'生活的回响',text:log};return {log};
    },
    annual(s,year,M,income){const a=this.init(s);this.begin(s,year);const age=year-s.birthYear,b=M.base(year),focus=s.life.focus,p=a.partner;
      let partnerIncome=0,childExpense=0,careExpense=0,carExpense=0,healthExpense=0,extraLiving=0;const notes=[],working=M.working(s),active=s.life.plans.find(p=>p.start<=year&&p.end>=year&&(p.status!=='interrupted'||p.finished>year));
      if(age<18)return {income,expense:0,partnerIncome,childExpense,careExpense,carExpense,healthExpense,notes,recoveryLeave:false};
      income*=a.yearEffect.income??1;
      const hospitalized=s.stats.health<20||!!a.yearEffect.hospital;
      const recoveryLeave=working&&(hospitalized||a.stress>=90);
      if(recoveryLeave){income*=.45;s.stats.health=clamp(s.stats.health+14);a.stress=clamp(a.stress-14);notes.push('精力透支后被迫减少工作，开始恢复；本年劳动收入大幅下降。');}
      if(hospitalized){healthExpense+=b*.18;if(!working)s.stats.health=clamp(s.stats.health+14);a.hospitalizedYears.push(year);M.cancelPlan(s,year);notes.push('身体跌破20的警戒线，住院观察与休养增加了恢复费用，额外计划暂停。');}
      const era=this.era(s,year);
      if(era){income*=Math.min(1,era.incomeFactor+(a.yearEffect.eraAdapt?.1:0));a.stress=clamp(a.stress+era.stress);if(!a.yearEffect.eraFamily)this.improveBonds(s,-2);notes.push(era.notice);if(a.children.some(c=>year-c.birthYear>=6&&year-c.birthYear<18)&&year===2020){a.stress=clamp(a.stress+6);notes.push('孩子的学习安排变化，陪伴、设备和工作时间需要重新分配。');}}
      if(s.stats.wealth<0){a.stress=clamp(a.stress+(s.stats.wealth<-5?8:3));if(s.stats.wealth<-5){M.cancelPlan(s,year);notes.push('周转欠款超过5万，额外长期计划暂停，资金压力开始侵占生活。');}}
      a.stress=clamp(a.stress+(focus==='work'?7:focus==='health'?-5:focus==='family'?-2:1)+(working&&['boss','biz'].includes(s.career)?2:0));
      if(a.hobbyUntil>=year){income*=.98;a.stress=clamp(a.stress-3);notes.push('这年仍给旧爱好留了一点时间。');}
      if(a.exercise==='regular'){income*=.98;healthExpense+=b*.02;s.stats.health=clamp(s.stats.health+3);a.stress=clamp(a.stress-4);a.exerciseYears++;if(a.exerciseYears===3)notes.push('规律运动坚持三年，体力与压力逐渐呈现改善。');}
      if(a.stress>65){s.stats.health=clamp(s.stats.health-3);s.stats.mood=clamp(s.stats.mood-2);notes.push('长期压力侵占休息，身体和心情都受到了影响。');}
      healthExpense+=a.yearEffect.healthCost||0;
      if(p&&['dating','married'].includes(a.relationship)){
        const delta=focus==='family'?5:focus==='work'?-5:-1;p.closeness=clamp(p.closeness+delta+(active?.kind==='relocate'?-4:active?.kind==='care'?3:0));
        if(p.closeness<15){a.distanceYears=(a.distanceYears||0)+1;}else a.distanceYears=0;
        if(a.distanceYears>=2){a.relationship='separated';a.distanceYears=0;notes.push(`${p.name}决定结束长期疏离的关系。共同收入停止，已有孩子的照顾责任仍然保留。`);}
        if(p.closeness<30){s.stats.mood=clamp(s.stats.mood-4);a.stress=clamp(a.stress+3);notes.push(`${p.name}感到相处越来越少，关系中的疏离开始影响日常。`);}
        if(p.closeness>=75){s.stats.mood=clamp(s.stats.mood+2);a.stress=clamp(a.stress-2);notes.push(`与${p.name}的相互支持，缓和了这一年的压力。`);}
        if(a.relationship==='married'){const young=a.children.some(c=>year-c.birthYear<3);partnerIncome=b*.68*(young?.65:1);partnerIncome*=era?.partnerFactor??1;extraLiving=b*.28;p.work=young?'阶段性减少工作，参与育儿':'在职';if(young)notes.push(`${p.name}阶段性减少工作，家庭收入与育儿分工一起发生变化。`);}
      }else{a.social=clamp(a.social+(focus==='work'?-3:focus==='family'?3:0));if(a.social<25){s.stats.mood=clamp(s.stats.mood-2);notes.push('与老友联系少了，独处开始变得有些孤单。');}}
      for(const c of a.children){const ca=year-c.birthYear;childExpense+=b*(ca<3?.18:ca<6?.14:ca<18?.2:.12);c.closeness=clamp(c.closeness+(focus==='family'?5:focus==='work'?-4:-1));c.growth=clamp(c.growth+(c.closeness>=60?2:1));if(ca<3)a.stress=clamp(a.stress+4);if([3,6,12,16].includes(ca))notes.push(`${c.name}${ca}岁了，进入了新的成长阶段。`);if(c.closeness<30)notes.push(`${c.name}不太愿意说起自己的事情，需要更多倾听。`);}
      childExpense+=a.yearEffect.childExtra||0;
      for(const e of this.elders(s)){const ea=year-e.birthYear;e.health=clamp(e.health-(ea>=65?1.4:ea>=55?.9:.4));if(ea>=55&&M.random(s)<.09){e.health=clamp(e.health-9);notes.push(`${e.label}这一年身体状态下滑，需要重新看看照护安排。`);}
        e.closeness=clamp(e.closeness+(focus==='family'?2:focus==='work'?-2:-.5));
        if(e.care&&e.care.until>=year){const mode=e.care.mode;careExpense+=b*({self:.05,paid:.15,share:.08}[mode]);income*=({self:.88,paid:1,share:.95}[mode]);e.health=clamp(e.health+(mode==='self'?2.5:1.7));e.closeness=clamp(e.closeness+2);a.stress=clamp(a.stress+(mode==='self'?4:1)-(a.car?1:0));notes.push(`${e.label}的${{self:'亲自照护',paid:'付费协助',share:'轮流照护'}[mode]}仍在继续，占用这一年的费用与时间。`);}
        else if(e.health<50){a.stress=clamp(a.stress+3);notes.push(`${e.label}仍缺少稳定的照护安排，你也感到牵挂。`);}
      }
      if(a.car){const car=a.car;carExpense=b*.08;if(car.balance>0){const interest=car.balance*.06,principal=Math.min(car.balance,Math.max(0,car.payment-interest));carExpense+=principal+interest;car.balance=round(Math.max(0,car.balance-principal));car.paidYears++;if(car.paidYears>=3)car.balance=0;}car.value=round(car.value*.85);a.stress=clamp(a.stress-3);s.stats.health=clamp(s.stats.health+1);if(this.elders(s).some(e=>e.care&&e.care.until>=year))notes.push('车让探望与照护少了一些来回奔波。');}
      if(active?.kind==='care'){for(const e of this.elders(s))e.closeness=clamp(e.closeness+2);for(const c of a.children)c.closeness=clamp(c.closeness+3);}
      const bonds=[...this.elders(s).map(e=>e.closeness),...a.children.map(c=>c.closeness),...(p&&['dating','married'].includes(a.relationship)?[p.closeness]:[])];s.life.bonds=Math.round(bonds.reduce((x,y)=>x+y,0)/bonds.length);
      if(!a.streak||a.streak.focus!==focus){a.streak={focus,start:year,years:0,health:s.life.yearBaseline?.health??s.stats.health,skill:s.life.yearBaseline?.skill??s.life.skill,bonds:s.life.yearBaseline?.bonds??s.life.bonds,cash:s.stats.wealth};}
      a.streak.years++;
      if(a.streak.years%3===0){const t=a.streak,message=`连续三年（${year-2}—${year}）以“${M.focuses[focus]}”为重心：健康 ${t.health}→${s.stats.health}，技能 ${t.skill}→${s.life.skill}，亲友关系 ${t.bonds}→${s.life.bonds}。${focus==='work'?'工作经验在积累，身体与相处的代价也已经出现。':focus==='family'?'陪伴渐渐成为相互支持，收入也付出了时间成本。':focus==='health'?'留给身体的时间已形成积累，工作收入相应减少。':focus==='learn'?'学习积累了能力，新的职业机会仍需自己选择。':'没有剧烈跳跃，日常也在逐步改变你。'}`;notes.unshift(message);a.followups.push({id:'streak-'+year,kind:'three-year',year:year+1,message,seen:false});t.health=s.stats.health;t.skill=s.life.skill;t.bonds=s.life.bonds;t.cash=s.stats.wealth;}
      a.notices=notes.slice();return {income,partnerIncome:round(partnerIncome),childExpense:round(childExpense),careExpense:round(careExpense),carExpense:round(carExpense),healthExpense:round(healthExpense),extraLiving:round(extraLiving),expense:childExpense+careExpense+carExpense+healthExpense+extraLiving,notes,recoveryLeave,hospitalized};
    },
    era(s,year){
      if(![2003,2020,2021,2022].includes(year))return null;
      const sars=year===2003,student=s.career==='student',business=['boss','biz'].includes(s.career),service=s.career==='system';
      return {incomeFactor:student?1:sars?(business?.85:service?1:.95):year===2021?(business?.9:service?1:.96):(business?.68:service?1:.85),partnerFactor:sars?.97:year===2021?.95:.88,stress:sars?4:service?12:8,
        description:`${sars?'2003年，非典改变了许多人的日常。':'疫情期间，工作、出行、家庭与学习的安排都可能受到影响。'}${student?'你还在学习阶段，最直接面对的是学习节奏和家人的担心。':business?'你已经工作并自主经营，客源与订单变化直接影响现金周转。':service?'你已经在公共服务岗位工作，收入较稳定，工作负担和家庭时间却受到挤压。':'你已经工作，订单、岗位安排与收入受到冲击。'}${s.adult?.children.length?'孩子与老人的日常也需要重新协调。':''}具体数值是游戏情境，不代表每个行业或家庭的真实经历。`,
        notice:sars?'非典期间，学习或工作的节奏改变，担忧和联系家人的需要增加。':service?'疫情期间，公共服务工作负担加重，收入相对稳定但压力上升。':business?'疫情冲击客源与订单，经营收入收缩；原有房贷、养育和照护费用继续。':'疫情影响岗位与收入，家庭日常和照护仍要继续。'};
    },
    eraEvent(s,year){return [2003,2020,2022].includes(year)?this.event(s,year,'era',{title:year===2003?'2003 · 非典改变了日常':year===2020?'2020 · 原来的生活突然停了一拍':'2022 · 持续变化中重新安排生活'}):null;},
    summary(s,year=2026){const a=this.init(s),p=a.partner;return `亲密关系：${a.relationship==='single'?'保持单身':a.relationship==='separated'?'结束一段关系后继续生活':`${a.relationship==='married'?'与':'正在与'}${p.name}${a.relationship==='married'?'共同生活':'交往'}，关系${Math.round(p.closeness)}/100`}。${a.children.length?'孩子：'+a.children.map(c=>`${c.name}${year-c.birthYear}岁，亲近${Math.round(c.closeness)}/100`).join('；'):'目前没有孩子'}。\n父母与照护：${this.elders(s).map(e=>`${e.label}${year-e.birthYear}岁，身体状态${Math.round(e.health)}${e.care&&e.care.until>=year?'（有持续照护）':''}`).join('；')}。\n日常：${a.exercise==='regular'?`规律运动${a.exerciseYears}年`:'轻量或不定期运动'}，压力${Math.round(a.stress)}/100；${a.car?`有一辆家用车，估值${a.car.value.toFixed(1)}万、贷款${a.car.balance.toFixed(1)}万`:'公共交通、骑行或步行'}。`;}
  };
  if(typeof module!=='undefined'&&module.exports)module.exports=A;else root.AdultLife=A;
})(typeof window!=='undefined'?window:globalThis);
