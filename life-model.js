/* 盐阜潮涌：平衡用虚构模型，金额单位万元。没有采用真实人口或房产预测。 */
(function(root){
  'use strict';
  const names={student:'在校学习',apprentice:'学徒',industry:'工业技术',company:'企业职员',system:'公共服务',boss:'自主经营',biz:'商贸经营'};
  const focuses={balanced:'平衡生活',learn:'进修学习',work:'投入工作',family:'陪伴家人',health:'锻炼休息'};
  const clamp=n=>Math.max(0,Math.min(100,n));
  const round=n=>Math.round(n*10000)/10000;
  const model={names,focuses,
    init(s,seed){
      if(s.life)return s.life;
      s.life={seed:(seed ?? Math.floor(Math.random()*4294967296))>>>0,focus:'balanced',skill:15,bonds:50,
        experience:{industry:0,company:0,system:0,boss:0,biz:0,apprentice:0},careers:[],ledger:[],year:null,open:0,
        home:null,aidUsed:false,focusYears:{balanced:0,learn:0,work:0,family:0,health:0},promotions:[],highestLevels:{},investments:[],qualifications:[],activePlan:null,plans:[],turningYears:{}};
      return s.life;
    },
    random(s){const l=this.init(s);l.seed=(Math.imul(l.seed,1664525)+1013904223)>>>0;return l.seed/4294967296;},
    // Model income baseline in 万元/year, linearly interpolated, not the historical wage table.
    base(year){const knots=[[1995,0.8],[2000,1.2],[2005,2.2],[2010,3.8],[2015,5.6],[2020,7.5],[2026,8.5]];
      if(year<=knots[0][0])return knots[0][1];
      for(let i=1;i<knots.length;i++){let [y,v]=knots[i], [py,pv]=knots[i-1];if(year<=y)return pv+(v-pv)*(year-py)/(y-py);}return 8.5;
    },
    begin(s,year){const l=this.init(s);if(l.year===year)return;l.year=year;l.open=s.stats.wealth;l.focus='balanced';l.recovery=null;},
    degree(s){return ['graduated'].includes(s.education)||s.education==='university'&&s.graduationAge!==null&&s.graduationAge<=((s.life?.year||s.birthYear)-s.birthYear);},
    working(s){return s.career!=='student'&&s.education!=='university'&&s.education!=='repeat';},
    level(s,career=s.career){const l=this.init(s),xp=l.experience[career]||0;return xp>=15&&l.skill>=65?3:xp>=8&&l.skill>=45?2:xp>=3&&l.skill>=25?1:0;},
    jobLabel(s){return `${names[s.career]||s.career} · ${['起步','熟练','骨干','资深'][this.level(s)]}`;},
    changeCareer(s,next,year){const l=this.init(s),old=s.career;
      if(next===old&&l.careers.length)return;
      if(old!=='student'&&!l.careers.length)l.careers.push({year,career:old});
      s.career=next;
      if(next!=='student' && (!l.careers.length||l.careers.at(-1).career!==next))l.careers.push({year,career:next});
    },
    housing(kind){return kind==='julonghu'?{price:42,down:13,loan:29,rate:0.045,years:20}:kind==='old_town'?{price:12,down:12,loan:0,rate:0,years:0}:{price:8,down:8,loan:0,rate:0,years:0};},
    aid(s){return s.life?.aidUsed?0:Math.max(0,s.family?.houseHelp??2);},
    buy(s,kind,year){const l=this.init(s);if(l.home)return false;const q=this.housing(kind),aid=Math.min(this.aid(s),q.down);
      if(s.stats.wealth+aid<q.down)return false;
      s.stats.wealth=round(s.stats.wealth+aid-q.down);l.aidUsed=true;
      l.home={kind,year,price:q.price,value:q.price,balance:q.loan,rate:q.rate,paidYears:0,years:q.years,
        payment:q.loan?q.loan*q.rate/(1-Math.pow(1+q.rate,-q.years)):0};
      s.houseBought=true;s.houseType=kind;return true;
    },
    netWorth(s){const h=this.init(s).home;return round(s.stats.wealth+(h?h.value-h.balance:0));},
    planInfo(kind){return {retrain:{label:'两年在职进修',years:2,cost:0.5},relocate:{label:'三年异地工作',years:3,cost:1},side:{label:'两年副业尝试',years:2,cost:1.5},care:{label:'两年家庭陪伴',years:2,cost:0}}[kind];},
    startPlan(s,kind,year){const l=this.init(s),q=this.planInfo(kind);if(!q||l.activePlan||!this.working(s)||(q.cost>0&&s.stats.wealth<q.cost)||(kind==='side'&&l.skill<35)||(['side','relocate'].includes(kind)&&s.career==='system')||kind==='relocate'&&!['industry','company','apprentice'].includes(s.career))return false;
      s.stats.wealth=round(s.stats.wealth-q.cost);const p={id:year+'-'+kind,kind,label:q.label,start:year,end:year+q.years-1,status:'active',seen:false,career:s.career};l.activePlan=p;l.plans.push(p);return true;},
    cancelPlan(s,year){const l=this.init(s);if(l.activePlan){l.activePlan.status='interrupted';l.activePlan.finished=year;l.activePlan.seen=true;l.activePlan=null;}},
    chance(s){const l=this.init(s);return Math.min(.85,.4+l.skill/250+l.bonds/1000);},
    settle(s,year){const l=this.init(s),existing=l.ledger.find(r=>r.year===year);if(existing)return existing;
      this.begin(s,year);const age=year-s.birthYear,events=round(s.stats.wealth-l.open);
      let income=0,living=0,tuition=0,rent=0,mortgage=0,interest=0,principal=0,training=0,planExpense=0,planChange=0,shock='';
      const work=this.working(s),focus=l.focus,base=this.base(year),previous=this.level(s);
      if(age>=18){
        living=base*0.45;tuition=s.education==='university'?base*0.22:s.education==='repeat'?base*0.15:0;
        rent=!l.home?(s.career==='student'?base*0.08:base*0.16):base*0.035;
        training=focus==='learn'?base*0.06:0;
        if(work){
          if(!l.careers.length)l.careers.push({year,career:s.career});
          const multiplier={apprentice:0.55,industry:1,company:1.05,system:1,boss:1.15,biz:1.12}[s.career]||1;
          const educationBonus=this.degree(s)?1.12:1;
          income=base*multiplier*(1+previous*0.14)*educationBonus*(focus==='work'?1.18:focus==='family'?0.9:focus==='learn'?0.94:focus==='health'?0.92:1);
          if(s.career==='boss'||s.career==='biz'){
            const risk=this.random(s);let factor=risk<0.18?0.35:risk<0.4?0.8:risk>0.82?1.5:1;
            if([2008,2020,2022].includes(year))factor*=0.75;
            income*=factor;shock=factor<0.8?'经营订单减少':factor>1.2?'经营订单增加':'经营平稳';
          }else if((s.career==='company'||s.career==='industry')&&[2008,2020,2022].includes(year)){
            income*=0.88;shock='行业调整，收入承压';
          }
          if(l.recovery==='health')income*=0.75;
          if(l.recovery==='family')income*=0.9;
          if(s.stats.health<30){income*=0.72;shock+=' · 身体不适，减少工作';}
          l.experience[s.career]=(l.experience[s.career]||0)+1;
          l.skill=clamp(l.skill+(focus==='learn'?7:focus==='work'?3:2));
        }else if(s.education==='university'){l.skill=clamp(l.skill+(focus==='learn'?6:3));}
        if(focus==='learn')s.stats.study=clamp(s.stats.study+4);
        s.stats.health=clamp(s.stats.health+(focus==='health'?6:focus==='work'?-5:-1));
        s.stats.mood=clamp(s.stats.mood+(focus==='family'?4:focus==='health'?3:focus==='work'?-3:0));
        l.bonds=clamp(l.bonds+(focus==='family'?6:focus==='work'?-3:-1));l.focusYears[focus]++;
        if(l.skill>=45&&!l.qualifications.length)l.qualifications.push({year,label:'专业技能进阶'});
        const p=l.activePlan;
        if(p&&year>=p.start&&year<=p.end){
          if(p.kind==='retrain'){income*=0.9;planExpense=base*0.1;l.skill=clamp(l.skill+5);}
          if(p.kind==='relocate'){income*=1.25;planExpense=base*0.12;l.bonds=clamp(l.bonds-3);}
          if(p.kind==='side'){const success=this.random(s)<this.chance(s);planChange=base*(success?0.25:-0.15);if(success)income+=planChange;else planExpense-=planChange;s.stats.health=clamp(s.stats.health-3);l.bonds=clamp(l.bonds-2);shock+=(shock?' · ':'')+(success?'副业有结余':'副业经营亏损');}
          if(p.kind==='care'){income*=0.85;planExpense=base*0.03;l.bonds=clamp(l.bonds+5);s.stats.mood=clamp(s.stats.mood+2);}
          if(year===p.end){p.status='completed';p.finished=year;l.activePlan=null;if(p.kind==='retrain')l.qualifications.push({year,label:'在职进修结业'});}
        }
        if(l.bonds<25)s.stats.mood=clamp(s.stats.mood-2);
        const current=this.level(s),recorded=l.highestLevels[s.career]||0;
        if(work&&current>recorded){l.promotions.push({year,career:s.career,level:current});l.highestLevels[s.career]=current;}
      }
      const h=l.home;
      if(h){
        if(h.balance>0){interest=h.balance*h.rate;principal=Math.min(h.balance,h.payment-interest);mortgage=principal+interest;h.balance=Math.max(0,round(h.balance-principal));h.paidYears++;if(h.paidYears>=h.years)h.balance=0;}
        const growth=h.kind==='self_built'?0.005:year<=2020?0.035:year<=2023?0:-0.035;
        h.value=round(h.value*(1+growth));
      }
      if(l.recovery==='budget')living*=0.7;
      const debtInterest=Math.max(0,-s.stats.wealth)*0.04;
      const expense=round(living+tuition+rent+mortgage+training+planExpense+debtInterest);
      income=round(income);s.stats.wealth=round(s.stats.wealth+income-expense);
      const r={year,age,focus,career:s.career,level:this.level(s),open:l.open,events,income,expense,close:s.stats.wealth,
        living:round(living),tuition:round(tuition),rent:round(rent),mortgage:round(mortgage),interest:round(interest),principal:round(principal),
        training:round(training),planExpense:round(planExpense),planChange:round(planChange),plan:l.plans.find(p=>year>=p.start&&year<=p.end&&(p.finished===undefined||year<=p.finished))?.label||'',debtInterest:round(debtInterest),netWorth:this.netWorth(s),shock,skill:l.skill,bonds:l.bonds};
      l.ledger.push(r);return r;
    },
    summary(s){const l=this.init(s),edu=this.degree(s)?'完成本科学业':s.schoolTrack==='zhongzhuan'?'完成中专学习':s.schoolTrack==='tech'?'从技校起步':s.schoolTrack==='apprentice'?'跟随亲友学徒起步':'从高中学习起步';
      const history=l.careers.map(c=>`${c.year}年${names[c.career]||c.career}`).join(' → ')||'尚无就业记录';
      const h=l.home,housing=h?`住房估值${h.value.toFixed(1)}万，剩余房贷${h.balance.toFixed(1)}万`:'租住生活，未持有房产';
      const plans=l.plans.map(p=>`${p.start}年${p.label}（${{active:'仍在继续',completed:'已完成',interrupted:'中途调整'}[p.status]}）`).join('；')||'没有安排额外的长期计划';
      return `教育：${edu}。职业：${history}。\n累计${Object.values(l.experience).reduce((a,b)=>a+b,0)}年工作/学徒经验，专业技能${l.skill}/100，${l.promotions.length}次成长进阶。\n成年后的打算：${plans}。\n陪伴：${l.focusYears.family}年把家人放在年度重心，关系状态${l.bonds}/100。${s.parentSacrifice?'曾共同承担亲人的治疗与照护。':''}\n健康${s.stats.health}/100，心情${s.stats.mood}/100。\n现金余额${s.stats.wealth.toFixed(1)}万${s.stats.wealth<0?'（负数为周转欠款）':''}；${housing}；模拟净资产${this.netWorth(s).toFixed(1)}万。人生不由一项分数定论。`;
    }
  };
  if(typeof module!=='undefined'&&module.exports)module.exports=model;else root.LifeModel=model;
})(typeof window!=='undefined'?window:globalThis);
