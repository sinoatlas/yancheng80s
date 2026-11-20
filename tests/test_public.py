import importlib.util,json,tempfile,threading,unittest,urllib.request,urllib.error
from pathlib import Path
spec=importlib.util.spec_from_file_location('archive',Path(__file__).parents[1]/'server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ArchiveTest(unittest.TestCase):
 def test_public_roundtrip(self):
  with tempfile.TemporaryDirectory() as d:
   server=m.create_server(Path(d)/'life.db',port=0);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{server.server_port}'
   def request(path,method='GET',data=None,token=None,origin=base):
    headers={'Content-Type':'application/json','Origin':origin}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers=headers)
    try:
     with urllib.request.urlopen(req) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:
     with e:return e.code,json.load(e)
   try:
    record={'name':'徐浩','region':'盐都区','birthYear':1986,'title':'测试半生','wealth':1,'epitaph':'虚构人生','timeline':[{'year':2026,'text':'完成游戏'}]};payload={'ownerToken':'a'*64,'record':record}
    self.assertEqual(request('/api/lives','POST',payload,origin='https://evil.example')[0],403)
    status,out=request('/api/lives','POST',payload);self.assertEqual(status,201);rid=out['id']
    self.assertEqual(request('/api/lives','POST',payload)[1]['id'],rid)
    self.assertEqual(len(request('/api/lives')[1]['items']),1)
    self.assertEqual(request('/api/lives/'+rid)[1]['name'],'徐浩')
    self.assertNotIn('owner',request('/api/lives/'+rid)[1])
    self.assertEqual(request('/api/lives/'+rid,'DELETE',token='b'*64)[0],403)
    self.assertEqual(request('/api/lives/'+rid,'DELETE',token='a'*64)[0],200)
    self.assertEqual(request('/api/lives/'+rid)[0],404)
    self.assertEqual(request('/tests/stress-before.json')[0],404)
   finally:server.shutdown();server.server_close();thread.join()
if __name__=='__main__':unittest.main()
