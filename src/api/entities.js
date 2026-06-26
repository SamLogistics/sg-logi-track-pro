import { supabase } from '@/api/supabaseClient';

const SORT_COLUMN_MAP = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

function parseSort(sort) {
  if (!sort) return { column: 'created_at', ascending: false };
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  return {
    column: SORT_COLUMN_MAP[field] || field,
    ascending: !descending,
  };
}

function toLegacyRow(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}

function stripSystemFields(payload) {
  const {
    id,
    created_at,
    updated_at,
    created_date,
    updated_date,
    created_by,
    ...rest
  } = payload;
  return rest;
}

function sanitizePayload(payload) {
  const cleaned = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (value === '') {
      cleaned[key] = null;
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

async function list(table, sort) {
  const { column, ascending } = parseSort(sort);
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(column, { ascending });

  if (error) throw error;
  return (data || []).map(toLegacyRow);
}

async function create(table, payload) {
  const { data: authData } = await supabase.auth.getUser();
  const insertPayload = sanitizePayload({
    ...stripSystemFields(payload),
    ...(authData.user ? { created_by: authData.user.id } : {}),
  });

  const { data, error } = await supabase
    .from(table)
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return toLegacyRow(data);
}

async function update(table, id, payload) {
  const { data, error } = await supabase
    .from(table)
    .update(sanitizePayload(stripSystemFields(payload)))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toLegacyRow(data);
}

async function remove(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

function makeEntity(table, defaultSort) {
  return {
    list: (sort = defaultSort) => list(table, sort),
    create: (data) => create(table, data),
    update: (id, data) => update(table, id, data),
    delete: (id) => remove(table, id),
  };
}

export const entities = {
  JobRecord: makeEntity('job_records', '-created_date'),
  SWProjectRecord: makeEntity('sw_project_records', '-created_date'),
  DepotCharge: makeEntity('depot_charges', '-updated_date'),
  SWDeliveryAddress: makeEntity('sw_delivery_addresses', 'name'),
};
