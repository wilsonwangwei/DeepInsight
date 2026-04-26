import { marked } from 'marked';

const CSS = `
:root {
  --ink: #18181b; --muted: #71717a; --muted-2: #a1a1aa;
  --border: #e4e4e7; --bg: #ffffff; --bg-2: #fafafa; --accent: #2563eb;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #fafafa; --muted: #a1a1aa; --muted-2: #71717a;
    --border: #27272a; --bg: #09090b; --bg-2: #18181b; --accent: #60a5fa;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: var(--ink); background: var(--bg); padding: 2rem; max-width: 900px; margin: 0 auto; }
h1 { font-size: 2.5rem; margin: 2rem 0 1rem; font-weight: 700; }
h2 { font-size: 1.75rem; margin: 2rem 0 1rem; font-weight: 600; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
h3 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; font-weight: 600; }
p { margin: 1rem 0; }
ul, ol { margin: 1rem 0; padding-left: 2rem; }
li { margin: 0.5rem 0; }
table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
th, td { border: 1px solid var(--border); padding: 0.75rem; text-align: left; }
th { background: var(--bg-2); font-weight: 600; }
code { background: var(--bg-2); padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9em; }
pre { background: var(--bg-2); padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 1rem 0; }
pre code { background: none; padding: 0; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
.meta { color: var(--muted); font-size: 0.9rem; margin: 1rem 0; }
.fb-panel { background: var(--bg-2); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin: 2rem 0; }
.fb-panel h3 { margin-top: 0; font-size: 1.1rem; }
.fb-form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.fb-form label { font-size: 0.85rem; color: var(--muted); font-weight: 500; }
.fb-form textarea, .fb-form input, .fb-form select { width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--ink); font-family: inherit; font-size: 0.9rem; }
.fb-form textarea { min-height: 80px; resize: vertical; }
.fb-form button { padding: 0.75rem 1.5rem; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; align-self: flex-start; }
.fb-form button:hover { opacity: 0.9; }
.fb-form button:disabled { opacity: 0.5; cursor: not-allowed; }
.fb-form .btn-regen { background: var(--bg); color: var(--accent); border: 1px solid var(--accent); }
.fb-form .btn-regen:hover { background: var(--accent); color: white; }
.fb-item { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 1rem; margin-top: 0.75rem; }
.fb-item-head { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.fb-type { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; background: var(--accent); color: white; }
.fb-date { font-size: 0.8rem; color: var(--muted); }
.fb-status { margin-top: 1rem; padding: 0.75rem; border-radius: 6px; font-size: 0.85rem; }
.fb-status.ok { color: #10b981; border: 1px solid #10b981; }
.fb-status.err { color: #ef4444; border: 1px solid #ef4444; }
`;

