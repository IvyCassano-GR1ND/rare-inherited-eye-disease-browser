const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../src/clinical-core.js');
const catalog=require('../data/catalog.json');
const sample={id:'TEST-001',code:'65',diseaseName:'测试记录',symptoms:'测试症状，含逗号\n第二行 "引号"',examinations:'测试检查',differential:'',reference:'测试文献，仅用于测试',url:'https://pubmed.ncbi.nlm.nih.gov/'};
test('UTF-8 CSV round trip preserves commas, quotes, line breaks and Chinese',()=>assert.deepEqual(C.readCSV(C.toCSV([sample]),catalog.entries),[sample]));
test('unknown code and classification groups cannot accept clinical rows',()=>{for(const code of ['999999999','520814'])assert.throws(()=>C.validateRecords([{...sample,code}],catalog.entries));});
test('duplicate ids, missing source, unsafe URL, malformed CSV rejected',()=>{
 assert.throws(()=>C.validateRecords([sample,sample],catalog.entries),/重复/);
 assert.throws(()=>C.validateRecords([{...sample,reference:'',url:''}],catalog.entries),/参考文献/);
 assert.throws(()=>C.validateRecords([{...sample,url:'javascript:alert(1)'}],catalog.entries),/链接/);
 assert.throws(()=>C.parseCSV('"unclosed'),/引号/);
 assert.throws(()=>C.readCSV('wrong,headers\na,b',catalog.entries),/表头/);
});
test('merge updates matching record id, is idempotent and disallows reassignment',()=>{
 assert.equal(C.mergeRecords([sample],[sample]).unchanged,1);
 const changed={...sample,symptoms:'修订'};assert.equal(C.mergeRecords([sample],[changed]).updated,1);
 assert.equal(C.mergeRecords([sample],[{...sample,id:'TEST-002'}]).records.length,2);
 assert.throws(()=>C.mergeRecords([sample],[{...sample,code:'791'}]),/另一疾病/);
});
test('spreadsheet formulas are escaped in CSV exports',()=>assert.match(C.toCSV([{...sample,reference:'=1+1'}]),/'=1\+1/));
test('all paths resolve, bilingual names present, definitions counted honestly',()=>{
 const codes=new Set(catalog.entries.map(e=>e.code));assert.equal(codes.size,1339);
 for(const e of catalog.entries)assert.match(e.nameZh,/[\u3400-\u9fff]/);
 for(const p of catalog.paths)for(const code of p.codePath.split(' > '))assert.ok(code==='97966'||codes.has(code));
 assert.equal(catalog.entries.filter(e=>e.definition).length,catalog.meta.definitionCount);
 assert.equal(catalog.meta.definitionCount+catalog.meta.definitionMissingCount,catalog.entries.length);
 assert.match(catalog.entries.find(e=>e.code==='65').definition,/retinal/i);
});
test('production clinical data validates against the catalog',()=>{
 const records=C.readCSV(fs.readFileSync(path.join(__dirname,'../data/clinical.csv'),'utf8'),catalog.entries,{allowEmpty:true});
 assert.ok(Array.isArray(records));
});
