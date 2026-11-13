/* All numeric economic inputs are invented, normalized model units. */
(function(root){
const regions=[
{id:'britain',name:'Britain',sub:'Mills, coal & merchant finance',x:330,y:230,base:140,tech:68,shares:[.46,.25,.29],retention:8,path:'M320 122l21 27-10 25 18 19-8 22 22 21-9 27-32 13-27-16 20-24-8-23 14-21-13-20z'},
{id:'france',name:'France',sub:'Farms, workshops & commerce',x:400,y:390,base:110,tech:49,shares:[.30,.47,.23],retention:1,path:'M350 315l49-10 39 25 37 5 10 42-27 36-7 45-45 6-27-24-39-9-6-49z'},
{id:'german',name:'German lands',sub:'Many states, linked economies',x:560,y:300,base:95,tech:45,shares:[.32,.45,.23],retention:-2,path:'M488 242l42-23 43 8 25 30 42 3-4 43-28 26-20 34-53-14-14-31-43-18z'},
{id:'iberia',name:'Iberia',sub:'Land, textiles & Atlantic ports',x:269,y:501,base:78,tech:34,shares:[.20,.58,.22],retention:-7,path:'M213 442l47-12 50 14 38 17-13 49-19 43-58 11-54-29-8-48z'}];
// Independent invented examples, not a division of the legacy Iberia totals.
regions.push({id:'portugal',name:'Portugal',sub:'Independent illustrative example',x:0,y:0,base:42,tech:31,shares:[.23,.51,.26],retention:0},{id:'spain',name:'Spain',sub:'Independent illustrative example',x:0,y:0,base:88,tech:37,shares:[.27,.49,.24],retention:0});
const sectors=[{name:'Manufacturing',short:'Mills & workshops',jobs:['Spinners & artisans','Mill proprietors'],tech:1.05},{name:'Agriculture',short:'Farms & estates',jobs:['Farm labourers','Landowners'],tech:.8},{name:'Services & banking',short:'Shops, shipping & credit',jobs:['Clerks & porters','Merchants & bankers'],tech:.9},{name:'Rail transport',short:'Experimental new sector',jobs:['Railway workers','Railway investors'],tech:1.2}];

function economy(id,year=1820){
const r=regions.find(r=>r.id===id);const t=(year-1820)/40;
// Pure visual interpolation between invented endpoints, NOT economic dynamics.
const produced=r.base*(1+.5*t);const transfer=r.retention*(1+.2*t);const retained=produced+transfer;
const wageShare=.49;const taxRate=.07;const rail=year>=1830?.06:0;
const rows=sectors.slice(0,rail?4:3).map((s,i)=>{const share=i===3?rail:r.shares[i]*(1-rail);const output=produced*share;const income=retained*share;const wages=income*wageShare;const capital=income-wages;const taxes=income*taxRate;const basket=40*share*(1+.1*t);
const workerNet=wages*(1-taxRate),ownerNet=capital*(1-taxRate);
const workerAssets=(14+22*t)*share*r.base/100,ownerAssets=(210+145*t)*share*r.base/100;
const workerDebt=5*share,ownerDebt=35*share;
return {...s,share,output,income,wages,capital,taxes,basket,technology:Math.min(100,r.tech*s.tech+20*t),productivity:output/(share*100),worker:{name:s.jobs[0],assets:workerAssets,debt:workerDebt,net:workerAssets-workerDebt,wage:wages,capital:0,tax:wages*taxRate,spend:workerNet*.92,saving:workerNet*.08,afford:workerNet/basket},owner:{name:s.jobs[1],assets:ownerAssets,debt:ownerDebt,net:ownerAssets-ownerDebt,wage:0,capital,tax:capital*taxRate,spend:ownerNet*.65,saving:ownerNet*.35,afford:ownerNet/(basket*.12)},companyValue:ownerAssets*.6};});
return {...r,produced,retained,transfer,rows,technology:rows.reduce((a,s)=>a+s.technology*s.share,0),wealth:rows.reduce((a,s)=>a+s.worker.net+s.owner.net,0),afford:rows.reduce((a,s)=>a+s.worker.afford*s.share,0),wageShare};}
function radius(wealth){return Math.sqrt(Math.max(0,wealth))*3;}
const api={regions:regions.filter(r=>!['portugal','spain'].includes(r.id)),sectors,economy,radius};if(typeof module!=='undefined')module.exports=api;root.AtlasModel=api;
})(typeof window!=='undefined'?window:globalThis);
