'use strict';
const DATA=JSON.parse(document.getElementById('dataset').textContent);
const $=id=>document.getElementById(id);
const published=JSON.parse($('clinical-data').textContent);
let clinicalRecords=published.records;
let clinicalIndex=new Map();
function indexClinical(){clinicalIndex=new Map();for(const r of clinicalRecords){if(!clinicalIndex.has(r.code))clinicalIndex.set(r.code,[]);clinicalIndex.get(r.code).push(r);}}
indexClinical();
const zh={'97966':'眼科罕见病','98618':'罕见屈光异常','98658':'色觉疾病','101950':'罕见眼部肿瘤','520814':'视觉器官罕见疾病','519266':'眼附属器罕见疾病','98594':'眉毛／睫毛罕见疾病','98602':'泪器罕见疾病','98560':'眼睑罕见疾病','140653':'神经眼科疾病','519329':'累及多种眼部结构的罕见疾病','519311':'眼后节罕见疾病','519272':'眼部结构发育异常','519284':'眼前节罕见疾病','98715':'葡萄膜炎','519298':'巩膜罕见疾病'};
const types={'Category':'分类组','Clinical group':'临床疾病组','Disease':'疾病','Clinical syndrome':'临床综合征','Malformation syndrome':'畸形综合征','Clinical subtype':'临床亚型','Etiological subtype':'病因亚型','Morphological anomaly':'形态异常','Biological anomaly':'生物学异常','Particular clinical situation in a disease or syndrome':'特定临床情况'};
const groupTypes=new Set(['Category','Clinical group']);
const kind=e=>groupTypes.has(e.type)?'group':/subtype/i.test(e.type)?'subtype':'disease';
const entries=new Map(DATA.entries.map(e=>[e.code,e]));
entries.set('97966',{code:'97966',name:'Rare ophthalmic disorder',type:'Category',link:'https://www.orpha.net/en/disease/classification/head/97966'});
const root={code:'97966',key:'97966',children:[],ancestors:[]},nodes=new Map([[root.key,root]]),byCode=new Map();
for(const p of DATA.paths){const keys=p.codePath.split(' > '),key=keys.join('/'),parent=keys.slice(0,-1).join('/');const n={code:p.code,key,ancestors:keys.slice(0,-1),children:[]};nodes.set(key,n);nodes.get(parent).children.push(n);if(!byCode.has(n.code))byCode.set(n.code,[]);byCode.get(n.code).push(n);}
const expanded=new Set(['97966','97966/520814']);let selected='97966/520814',allowed=new Set(),matches=new Set();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).replace(/[矇蒙]/g,'蒙').replace(/黒/g,'黑').replace(/黏/g,'粘').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/orpha\s*:?\s*/g,'').trim();
function title(code){const e=entries.get(code);return zh[code]||e.nameZh||e.name;}
function recompute(openMatches=false){
 matches=new Set();allowed=new Set();const query=norm($('query').value),mode=$('mode').value,tokens=query.split(/\s+/).filter(Boolean);
 for(const e of entries.values()){
  if(e.code==='97966')continue;
  const k=kind(e);if(!$('subtypes').checked&&k==='subtype')continue;if(mode!=='all'&&mode!==k)continue;
  const nameText=norm(e.code+' '+e.name+' '+(zh[e.code]||'')+' '+(e.nameZh||'')+' '+(e.aliasesZh||[]).join(' ')+' '+(e.extraAliases||[]).join(' ')+' '+(e.aliasesEn||[]).join(' '));
  const clinicalText=norm((clinicalIndex.get(e.code)||[]).map(r=>r.symptoms+' '+r.examinations).join(' '));
  const scope=$('scope').value,text=scope==='name'?nameText:scope==='clinical'?clinicalText:nameText+' '+clinicalText;
  const hit=/^\d+$/.test(query)&&scope!=='clinical'?e.code===query:tokens.every(t=>text.includes(t));
  if((scope!=='clinical'||clinicalText.trim())&&hit)matches.add(e.code);
 }
 function visit(n){let good=matches.has(n.code);for(const c of n.children)good=visit(c)||good;if(good)allowed.add(n.key);return good;}
 visit(root);
 if(openMatches&&(query||mode!=='all'||$('scope').value==='clinical')){expanded.clear();for(const n of nodes.values())if(matches.has(n.code)){let path='';for(const code of n.ancestors){path=path?path+'/'+code:code;expanded.add(path);}}}
 $('clear').hidden=!$('query').value;$('count').textContent=matches.size+' 个条目'+(query||mode!=='all'||$('scope').value==='clinical'?'匹配':'可浏览');renderTree();
}
const arrow='<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3 5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function row(n){if(!allowed.has(n.key))return '';const e=entries.get(n.code),kids=n.children.filter(c=>allowed.has(c.key)),open=expanded.has(n.key),k=kind(e);return '<li><div class="row '+(selected===n.key?'selected ':'')+(!matches.has(n.code)?'context':'')+'">'+(kids.length?'<button class="toggle" data-toggle="'+n.key+'" aria-label="'+(open?'折叠 ':'展开 ')+esc(title(n.code))+'" aria-expanded="'+open+'">'+arrow+'</button>':'<span class="dot">·</span>')+'<button class="name" data-select="'+n.key+'" '+(selected===n.key?'aria-current="true"':'')+'><span class="label">'+esc(title(n.code))+'</span><span class="type '+k+'">'+esc(types[e.type]||e.type)+'</span><small>ORPHA:'+e.code+'</small>'+((clinicalIndex.get(e.code)||[]).length?'<span class="clinical-badge">资料 '+clinicalIndex.get(e.code).length+'</span>':'')+'<span class="tree-en"  lang="en">'+esc(e.name)+'</span></button></div>'+(kids.length&&open?'<ul class="children">'+kids.map(row).join('')+'</ul>':'')+'</li>';}
function renderTree(){const scroll=$('tree').scrollTop;$('tree').innerHTML=allowed.size?'<ul>'+row(root)+'</ul>':'<div class="empty">没有匹配条目。试试英文病名或 ORPHA 编号，或勾选“包含疾病亚型”。<br>可搜索中文病名、英文名称或别名；亚型默认隐藏。</div>';$('tree').scrollTop=scroll;}
function select(key,locate=false){selected=key;const n=nodes.get(key);if(!n)return;if(n.children.length)expanded.add(key);renderTree();renderDetail();if(locate){const el=$('tree').querySelector('[data-select="'+key+'"]');el?.scrollIntoView({block:'nearest'});}if(innerWidth<=800)$('detail').scrollIntoView({behavior:'smooth',block:'start'});}
function translationInfo(e){
 const aliases=[...new Set([...(e.aliasesZh||[]),...(e.extraAliases||[])])].filter(a=>a!==title(e.code));
 const source=e.zhSource==='orphadata2020'?'Orphadata 中文命名数据（2020-06-01），按 ORPHA 编号匹配。旧版译名尚未逐条核对至 2026 年英文命名。':'AI 辅助中文工作译名，待专业核对；人名及缩写保留原文。';
 return '<div class="translation-note"><span>'+esc(source)+'</span>'+(zh[e.code]?'<br>分类显示名为本地整理译名。':'')+(e.nameZh&&title(e.code)!==e.nameZh?'<br>来源中文名称：'+esc(e.nameZh):'')+'</div>'+(aliases.length?'<div class="aliases"><span>可检索别名</span><p>'+aliases.map(esc).join('；')+'</p>'+(e.extraAliases?.length?'<small>含本地补充检索别名。</small>':'')+'</div>':'');
}
function renderDetail(){const n=nodes.get(selected),e=entries.get(n.code),k=kind(e),all=byCode.get(e.code)||[root];
 const paths=all.map(p=>{let key='';return '<div class="path">'+[...p.ancestors,p.code].map(c=>{key=key?key+'/'+c:c;return '<button data-path="'+key+'">'+esc(title(c))+'</button>';}).join(' / ')+'</div>';}).join('');
 $('detail').innerHTML='<button id="back">返回分类目录</button><div class="meta"><span>'+esc(types[e.type]||e.type)+'</span><span class="code">ORPHA:'+e.code+'</span></div><h2 class="detail-title">'+esc(title(e.code))+'</h2>'+'<p class="en" lang="en">'+esc(e.name)+'</p>'+translationInfo(e)+'<div class="links"><a href="'+esc(e.link)+'" target="_blank" rel="noopener">查看 Orphanet 原始条目 ↗</a>'+(k!=='group'?'<a href="https://pubmed.ncbi.nlm.nih.gov/?term='+encodeURIComponent('"'+e.name+'" AND ("Case Reports"[pt] OR "case report"[tiab] OR "case series"[tiab])')+'" target="_blank" rel="noopener">检索 PubMed 病例 ↗</a>':'')+'</div>'+definitionHTML(e)+(k==='group'?'<div class="description">分类组用于导航，不作为具体疾病填写临床资料。展开左侧目录，选择具体疾病或综合征。</div><p class="hint">本路径下有 '+n.children.length+' 个直接下级条目。</p>':clinicalHTML(e))+'<div class="detail-label">所属分类路径'+(all.length>1?'（'+all.length+' 条）':'')+'</div>'+paths+'<p class="hint">同一 ORPHA 编号共享同一条目，可出现在多个分类路径中。</p>';
 $('back').onclick=()=>document.querySelector('.treepane').scrollIntoView({behavior:'smooth'});
}
$('tree').addEventListener('click',ev=>{const toggle=ev.target.closest('[data-toggle]');if(toggle){const key=toggle.dataset.toggle;expanded.has(key)?expanded.delete(key):expanded.add(key);renderTree();$('tree').querySelector('[data-toggle="'+key+'"]')?.focus({preventScroll:true});return;}const b=ev.target.closest('[data-select]');if(b)select(b.dataset.select);});
$('detail').addEventListener('click',ev=>{const b=ev.target.closest('[data-path]');if(!b)return;const key=b.dataset.path,n=nodes.get(key);$('query').value='';$('mode').value='all';$('scope').value='all';if(kind(entries.get(n.code))==='subtype')$('subtypes').checked=true;let path='';for(const c of n.ancestors){path=path?path+'/'+c:c;expanded.add(path);}recompute();select(key,true);});
let timer;$('query').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>recompute(true),120);};
$('clear').onclick=()=>{clearTimeout(timer);$('query').value='';expanded.clear();expanded.add('97966');expanded.add('97966/520814');recompute();$('query').focus();};
$('mode').onchange=()=>{if($('mode').value==='subtype')$('subtypes').checked=true;recompute(true);};
$('subtypes').onchange=()=>{if(!$('subtypes').checked&&$('mode').value==='subtype')$('mode').value='all';recompute(true);};
$('collapse').onclick=()=>{expanded.clear();renderTree();};
$('expand').onclick=()=>{const visible=[];function visit(n){if(!allowed.has(n.key))return;if(!expanded.has(n.key)&&n.children.some(c=>allowed.has(c.key)))visible.push(n.key);else n.children.forEach(visit);}visit(root);visible.forEach(k=>expanded.add(k));renderTree();};


$('scope').onchange=()=>recompute(true);
