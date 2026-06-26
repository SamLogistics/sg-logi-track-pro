import fs from 'node:fs';
import path from 'node:path';

const INPUT = process.argv[2] || String.raw`x:\Sam\Logi Track\Logi Track Tables\JobRecord_export.csv`;
const OUTPUT = process.argv[3] || INPUT.replace(/\.csv$/i, '_supabase.csv');

const DROP_COLUMNS = new Set([
  'id',
  'created_by_id',
  'created_by',
  'is_sample',
]);

const RENAME_COLUMNS = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

const DATE_COLUMNS = new Set([
  'escort_date',
  'truck_out_date',
  'delivery_date',
  'trucking_date',
  'return_date',
  'ccp_valid_date',
  'vessel_eta',
  'port_in_date',
  'lld_date',
]);

const TIMESTAMP_COLUMNS = new Set(['created_at', 'updated_at']);

const ARRAY_COLUMNS = new Set(['remarks', 'lcl_remarks', 'lld_remarks']);

const JSON_OBJECT_COLUMNS = new Set([
  'remark_prices',
  'lcl_remark_prices',
  'lld_remark_prices',
]);

const JSON_ARRAY_COLUMNS = new Set(['export_containers']);

const BOOLEAN_COLUMNS = new Set([
  'is_export',
  'portnet_released',
  'is_out_of_gauge',
  'escort_required',
  'billed',
  'lcl_crane',
  'lcl_tailgate',
  'lcl_attendant',
]);

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

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  return trimmed;
}

function convertTimestamp(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  const normalized = trimmed.replace(/(\.\d{3})\d+$/, '$1');
  const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return trimmed;

  return date.toISOString();
}

function convertArray(value) {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed === '[]') return '{}';

  try {
    const items = JSON.parse(trimmed);
    if (!Array.isArray(items)) return '{}';
    const escaped = items.map((item) => `"${String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
    return `{${escaped.join(',')}}`;
  } catch {
    return trimmed;
  }
}

function normalizeJsonNumbers(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonNumbers);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeJsonNumbers(nested)])
    );
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

function convertJsonObject(value) {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed === '{}') return '{}';

  try {
    return JSON.stringify(normalizeJsonNumbers(JSON.parse(trimmed)));
  } catch {
    return trimmed;
  }
}

function convertExportContainers(value) {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed === '[]') return '[]';

  try {
    const parsed = normalizeJsonNumbers(JSON.parse(trimmed));
    return JSON.stringify(parsed);
  } catch {
    return trimmed;
  }
}

function convertBoolean(value) {
  const trimmed = (value || '').trim().toLowerCase();
  if (!trimmed) return 'false';
  if (trimmed === 'true' || trimmed === 't' || trimmed === '1') return 'true';
  return 'false';
}

function convertValue(header, value) {
  const trimmed = (value || '').trim();

  if (BOOLEAN_COLUMNS.has(header)) return convertBoolean(trimmed);
  if (DATE_COLUMNS.has(header)) return convertDdMmYyyy(trimmed);
  if (TIMESTAMP_COLUMNS.has(header)) return convertTimestamp(trimmed);
  if (ARRAY_COLUMNS.has(header)) return convertArray(trimmed);
  if (JSON_OBJECT_COLUMNS.has(header)) return convertJsonObject(trimmed);
  if (JSON_ARRAY_COLUMNS.has(header)) return convertExportContainers(trimmed);

  return trimmed;
}

const raw = fs.readFileSync(INPUT, 'utf8').replace(/^\uFEFF/, '');
const rows = parseCsv(raw);
const sourceHeaders = rows[0];

const headerIndex = sourceHeaders
  .map((header, index) => ({ header: header.trim(), index }))
  .filter(({ header }) => header && !DROP_COLUMNS.has(header))
  .map(({ header, index }) => ({
    sourceHeader: header,
    outputHeader: RENAME_COLUMNS[header] || header,
    index,
  }));

const outputHeaders = headerIndex.map(({ outputHeader }) => outputHeader);
const converted = [outputHeaders];

for (const row of rows.slice(1)) {
  converted.push(
    headerIndex.map(({ outputHeader, index }) =>
      convertValue(outputHeader, row[index])
    )
  );
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, toCsv(converted), 'utf8');

console.log(`Converted ${converted.length - 1} rows`);
console.log(`Output: ${OUTPUT}`);
