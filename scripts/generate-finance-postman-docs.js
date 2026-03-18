const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, 'src', 'app', 'api', 'finance');
const OUT_DIR = path.join(ROOT, 'docs', 'postman');
const BASE_URL = 'https://bright-financial-production.up.railway.app';
const BASE_URL_OBJ = new URL(BASE_URL);

function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && entry.name === 'route.ts') acc.push(full);
  }
  return acc;
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function routePathFromFile(filePath) {
  const relDir = toPosix(path.relative(API_ROOT, path.dirname(filePath)));
  const raw = relDir === '' ? '/api/finance' : `/api/finance/${relDir}`;
  return raw.replace(/\[([^\]]+)\]/g, '{{$1}}');
}

function pathParamsFromRoute(routePath) {
  const matches = [...routePath.matchAll(/\{\{([^}]+)\}\}/g)];
  return matches.map((m) => m[1]);
}

function getMethodBlocks(content) {
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g;
  const out = [];
  let m;
  while ((m = methodRegex.exec(content)) !== null) {
    const method = m[1];
    const start = m.index;
    const braceStart = content.indexOf('{', m.index);
    if (braceStart === -1) continue;
    let depth = 0;
    let i = braceStart;
    for (; i < content.length; i++) {
      const ch = content[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    out.push({ method, block: content.slice(start, i) });
  }
  return out;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function extractQueryParams(block) {
  const params = [];
  for (const m of block.matchAll(/searchParams\.get\(\s*['\"]([^'\"]+)['\"]\s*\)/g)) params.push(m[1]);
  return uniq(params);
}

function extractFormDataFields(block) {
  const vars = new Set(['formData']);
  for (const m of block.matchAll(/const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*await\s+request\.formData\(\s*\)/g)) {
    vars.add(m[1]);
  }

  const fields = [];
  for (const v of vars) {
    const getRe = new RegExp(`${v}\\.get\\(\\s*['\\"]([^'\\"]+)['\\"]\\s*\\)`, 'g');
    const getAllRe = new RegExp(`${v}\\.getAll\\(\\s*['\\"]([^'\\"]+)['\\"]\\s*\\)`, 'g');
    for (const m of block.matchAll(getRe)) fields.push(m[1]);
    for (const m of block.matchAll(getAllRe)) fields.push(m[1]);
  }
  return uniq(fields);
}

function extractBodyKeys(block) {
  const keys = [];
  const jsonVars = new Set(['body']);
  for (const m of block.matchAll(/const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*await\s+request\.json\(\s*\)/g)) {
    jsonVars.add(m[1]);
  }

  const directJsonDestructure = /const\s*\{([\s\S]*?)\}\s*=\s*await\s+request\.json\(\s*\)/g;
  for (const m of block.matchAll(directJsonDestructure)) {
    const inner = m[1];
    for (const part of inner.split(',')) {
      const k = part.trim();
      if (!k) continue;
      const key = k.split(':')[0].trim().replace(/\?$/, '');
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) keys.push(key);
    }
  }

  for (const v of jsonVars) {
    const destrRe = new RegExp(`const\\s*\\{([\\s\\S]*?)\\}\\s*=\\s*${v}\\s*;`, 'g');
    for (const m of block.matchAll(destrRe)) {
      const inner = m[1];
      for (const part of inner.split(',')) {
        const k = part.trim();
        if (!k) continue;
        const key = k.split(':')[0].trim().replace(/\?$/, '');
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) keys.push(key);
      }
    }

    const propRe = new RegExp(`${v}\\.([A-Za-z_][A-Za-z0-9_]*)`, 'g');
    for (const m of block.matchAll(propRe)) {
      keys.push(m[1]);
    }
  }

  return uniq(keys);
}

function extractRequiredKeys(block, keys) {
  const required = [];
  for (const k of keys) {
    const escaped = k.replace(/[$]/g, '\\$&');
    const re = new RegExp(`\\!\\s*${escaped}\\b|\\!\\s*body\\.${escaped}\\b|${escaped}\\s*===\\s*undefined|${escaped}\\s*==\\s*null|body\\.${escaped}\\s*===\\s*undefined|body\\.${escaped}\\s*==\\s*null`, 'm');
    if (re.test(block)) required.push(k);
  }
  return required;
}

function guessValueForKey(key) {
  const k = key.toLowerCase();
  if (k.includes('email')) return 'user@example.com';
  if (k.includes('mobile') || k.includes('phone')) return '+96890000000';
  if (k.includes('date') || k.endsWith('at') || k.includes('deadline')) return '2026-03-18T00:00:00.000Z';
  if (k.startsWith('is') || k.startsWith('has') || k.startsWith('can') || k.endsWith('required') || k.includes('enabled')) return true;
  if (k.includes('amount') || k.includes('price') || k.includes('rate') || k.includes('cost') || k.includes('score') || k.includes('quantity') || k.includes('weight') || k.includes('percent') || k.includes('limit') || k.includes('count') || k.includes('days') || k.includes('duration')) return 1;
  if (k.endsWith('s') || k.includes('items') || k.includes('vendors') || k.includes('criteria') || k.includes('documents') || k.includes('responses') || k.includes('attachments') || k.includes('milestones')) return ['sample'];
  if (k.endsWith('id') || k.includes('token')) return 'sample-id';
  if (k.includes('code')) return 'CODE-001';
  if (k.includes('number')) return 'NUM-001';
  if (k.includes('status')) return 'DRAFT';
  if (k.includes('type')) return 'GENERAL';
  if (k.includes('name') || k.includes('title')) return 'Sample Name';
  if (k.includes('description') || k.includes('justification') || k.includes('comment') || k.includes('notes') || k.includes('terms') || k.includes('scope')) return 'Sample text';
  if (k.includes('department')) return 'dept001';
  if (k.includes('project')) return 'proj001';
  if (k.includes('category')) return 'General';
  if (k.includes('role')) return 'ADMIN';
  if (k.includes('address')) return 'Muscat, Oman';
  return 'sample';
}

function guessParamValue(param) {
  const p = (param || '').toLowerCase();
  if (p === 'page') return '1';
  if (p === 'limit') return '10';
  if (p === 'offset') return '0';
  if (p.includes('include') || p.includes('only') || p.includes('download') || p.includes('export')) return 'true';
  if (p.includes('token')) return 'sample-token';
  if (p.endsWith('id')) return 'sample-id';
  if (p.includes('search') || p === 'q') return 'sample';
  if (p.includes('sort')) return 'createdAt';
  if (p.includes('order')) return 'desc';
  if (p.includes('status')) return 'DRAFT';
  if (p.includes('type')) return 'GENERAL';
  if (p === 'from' || p === 'datefrom' || p === 'start' || p === 'startdate') return '2026-03-01';
  if (p === 'to' || p === 'dateto' || p === 'end' || p === 'enddate') return '2026-03-31';
  if (p.includes('date')) return '2026-03-18';
  return 'sample';
}

function rawWithQuery(urlRaw, query) {
  if (!query.length) return urlRaw;
  const qs = query.map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(String(q.value ?? ''))}`).join('&');
  return `${urlRaw}?${qs}`;
}

function buildBodyExample(keys) {
  const obj = {};
  for (const key of keys) obj[key] = guessValueForKey(key);
  return obj;
}

function hasJsonBody(block) {
  return /request\.json\(\s*\)/.test(block);
}

function hasFormDataBody(block) {
  return /request\.formData\(\s*\)/.test(block);
}

function needsAuthHeader(block, routePath) {
  return true;
}

function folderForRoute(routePath) {
  const parts = routePath.split('/').filter(Boolean);
  if (parts.length >= 3 && parts[1] === 'finance') return parts[2];
  return parts.length >= 2 ? parts[1] : 'misc';
}

function toPostmanUrl(rawPath) {
  return `${BASE_URL}${rawPath}`;
}

function makeRequestItem(endpoint) {
  const headers = [];
  if (endpoint.authHeader) {
    headers.push({ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' });
  }

  let body;
  if (endpoint.formDataFields.length > 0) {
    body = {
      mode: 'formdata',
      formdata: endpoint.formDataFields.map((f) => ({ key: f, value: '', type: 'text' })),
    };
  } else if (endpoint.bodyKeys.length > 0 || endpoint.hasJsonBody) {
    headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
    body = {
      mode: 'raw',
      raw: JSON.stringify(buildBodyExample(endpoint.bodyKeys), null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  const query = endpoint.queryParams.map((p) => ({ key: p, value: guessParamValue(p) }));

  const request = {
    method: endpoint.method,
    header: headers,
    url: {
      raw: rawWithQuery(toPostmanUrl(endpoint.routePath), query),
      protocol: BASE_URL_OBJ.protocol.replace(':', ''),
      host: BASE_URL_OBJ.hostname.split('.'),
      path: endpoint.routePath.replace(/^\//, '').split('/'),
      query,
      variable: endpoint.pathParams.map((p) => ({ key: p, value: guessParamValue(p) })),
    },
    description: [
      `Source: ${endpoint.sourceRel}`,
      endpoint.pathParams.length ? `Path Params: ${endpoint.pathParams.join(', ')}` : 'Path Params: none',
      endpoint.queryParams.length ? `Query Params: ${endpoint.queryParams.join(', ')}` : 'Query Params: none',
      endpoint.requiredBodyKeys.length ? `Required Body Keys (heuristic): ${endpoint.requiredBodyKeys.join(', ')}` : 'Required Body Keys (heuristic): none',
    ].join('\n'),
  };

  if (endpoint.authHeader) {
    request.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
    };
  }

  if (body) request.body = body;

  return {
    name: `${endpoint.method} ${endpoint.routePath}`,
    request,
    response: [],
  };
}

function generateDocs(endpoints) {
  const lines = [];
  lines.push('# Bright Finance API - Postman Documentation');
  lines.push('');
  lines.push(`Base URL: ${BASE_URL}`);
  lines.push('');
  lines.push('Notes:');
  lines.push('- This documentation is generated by scanning `src/app/api/finance/**/route.ts`.');
  lines.push('- Required body fields are inferred heuristically from route validations.');
  lines.push('- For protected APIs use `Authorization: Bearer <token>`.');
  lines.push('');

  const grouped = endpoints.reduce((acc, e) => {
    const g = folderForRoute(e.routePath);
    if (!acc[g]) acc[g] = [];
    acc[g].push(e);
    return acc;
  }, {});

  const groups = Object.keys(grouped).sort();
  for (const group of groups) {
    lines.push(`## ${group}`);
    lines.push('');
    const items = grouped[group].sort((a, b) => a.routePath.localeCompare(b.routePath) || a.method.localeCompare(b.method));
    for (const e of items) {
      lines.push(`### ${e.method} ${e.routePath}`);
      lines.push('');
      lines.push(`- Source: \`${e.sourceRel}\``);
      lines.push(`- Full URL: \`${BASE_URL}${e.routePath}\``);
      lines.push(`- Headers:`);
      if (e.authHeader) lines.push(`  - Authorization: Bearer <token>`);
      if (e.bodyKeys.length > 0 || e.hasJsonBody) lines.push(`  - Content-Type: application/json`);
      if (!e.authHeader && !(e.bodyKeys.length > 0 || e.hasJsonBody)) lines.push(`  - None`);
      lines.push(`- Path Params: ${e.pathParams.length ? e.pathParams.map((p) => `\`${p}\``).join(', ') : 'None'}`);
      lines.push(`- Query Params: ${e.queryParams.length ? e.queryParams.map((p) => `\`${p}\``).join(', ') : 'None'}`);

      if (e.formDataFields.length) {
        lines.push(`- Body (form-data): ${e.formDataFields.map((f) => `\`${f}\``).join(', ')}`);
      } else if (e.bodyKeys.length || e.hasJsonBody) {
        const body = buildBodyExample(e.bodyKeys);
        lines.push(`- Body (JSON):`);
        lines.push('```json');
        lines.push(JSON.stringify(body, null, 2));
        lines.push('```');
      } else {
        lines.push(`- Body: None`);
      }

      if (e.requiredBodyKeys.length) {
        lines.push(`- Required Body Keys (heuristic): ${e.requiredBodyKeys.map((k) => `\`${k}\``).join(', ')}`);
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(API_ROOT)) {
    console.error('API root not found:', API_ROOT);
    process.exit(1);
  }

  const files = walk(API_ROOT);
  const endpoints = [];

  for (const file of files) {
    const sourceRel = toPosix(path.relative(ROOT, file));
    const routePath = routePathFromFile(file);
    const content = fs.readFileSync(file, 'utf8');
    const methods = getMethodBlocks(content);

    for (const m of methods) {
      const queryParams = extractQueryParams(m.block);
      const bodyKeys = extractBodyKeys(m.block);
      const requiredBodyKeys = extractRequiredKeys(m.block, bodyKeys);
      const formDataFields = extractFormDataFields(m.block);
      endpoints.push({
        sourceRel,
        routePath,
        method: m.method,
        pathParams: pathParamsFromRoute(routePath),
        queryParams,
        bodyKeys,
        requiredBodyKeys,
        formDataFields,
        hasJsonBody: hasJsonBody(m.block),
        authHeader: needsAuthHeader(m.block, routePath),
      });
    }
  }

  endpoints.sort((a, b) => a.routePath.localeCompare(b.routePath) || a.method.localeCompare(b.method));

  const grouped = endpoints.reduce((acc, e) => {
    const key = folderForRoute(e.routePath);
    if (!acc[key]) acc[key] = [];
    acc[key].push(makeRequestItem(e));
    return acc;
  }, {});

  const postmanCollection = {
    info: {
      name: 'Bright Finance API',
      _postman_id: 'a8ee5c16-927b-4f55-87f8-bcbf22689337',
      description: 'Auto-generated from src/app/api/finance route handlers. Single-import variant with embedded variables.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: BASE_URL },
      { key: 'token', value: 'paste-jwt-token-here' },
    ],
    item: Object.keys(grouped)
      .sort()
      .map((group) => ({ name: group, item: grouped[group] })),
  };

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'bright-finance-single-import.postman_collection.json'), JSON.stringify(postmanCollection, null, 2));

  const md = generateDocs(endpoints);
  fs.writeFileSync(path.join(OUT_DIR, 'FINANCE_API_DOCUMENTATION.md'), md);

  console.log(`Generated endpoints: ${endpoints.length}`);
  console.log('Collection (single import): docs/postman/bright-finance-single-import.postman_collection.json');
  console.log('Markdown: docs/postman/FINANCE_API_DOCUMENTATION.md');
}

main();
