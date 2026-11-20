"""Public fictional life archive. Python stdlib only. Bind loopback behind HTTPS proxy."""
import argparse
import hashlib
import hmac
import json
import math
import re
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parent
STATIC = {'/': ('index.html','text/html'), '/index.html': ('index.html','text/html'),
          '/adult-life.js': ('adult-life.js','text/javascript'),
          '/life-model.js': ('life-model.js','text/javascript'), '/public-client.js': ('public-client.js','text/javascript'),
          '/gallery.html': ('gallery.html','text/html'), '/styles.css': ('styles.css','text/css')}

def clean_record(data):
    def text(key, max_len):
        value = data.get(key)
        if not isinstance(value, str) or not value.strip() or len(value) > max_len:
            raise ValueError(key)
        return value
    year = data.get('birthYear')
    wealth = data.get('wealth')
    if type(year) is not int or not 1980 <= year <= 1989: raise ValueError('birthYear')
    if type(wealth) not in (int,float) or not math.isfinite(wealth) or abs(wealth)>100000: raise ValueError('wealth')
    result = {k:text(k,n) for k,n in [('name',20),('region',30),('title',80),('epitaph',3000)]}
    result.update(birthYear=year,wealth=round(wealth,2))
    timeline=data.get('timeline')
    if not isinstance(timeline,list) or not 1<=len(timeline)<=160: raise ValueError('timeline')
    result['timeline']=[]
    for row in timeline:
        y=row.get('year'); body=row.get('text'); title=row.get('title','')
        if type(y) is not int or not year<=y<=2026 or not isinstance(body,str) or not 1<=len(body)<=800 or not isinstance(title,str) or len(title)>200: raise ValueError('timeline entry')
        result['timeline'].append({'year':y,'age':y-year,'title':title,'text':body})
    return result

def create_server(db,host='127.0.0.1',port=8766):
    db=Path(db);db.parent.mkdir(parents=True,exist_ok=True)
    @contextmanager
    def connect():
        c=sqlite3.connect(str(db),timeout=15)
        try:
            c.execute('PRAGMA journal_mode=WAL')
            with c: yield c
        finally: c.close()
    with connect() as c:
        c.execute('CREATE TABLE IF NOT EXISTS lives (id TEXT PRIMARY KEY, owner TEXT UNIQUE NOT NULL, created INTEGER NOT NULL, body TEXT NOT NULL)')
    rates={};lock=threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args): pass
        def send(self,status,value,mime='application/json'):
            raw=json.dumps(value,ensure_ascii=False).encode('utf-8') if mime=='application/json' else value
            self.send_response(status);self.send_header('Content-Type',mime+'; charset=utf-8');self.send_header('Content-Length',str(len(raw)))
            self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store');self.send_header('Referrer-Policy','same-origin');self.end_headers();self.wfile.write(raw)
        def route(self):
            p=urlsplit(self.path).path
            return p[len('/yancheng80s'):] or '/' if p.startswith('/yancheng80s/') else p
        def same_origin(self):
            origin=urlsplit(self.headers.get('Origin',''))
            return origin.scheme in ('http','https') and origin.netloc==self.headers.get('Host')
        def do_GET(self):
            p=self.route()
            if p in STATIC:
                name,mime=STATIC[p]
                try:self.send(200,(ROOT/name).read_bytes(),mime)
                except FileNotFoundError:self.send(404,{'error':'页面尚未准备好'})
                return
            if p=='/api/lives':
                q=parse_qs(urlsplit(self.path).query)
                try:offset=max(0,min(100000,int(q.get('offset',['0'])[0])))
                except ValueError:self.send(400,{'error':'分页参数无效'});return
                with connect() as c:
                    rows=c.execute('SELECT id,created,body FROM lives ORDER BY created DESC,id DESC LIMIT 21 OFFSET ?',(offset,)).fetchall()
                items=[]
                for rid,created,body in rows[:20]:
                    r=json.loads(body);items.append({**{k:r[k] for k in ('name','region','birthYear','title','wealth')},'id':rid,'created':created})
                self.send(200,{'items':items,'hasMore':len(rows)>20});return
            if re.fullmatch(r'/api/lives/[0-9a-f]{32}',p):
                with connect() as c:row=c.execute('SELECT created,body FROM lives WHERE id=?',(p.rsplit('/',1)[1],)).fetchone()
                self.send(200,dict(json.loads(row[1]),created=row[0])) if row else self.send(404,{'error':'记录不存在或已撤下'});return
            self.send(404,{'error':'未找到页面'})
        def do_POST(self):
            if self.route()!='/api/lives':self.send(404,{'error':'未找到接口'});return
            if not self.same_origin():self.send(403,{'error':'请在本站发布'});return
            try:
                n=int(self.headers.get('Content-Length','0'))
                if not 0<n<=65536:self.send(413,{'error':'记录过大'});return
                data=json.loads(self.rfile.read(n));token=data.get('ownerToken','')
                if not re.fullmatch(r'[0-9a-f]{64}',token):raise ValueError('token')
                record=clean_record(data.get('record',{}))
            except (ValueError,TypeError,AttributeError):self.send(400,{'error':'人生记录格式无效'});return
            owner=hashlib.sha256(token.encode()).hexdigest()
            with connect() as c:existing=c.execute('SELECT id FROM lives WHERE owner=?',(owner,)).fetchone()
            if existing:self.send(200,{'id':existing[0]});return
            ip=self.headers.get('X-Real-IP',self.client_address[0]);now=time.time()
            with lock:
                for key in list(rates):
                    if now-rates[key][0]>3600:del rates[key]
                start,count=rates.get(ip,(now,0))
                if count>=10 or len(rates)>=10000:self.send(429,{'error':'发布较频繁，请稍后再试'});return
                rates[ip]=(start,count+1)
            rid=uuid.uuid4().hex
            with connect() as c:
                try:c.execute('INSERT INTO lives VALUES (?,?,?,?)',(rid,owner,int(now),json.dumps(record,ensure_ascii=False)))
                except sqlite3.IntegrityError:rid=c.execute('SELECT id FROM lives WHERE owner=?',(owner,)).fetchone()[0]
            self.send(201,{'id':rid})
        def do_DELETE(self):
            p=self.route()
            if not re.fullmatch(r'/api/lives/[0-9a-f]{32}',p) or not self.same_origin():self.send(403,{'error':'无法撤下'});return
            token=self.headers.get('Authorization','').removeprefix('Bearer ')
            with connect() as c:
                row=c.execute('SELECT owner FROM lives WHERE id=?',(p.rsplit('/',1)[1],)).fetchone()
                if not row or not hmac.compare_digest(row[0],hashlib.sha256(token.encode()).hexdigest()):self.send(403,{'error':'需要本浏览器的发布凭证'});return
                c.execute('DELETE FROM lives WHERE id=?',(p.rsplit('/',1)[1],))
            self.send(200,{'ok':True})
    server=ThreadingHTTPServer((host,port),Handler);server.daemon_threads=True;return server

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--port',type=int,default=8766);ap.add_argument('--db',default=str(ROOT/'data'/'lives.sqlite3'));args=ap.parse_args()
    create_server(args.db,port=args.port).serve_forever()
