import fs from 'node:fs';
import path from 'node:path';

const INPUT = process.argv[2] || String.raw`x:\Sam\Logi Track\Logi Track Tables\SWProjectRecord_export.csv`;
const OUTPUT = process.argv[3] || INPUT.replace(/\.csv$/i, '_supabase.csv');

const DATE_COLUMNS = new Set([
  'out_gate_date',
  'ccp_valid_date',
  'empty_date',
  'truck_out_date',
  'trucking_date',
  'return_date',
]);

const TIMESTAMP_COLUMNS = new Set(['created_at', 'updated_at']);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || (char === '\r' && text[i + 1] === '\n')) {
      if (char === '\r') i += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function escapeCsv(value) {
  const text = value ?? '';
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n') + '\n';
}

function convertDdMmYyyy(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return trimmed;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function convertTimestamp(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  const normalized = trimmed.replace(/(\.\d{3})\d+$/, '$1');
  const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return trimmed;

  return date.toISOString();
}

function convertRemarks(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '{}';

  try {
    const items = JSON.parse(trimmed);
    if (!Array.isArray(items)) return '{}';
    const escaped = items.map((item) => `"${String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
    return `{${escaped.join(',')}}`;
  } catch {
    return trimmed;
  }
}

function convertRemarkPrices(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '{}';

  try {
    const parsed = JSON.parse(trimmed);
    const normalized = Object.fromEntries(
      Object.entries(parsed).map(([key, amount]) => [key, Number(amount)])
    );
    return JSON.stringify(normalized);
  } catch {
    return trimmed;
  }
}

const raw = fs.readFileSync(INPUT, 'utf8').replace(/^\uFEFF/, '');
const rows = parseCsv(raw);
const headers = rows[0];
const dataRows = rows.slice(1);

const converted = [headers];

for (const row of dataRows) {
  const record = headers.map((header, index) => {
    const value = row[index] ?? '';

    if (DATE_COLUMNS.has(header)) return convertDdMmYyyy(value);
    if (TIMESTAMP_COLUMNS.has(header)) return convertTimestamp(value);
    if (header === 'remarks') return convertRemarks(value);
    if (header === 'remark_prices') return convertRemarkPrices(value);
    return value.trim();
  });

  converted.push(record);
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, toCsv(converted), 'utf8');

console.log(`Converted ${dataRows.length} rows`);
console.log(`Output: ${OUTPUT}`);
