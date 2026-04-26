import http from 'http';
import { generateSurvey } from './lib/report-generator.mjs';
import { loadFeedback, saveFeedback, saveSkill, loadSkills } from './lib/feedback.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3457;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function serveStatic(req, res) {
  let filePath = path.join(__dirname, decodeURIComponent(req.url === '/' ? '/index.html' : req.url));
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not Found'); return; }
  if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  if (req.method === 'POST' && pathname === '/api/generate') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { topic, userTags, timeRange } = JSON.parse(body);
        if (!topic) { res.writeHead(400); res.end(JSON.stringify({ error: '缺少 topic' })); return; }
        const report = await generateSurvey({ topic, timeRange, userTags: userTags || [] });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, title: report.title, tags: report.tags, path: report.id }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/feedback?reportId=xxx
  if (req.method === 'GET' && pathname === '/api/feedback') {
    const reportId = parsedUrl.searchParams.get('reportId') || '';
    const all = loadFeedback();
    const filtered = reportId ? all.filter(f => f.reportId === reportId) : all;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ feedback: filtered }));
    return;
  }

  // POST /api/feedback
  if (req.method === 'POST' && pathname === '/api/feedback') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        saveFeedback(data);
        if (data.saveAsSkill && data.content) {
          const typeLabel = { insight: '洞察思路', method: '分析方法', missing: '补充内容', error: '纠正' };
          saveSkill({
            name: `${typeLabel[data.type] || data.type}：${data.content.slice(0, 30)}`,
            type: data.type,
            content: data.content,
            keywords: data.keywords || [],
            sourceReport: data.reportTitle || '',
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/skills
  if (req.method === 'GET' && pathname === '/api/skills') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ skills: loadSkills() }));
    return;
  }

  // POST /api/regenerate
  if (req.method === 'POST' && pathname === '/api/regenerate') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { topic, feedback } = JSON.parse(body);
        if (!topic) { res.writeHead(400); res.end(JSON.stringify({ error: '缺少 topic' })); return; }

        console.log(`\n[重新生成] ${topic}`);
        console.log(`  反馈: ${feedback.slice(0, 50)}...`);

        const report = await generateSurvey({ topic, userTags: [], timeRange: '' });
        const reportPath = `reports/${report.path}.html`;

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, url: `/${reportPath}`, path: report.path }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`DeepInsight 洞察 Agent 服务已启动：http://localhost:${PORT}`);
  console.log('按 Ctrl+C 停止');
});
