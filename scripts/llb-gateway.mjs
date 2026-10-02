#!/usr/bin/env node
/**
 * LLB 게이트웨이 — E: 드라이브 ClickHouse(openalex.lit_papers)를 외부 인터넷(Vercel 등)에서 검색할 수 있게 하는 문지기.
 *
 * 구조:  Vercel(웹) --HTTPS--> 터널(cloudflared) --> 이 게이트웨이(127.0.0.1:8124) --> ClickHouse(127.0.0.1:8123)
 *
 * 하는 일(ClickHouse 를 인터넷에 그대로 열지 않는다):
 *   1. HTTP Basic 인증(GATEWAY_USER / GATEWAY_PASSWORD) 없으면 401
 *   2. SELECT / WITH 로 시작하는 문장만 통과 (여러 문장 금지)
 *   3. ClickHouse 쪽에는 읽기 전용 계정(llb_ro)으로만 접속
 *   4. 분당 요청 수 제한, 요청 크기·응답 시간 제한
 *
 * 실행:  node scripts/llb-gateway.mjs      (환경변수는 E:\CH_lit\llb-access.env 와 같은 값을 사용)
 *   GATEWAY_PORT=8124  GATEWAY_USER=llb  GATEWAY_PASSWORD=...  (필수)
 *   CH_URL=http://127.0.0.1:8123  CH_USER=llb_ro  CH_PASSWORD=...  (ClickHouse 읽기 전용 계정)
 *   GATEWAY_RPM=90
 */
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.GATEWAY_PORT || 8124);
const GW_USER = process.env.GATEWAY_USER || 'llb';
const GW_PASS = process.env.GATEWAY_PASSWORD || '';
const CH_URL = new URL(process.env.CH_URL || 'http://127.0.0.1:8123');
const CH_USER = process.env.CH_USER || 'llb_ro';
const CH_PASS = process.env.CH_PASSWORD || '';
const RPM = Number(process.env.GATEWAY_RPM || 90);
const MAX_BODY = 256 * 1024;

if (GW_PASS.length < 16) { console.error('GATEWAY_PASSWORD 는 16자 이상이어야 합니다.'); process.exit(1); }
if (!CH_PASS) { console.error('CH_PASSWORD(읽기 전용 계정 비밀번호)가 필요합니다.'); process.exit(1); }

const eq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const hits = new Map(); // ip -> [timestamps]
const limited = (ip) => {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(ip, arr); return arr.length > RPM;
};
// 한 문장짜리 SELECT/WITH 만. 문자열 리터럴 밖의 ';' 는 거부.
const onlySelect = (sql) => {
  const s = sql.replace(/^[\s(]+/, '').toLowerCase();
  if (!(s.startsWith('select') || s.startsWith('with'))) return false;
  const stripped = sql.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/;\s*$/, '');
  return !stripped.includes(';');
};
const send = (res, code, msg) => { res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' }); res.end(msg); };

http.createServer((req, res) => {
  const ip = req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '?';
  const auth = (req.headers.authorization || '').split(' ');
  const [u, ...pw] = auth[0] === 'Basic' ? Buffer.from(auth[1] || '', 'base64').toString().split(':') : ['', ''];
  if (!(eq(u, GW_USER) && eq(pw.join(':'), GW_PASS))) { res.setHeader('www-authenticate', 'Basic'); return send(res, 401, 'unauthorized'); }
  if (limited(ip)) return send(res, 429, 'too many requests');

  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/ping') return send(res, 200, 'Ok.\n');
  if (url.pathname !== '/') return send(res, 404, 'not found');

  const chunks = []; let size = 0, dead = false;
  req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { dead = true; send(res, 413, 'too large'); req.destroy(); } else chunks.push(c); });
  req.on('end', () => {
    if (dead) return;
    const sql = url.searchParams.get('query') || Buffer.concat(chunks).toString('utf8');
    if (!sql.trim() || !onlySelect(sql)) return send(res, 403, 'only single SELECT/WITH statements are allowed');

    const target = new URL(CH_URL); target.search = url.search; // param_*, default_format 등을 그대로 전달
    target.searchParams.delete('user'); target.searchParams.delete('password'); target.searchParams.delete('database');
    const body = url.searchParams.get('query') ? '' : sql;
    if (!url.searchParams.get('query') && !body) return send(res, 400, 'empty');
    const headers = { Authorization: 'Basic ' + Buffer.from(CH_USER + ':' + CH_PASS).toString('base64') };
    if (body) { target.searchParams.set('query', sql); }
    const up = http.request(target, { method: 'POST', headers, timeout: 70000 }, (r) => {
      res.writeHead(r.statusCode || 502, { 'content-type': r.headers['content-type'] || 'text/plain' });
      r.pipe(res);
    });
    up.on('timeout', () => up.destroy(new Error('timeout')));
    up.on('error', (e) => send(res, 502, 'clickhouse unreachable: ' + e.message));
    up.end();
  });
}).listen(PORT, '127.0.0.1', () => console.log(`LLB gateway on 127.0.0.1:${PORT} -> ${CH_URL.origin} (user ${CH_USER})`));
