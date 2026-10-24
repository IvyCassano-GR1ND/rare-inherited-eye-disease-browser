"""Usage: python scripts/import-definitions.py /path/to/ORPHAnomenclature_en_2026.xml
Then run npm test && npm run build. Download the official pack separately.
"""
from pathlib import Path
from datetime import date
import argparse,json,xml.etree.ElementTree as ET,re,html,hashlib
p=argparse.ArgumentParser();p.add_argument('xml',type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[1];data=json.loads((root/'data/catalog.json').read_text(encoding='utf8'))
xml=ET.parse(args.xml).getroot();definitions={}
for e in xml.findall('./DisorderList/Disorder'):
    sections=[s for s in e.findall('.//TextSection') if s.findtext('./TextSectionType/Name')=='Definition']
    text='\n\n'.join(html.unescape(re.sub('<[^>]+>','',s.findtext('Contents',''))) for s in sections).strip()
    definitions[e.findtext('OrphaCode')]=(text,[x.text for x in e.findall('./SynonymList/Synonym') if x.text])
missing=[]
for e in data['entries']:
    e['definition'],e['aliasesEn']=definitions.get(e['code'],('',[]))
    if not e['definition']:missing.append({k:e[k] for k in ['code','name','type']})
data['meta'].update(definitionDate=xml.attrib.get('ExtractionDate','unknown').split()[0],retrievedAt=date.today().isoformat(),definitionCount=len(data['entries'])-len(missing),definitionMissingCount=len(missing),definitionXmlSha256=hashlib.sha256(args.xml.read_bytes()).hexdigest())
(root/'data/catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
(root/'data/definition-coverage.json').write_text(json.dumps({'available':data['meta']['definitionCount'],'missing':missing},ensure_ascii=False,indent=2),encoding='utf8')
print('Definitions:',data['meta']['definitionCount'],'Missing:',len(missing))
