import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEEDBACK_PATH = path.join(__dirname, '..', 'reports', 'feedback.json');
const SKILLS_PATH = path.join(__dirname, '..', 'skills');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadFeedback() {
  if (!fs.existsSync(FEEDBACK_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf-8')); } catch (_) { return []; }
}

export function saveFeedback(entry) {
  const all = loadFeedback();
  all.push({
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(all, null, 2), 'utf-8');
  return all;
}

export function loadSkills() {
  ensureDir(SKILLS_PATH);
  const files = fs.readdirSync(SKILLS_PATH).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(SKILLS_PATH, f), 'utf-8')); } catch (_) { return null; }
  }).filter(Boolean);
}

export function saveSkill(skill) {
  ensureDir(SKILLS_PATH);
  const slug = skill.name.toLowerCase().replace(/[^\w一-鿿]+/g, '-').slice(0, 40);
  const filePath = path.join(SKILLS_PATH, `${slug}.json`);
  const data = {
    ...skill,
    id: skill.id || crypto.randomUUID(),
    createdAt: skill.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export function getSkillsForTopic(topic) {
  const skills = loadSkills();
  return skills.filter(s => {
    const keywords = s.keywords || [];
    return keywords.some(k => topic.toLowerCase().includes(k.toLowerCase()));
  });
}

