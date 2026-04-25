import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const INDEX_PATH = path.join(REPORTS_DIR, 'index.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function saveReport(report) {
  const d = new Date(report.createdAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const slug = slugify(report.title);

  const dir = path.join(REPORTS_DIR, String(yyyy), mm, dd);
  ensureDir(dir);

  fs.writeFileSync(path.join(dir, `${slug}.md`), report.markdown, 'utf-8');
  fs.writeFileSync(path.join(dir, `${slug}.html`), report.html, 'utf-8');
  fs.writeFileSync(path.join(dir, `${slug}.meta.json`), JSON.stringify({
    id: report.id,
    title: report.title,
    createdAt: report.createdAt,
    type: report.type,
    tags: report.tags,
    metadata: report.metadata,
  }, null, 2), 'utf-8');

  updateIndex(report, `${yyyy}/${mm}/${dd}/${slug}`);

  return { dir, slug };
}

function updateIndex(report, relPath) {
  ensureDir(REPORTS_DIR);
  let index = [];
  if (fs.existsSync(INDEX_PATH)) {
    try { index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8')); } catch (_) {}
  }

  index.push({
    id: report.id,
    title: report.title,
    createdAt: report.createdAt,
    type: report.type,
    tags: report.tags,
    path: relPath,
  });

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
}