export function markdownToHTML(markdown, title, metadata = {}) {
  const html = marked(markdown);
  const { createdAt, tags = {}, cost = 0, llmProvider = 'claude', reportId = '' } = metadata;
  const allTags = [...(tags.user || []), ...(tags.auto || [])].join(', ');
  const safeTitle = title.replace(/'/g, "\'");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — DeepInsight</title>
<style>${CSS}</style>
</head>
<body>
<div class="meta">
  生成时间：${createdAt || new Date().toISOString().slice(0, 10)} ·
  模型：${llmProvider} ·
  成本：$${cost.toFixed(4)} ·
  标签：${allTags}
</div>
${html}
<hr>
<div class="fb-panel">
  <h3>💡 反馈与改进</h3>
  <p style="color:var(--muted);font-size:0.9rem">对报告不满意？提出新的洞察思路或方法，系统会记录并在后续生成中应用。</p>
  <form class="fb-form" onsubmit="submitFB(event)">
    <div>
      <label>反馈类型</label>
      <select id="fb-type">
        <option value="insight">洞察思路（应该关注 X 方面）</option>
        <option value="method">分析方法（应该用 Y 框架分析）</option>
        <option value="missing">缺失内容（没有提到 Z）</option>
        <option value="error">错误纠正</option>
      </select>
    </div>
    <div>
      <label>具体建议 *</label>
      <textarea id="fb-content" placeholder="例如：应该增加对性能优化的分析..." required></textarea>
    </div>
    <div>
      <label>关键词（逗号分隔，用于后续匹配）</label>
      <input type="text" id="fb-keywords" placeholder="例如：性能优化, 内存管理">
    </div>
    <div style="display:flex;gap:1rem;align-items:center">
      <button type="submit" id="fb-btn">提交反馈</button>
      <button type="button" class="btn-regen" id="regen-btn" onclick="regenFB()">基于反馈重新生成</button>
      <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">
        <input type="checkbox" id="fb-skill" checked>
        <span style="font-size:0.85rem">保存为可复用 Skill</span>
      </label>
    </div>
  </form>
  <div id="fb-status"></div>
  <div id="fb-list"></div>
</div>
<div class="meta">
  本报告由 DeepInsight 洞察 Agent 生成 ·
  <a href="https://github.com/Boris-hbx/DeepInsight" target="_blank">GitHub</a>
</div>
<script>
const RID='${reportId}',RTITLE='${safeTitle}';
const TL={insight:'洞察思路',method:'分析方法',missing:'缺失内容',error:'错误纠正'};
async function loadFB(){
  try{const r=await fetch('/api/feedback?reportId='+RID);const d=await r.json();renderFB(d.feedback||[]);}catch(e){}
}
function renderFB(list){
  const c=document.getElementById('fb-list');
  if(!list.length){c.innerHTML='';return;}
  c.innerHTML='<h4 style="margin-top:1.5rem;font-size:1rem">历史反馈</h4>'+list.map(f=>
    '<div class="fb-item"><div class="fb-item-head"><span class="fb-type">'+(TL[f.type]||f.type)+'</span><span class="fb-date">'+new Date(f.createdAt).toLocaleString('zh-CN')+'</span></div><div>'+f.content+'</div>'+(f.keywords&&f.keywords.length?'<div style="margin-top:0.5rem;font-size:0.8rem;color:var(--muted)">关键词：'+f.keywords.join(', ')+'</div>':'')+'</div>'
  ).join('');
}
async function submitFB(e){
  e.preventDefault();
  const btn=document.getElementById('fb-btn'),st=document.getElementById('fb-status');
  btn.disabled=true;
  const type=document.getElementById('fb-type').value;
  const content=document.getElementById('fb-content').value.trim();
  const kw=document.getElementById('fb-keywords').value.trim();
  const keywords=kw?kw.split(',').map(k=>k.trim()).filter(Boolean):[];
  const saveAsSkill=document.getElementById('fb-skill').checked;
  try{
    const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reportId:RID,reportTitle:RTITLE,type,content,keywords,saveAsSkill})});
    if(!r.ok)throw new Error('提交失败');
    st.className='fb-status ok';st.textContent='✓ 反馈已保存'+(saveAsSkill?'，并已生成 Skill':'');
    document.getElementById('fb-content').value='';document.getElementById('fb-keywords').value='';
    await async function regenFB(){
  var content=document.getElementById('fb-content').value.trim();
  if(!content){alert('请先填写反馈建议');return;}
  var btn=document.getElementById('regen-btn');
  btn.disabled=true;btn.textContent='生成中...';
  try{
    var type=document.getElementById('fb-type').value;
    var kw=document.getElementById('fb-keywords').value.trim();
    var keywords=kw?kw.split(',').map(function(k){return k.trim()}).filter(Boolean):[];
    var saveAsSkill=document.getElementById('fb-skill').checked;
    await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reportId:RID,reportTitle:RTITLE,type:type,content:content,keywords:keywords,saveAsSkill:saveAsSkill})});
    var r=await fetch('/api/regenerate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:RTITLE,feedback:content})});
    if(!r.ok)throw new Error('生成失败');
    var result=await r.json();
    window.open(result.url,'_blank');
    document.getElementById('fb-content').value='';
    await loadFB();
  }catch(err){alert('生成失败：'+err.message);}
  finally{btn.disabled=false;btn.textContent='基于反馈重新生成';}
}
loadFB();setTimeout(()=>{st.textContent='';},3000);
  }catch(err){st.className='fb-status err';st.textContent='✗ '+err.message;}
  finally{btn.disabled=false;}
}
loadFB();
</script>
</body>
</html>`;
}
