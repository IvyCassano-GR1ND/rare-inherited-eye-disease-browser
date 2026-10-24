/* Shared by the browser, build script and tests. No network dependencies. */
(function(root){
  'use strict';
  const headers=['记录编号','ORPHA编号','疾病名称','症状体征','辅助检查','鉴别诊断','参考文献','文献链接'];
  const fields=['id','code','diseaseName','symptoms','examinations','differential','reference','url'];
  function parseCSV(text){
    text=text.replace(/^\uFEFF/,'');
    const rows=[];let row=[],field='',quoted=false,closed=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(quoted){if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=ch;continue;}
      if(ch==='"'){if(field||closed)throw Error('CSV 引号格式不正确');quoted=true;}
      else if(ch===','||ch==='\n'||ch==='\r'){
        row.push(field);field='';closed=false;
        if(ch!==','){if(ch==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];}
      }else{if(closed)throw Error('CSV 引号结束后只能出现逗号或换行');field+=ch;}
    }
    if(quoted)throw Error('CSV 存在未闭合的引号');
    if(field||row.length||closed){row.push(field);rows.push(row);}
    return rows.filter(r=>r.some(c=>c.trim()));
  }
  function safeURL(value){
    if(!value)return '';
    try{const u=new URL(value);if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password)return u.href;}catch{}
    return '';
  }
  function validateRecords(input,catalog,{allowEmpty=false}={}){
    if(!Array.isArray(input)||input.length>10000)throw Error('资料必须为记录数组，最多 10,000 行');
    const entries=new Map(catalog.map(e=>[e.code,e])),seen=new Set(),errors=[],records=[];
    input.forEach((r,i)=>{
      const fail=msg=>errors.push('第 '+(i+2)+' 行：'+msg);
      if(!r||typeof r!=='object'||Array.isArray(r)){fail('记录格式不正确');return;}
      const o={};for(const f of fields){if(r[f]!==undefined&&typeof r[f]!=='string'){fail(f+' 必须是文本');return;}o[f]=(r[f]||'').trim();if(o[f].length>20000){fail('单元格过长');return;}}
      o.code=o.code.replace(/^ORPHA\s*:\s*/i,'');
      if(!/^[A-Za-z0-9_-]{1,80}$/.test(o.id)){fail('记录编号必填，仅用字母、数字、下划线或短横线');return;}
      if(seen.has(o.id)){fail('记录编号重复：'+o.id);return;}seen.add(o.id);
      const e=entries.get(o.code);
      if(!e){fail('ORPHA 编号不存在：'+o.code);return;}
      if(['Category','Clinical group'].includes(e.type)){fail('这是分类组，请填写具体疾病或亚型的编号');return;}
      if(!o.symptoms&&!o.examinations&&!o.differential&&!o.reference&&!o.url){fail('尚未填写临床资料或参考文献');return;}
      if((o.symptoms||o.examinations||o.differential)&&!o.reference&&!o.url){fail('临床资料必须附参考文献或文献链接');return;}
      if(o.url&&!safeURL(o.url)){fail('文献链接必须是完整的 http:// 或 https:// 地址');return;}
      if(!o.diseaseName)o.diseaseName=e.nameZh||e.name;
      records.push(o);
    });
    if(errors.length)throw Error(errors.slice(0,25).join('\n')+(errors.length>25?'\n另有 '+(errors.length-25)+' 个错误':''));
    if(!records.length&&!allowEmpty)throw Error('文件没有可导入的资料。请先填写模板。');
    return records;
  }
  function readCSV(text,catalog,options){
    const rows=parseCSV(text);if(!rows.length)throw Error('文件为空');
    const h=rows.shift().map(c=>c.trim());
    if(h.length!==headers.length||headers.some(x=>!h.includes(x)))throw Error('表头不匹配，请使用网页下载的 8 列模板，保留列名');
    const input=rows.map((r,i)=>{if(r.length!==h.length)throw Error('第 '+(i+2)+' 行列数不正确（包含逗号的内容需要 CSV 引号）');return Object.fromEntries(fields.map((f,j)=>[f,r[h.indexOf(headers[j])]]));});
    return validateRecords(input,catalog,options);
  }
  function mergeRecords(current,incoming){
    const map=new Map(current.map(r=>[r.id,r]));let added=0,updated=0,unchanged=0;
    for(const r of incoming){const old=map.get(r.id);if(old&&old.code!==r.code)throw Error('记录 '+r.id+' 已属于 ORPHA:'+old.code+'，不能改为另一疾病；请使用新记录编号');if(!old)added++;else if(JSON.stringify(old)===JSON.stringify(r))unchanged++;else updated++;map.set(r.id,r);}
    return {records:[...map.values()],added,updated,unchanged};
  }
  function toCSV(records){
    const cell=v=>{let s=String(v||'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    return '\uFEFF'+[headers,...records.map(r=>fields.map(f=>r[f]||''))].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
  }
  const api={headers,fields,parseCSV,safeURL,validateRecords,readCSV,mergeRecords,toCSV};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClinicalCore=api;
})(globalThis);
