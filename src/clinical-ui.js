'use strict';
const C=globalThis.ClinicalCore;
const draftKey='rare-eye-clinical-draft-v1';
let storageAvailable=true,pendingImport=null,oldDraft=null;
function definitionHTML(e){
  const meta=DATA.meta;
  const source='<a href="'+esc(meta.definitionInfo)+'" target="_blank" rel="noopener">Orphanet 2026 命名包</a> · 数据日期 '+esc(meta.definitionDate);
  if(e.definition)return '<section class="definition"><h3>疾病简介 · Orphanet 定义</h3><p lang="en">'+esc(e.definition)+'</p><p class="hint">英文原文，按 ORPHA 编号直接导入。'+source+'</p></section>';
  const note=kind(e)==='group'?'此条目为分类组，官方数据包未提供独立定义。':'官方数据包未提供此条目的独立定义，暂不补写或借用其他疾病定义。可通过上方链接查看 Orphanet 条目。';
  return '<section class="definition"><h3>疾病简介</h3><p class="hint">'+note+'</p><p class="hint">'+source+'</p></section>';
}
function clinicalHTML(e){
  const records=clinicalIndex.get(e.code)||[];
  if(!records.length)return '<section class="clinical"><h3>症状、检查与参考文献</h3><p class="hint">尚未导入此疾病的临床资料。点击上方“导入／导出资料”下载模板后填写。</p><button data-template-code="'+e.code+'">下载此疾病填写模板</button></section>';
  return '<section class="clinical"><h3>文献资料（'+records.length+' 条）</h3><p class="hint">以下内容按文献记录整理；病例中报告的表现不代表所有患者的典型表现。</p>'+records.map(r=>'<article class="clinical-card"><div class="record-head"><strong>'+esc(r.id)+'</strong><button data-delete="'+esc(r.id)+'" aria-label="移除记录 '+esc(r.id)+'">移除记录</button></div><dl class="fields">'+[['症状体征',r.symptoms],['辅助检查',r.examinations],['鉴别诊断',r.differential]].map(([k,v])=>'<div class="field"><dt>'+k+'</dt><dd>'+esc(v||'未填写')+'</dd></div>').join('')+'</dl><p class="reference"><strong>参考文献</strong><br>'+esc(r.reference||'见文献链接')+'</p>'+(C.safeURL(r.url)?'<a href="'+esc(C.safeURL(r.url))+'" target="_blank" rel="noopener noreferrer">打开文献 ↗</a>':'')+'</article>').join('')+'<button data-template-code="'+e.code+'">下载此疾病填写模板</button></section>';
}
function message(text,error=false){$('import-message').textContent=text;$('import-message').classList.toggle('error',error);}
function status(){
 const diseases=new Set(clinicalRecords.map(r=>r.code)).size;
 const changed=JSON.stringify(clinicalRecords)!==JSON.stringify(published.records);
 $('clinical-status').textContent=clinicalRecords.length+' 条文献资料 · '+diseases+' 个疾病／亚型'+(changed?' · 有本地更改，尚未发布':' · 与当前网页内置资料一致')+(!storageAvailable?' · 无法自动保存，请立即导出备份':'');
}
function persist(){
 try{localStorage.setItem(draftKey,JSON.stringify({baseRevision:published.revision,records:clinicalRecords}));}catch{storageAvailable=false;}
 indexClinical();status();recompute(true);renderDetail();
}
function download(name,text,type){
 const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function template(code){
 const e=entries.get(code);
 let id='ORPHA'+code+'-001';let i=1;while(clinicalRecords.some(r=>r.id===id))id='ORPHA'+code+'-'+String(++i).padStart(3,'0');
 const rows=e&&kind(e)!=='group'?[{id,code,diseaseName:title(code)}]:[];
 download('clinical-template.csv',C.toCSV(rows),'text/csv;charset=utf-8');
}
$('manage').onclick=()=>{$('data-panel').hidden=!$('data-panel').hidden;};
$('template').onclick=()=>template(nodes.get(selected)?.code);
$('export-csv').onclick=()=>download('clinical.csv',C.toCSV(clinicalRecords),'text/csv;charset=utf-8');
$('old-draft').onclick=()=>download('previous-draft-clinical.csv',C.toCSV(oldDraft),'text/csv;charset=utf-8');
$('export-html').onclick=()=>{
 const clone=document.documentElement.cloneNode(true);
 const updated={version:1,revision:'export-'+Date.now(),records:clinicalRecords};
 clone.querySelector('#clinical-data').textContent=JSON.stringify(updated).replace(/</g,'\\u003c');
 clone.querySelector('#import-dialog').removeAttribute('open');clone.querySelector('#import-preview').textContent='';clone.querySelector('#preview-summary').textContent='';clone.querySelector('#import-message').textContent='';
 clone.querySelector('#data-panel').hidden=true;clone.querySelector('#query').setAttribute('value','');
 download('index.html','<!doctype html>\n'+clone.outerHTML,'text/html;charset=utf-8');
 message('已导出 index.html，内含当前全部资料。将它重新部署后，其他人才会看到更新；同时建议导出 CSV 备份。');
};
$('reset-draft').onclick=()=>{
 if(!confirm('清除当前浏览器的草稿并恢复网页内置资料？未导出的更改将丢失。'))return;
 try{localStorage.removeItem(draftKey);}catch{storageAvailable=false;}
 clinicalRecords=structuredClone(published.records);oldDraft=null;$('old-draft').hidden=true;indexClinical();status();recompute(true);renderDetail();message('已恢复当前网页内置资料。');
};
$('import-file').onchange=async ev=>{
 const file=ev.target.files?.[0];ev.target.value='';pendingImport=null;if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('文件超过 5 MB，请拆分导入');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
  const incoming=C.readCSV(text,DATA.entries);
  pendingImport=C.mergeRecords(clinicalRecords,incoming);
  $('preview-summary').textContent='新增 '+pendingImport.added+' 条，更新 '+pendingImport.updated+' 条，无变化 '+pendingImport.unchanged+' 条。以下为前 '+Math.min(30,incoming.length)+' 条预览；确认后保存在本地。';
  $('import-preview').innerHTML='<table><thead><tr><th>记录／疾病</th><th>症状与检查</th><th>文献</th></tr></thead><tbody>'+incoming.slice(0,30).map(r=>'<tr><td>'+esc(r.id)+'<br>'+esc(title(r.code))+'<br>ORPHA:'+r.code+'</td><td>'+esc(r.symptoms||'未填症状')+'<hr>'+esc(r.examinations||'未填检查')+'</td><td>'+esc(r.reference||r.url)+'</td></tr>').join('')+'</tbody></table>';
  $('import-dialog').showModal();message('校验通过，请在预览中确认导入。');
 }catch(err){message('导入未执行：'+(err instanceof TypeError?'请用 Excel 另存为 CSV UTF-8 后重试。':err.message),true);}
};
$('confirm-import').onclick=()=>{
 if(!pendingImport)return;clinicalRecords=pendingImport.records;const count=pendingImport.added+pendingImport.updated;pendingImport=null;$('import-dialog').close();persist();message('导入完成，新增或更新 '+count+' 条。现在可按症状／辅助检查搜索；公开网站尚未更新。');
};
$('cancel-import').onclick=()=>{pendingImport=null;$('import-dialog').close();message('已取消导入，原资料未改变。');};
$('import-dialog').addEventListener('cancel',()=>{pendingImport=null;message('已取消导入，原资料未改变。');});
$('detail').addEventListener('click',ev=>{
 const t=ev.target.closest('[data-template-code]');if(t){template(t.dataset.templateCode);return;}
 const del=ev.target.closest('[data-delete]');if(del&&confirm('从本地资料中移除 '+del.dataset.delete+'？公开网站暂不改变。')){clinicalRecords=clinicalRecords.filter(r=>r.id!==del.dataset.delete);persist();}
});
try{
 const saved=JSON.parse(localStorage.getItem(draftKey)||'null');
 if(saved){const valid=C.validateRecords(saved.records,DATA.entries,{allowEmpty:true});if(saved.baseRevision===published.revision){clinicalRecords=valid;}else{oldDraft=valid;$('old-draft').hidden=false;message('检测到旧版本草稿，未自动覆盖当前网页。可下载旧草稿 CSV，核对后再导入。');}}
}catch{storageAvailable=false;message('本地草稿无法读取，已加载网页内置资料。请导出 CSV 保存后续更改。',true);}
indexClinical();status();recompute();renderDetail();
