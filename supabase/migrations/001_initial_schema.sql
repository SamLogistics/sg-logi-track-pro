-- Logi Track: initial Supabase schema migrated from base44/entities/*.jsonc
-- Run via Supabase CLI (supabase db push) or paste into SQL Editor in the dashboard.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users — replaces base44 User entity)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "Profiles: users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Profiles: admins can update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Depot charges (base44/entities/DepotCharge.jsonc)
-- Read: all authenticated users. Write: admins only.
-- ---------------------------------------------------------------------------
create table public.depot_charges (
  id uuid primary key default gen_random_uuid(),
  depot_name text not null,
  dhc_charge numeric not null,
  admin_charge numeric,
  additional_charges numeric,
  currency text not null default 'SGD',
  notes text,
  pending_dhc_charge numeric,
  pending_admin_charge numeric,
  pending_additional_charges numeric,
  pending_effective_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index depot_charges_depot_name_idx on public.depot_charges (depot_name);
create index depot_charges_updated_at_idx on public.depot_charges (updated_at desc);

create trigger depot_charges_set_updated_at
  before update on public.depot_charges
  for each row execute function public.set_updated_at();

alter table public.depot_charges enable row level security;

create policy "Depot charges: authenticated read"
  on public.depot_charges for select
  to authenticated
  using (true);

create policy "Depot charges: admin insert"
  on public.depot_charges for insert
  to authenticated
  with check (public.is_admin());

create policy "Depot charges: admin update"
  on public.depot_charges for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Depot charges: admin delete"
  on public.depot_charges for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- SW delivery addresses (base44/entities/SWDeliveryAddress.jsonc)
-- ---------------------------------------------------------------------------
create table public.sw_delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  postal_code text,
  pic_name text,
  pic_contact text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index sw_delivery_addresses_name_idx on public.sw_delivery_addresses (name);

create trigger sw_delivery_addresses_set_updated_at
  before update on public.sw_delivery_addresses
  for each row execute function public.set_updated_at();

alter table public.sw_delivery_addresses enable row level security;

create policy "SW addresses: authenticated read"
  on public.sw_delivery_addresses for select
  to authenticated
  using (true);

create policy "SW addresses: authenticated insert"
  on public.sw_delivery_addresses for insert
  to authenticated
  with check (true);

create policy "SW addresses: authenticated update"
  on public.sw_delivery_addresses for update
  to authenticated
  using (true)
  with check (true);

create policy "SW addresses: authenticated delete"
  on public.sw_delivery_addresses for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- SW project records (base44/entities/SWProjectRecord.jsonc)
-- ---------------------------------------------------------------------------
create table public.sw_project_records (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('40FT FCL', '20FT FCL')),
  vendor text,
  vessel text,
  voy text,
  container_number text,
  ccp text,
  ccp_valid_date date,
  out_gate_date date,
  trucking_date date,
  empty_date date,
  truck_out_date date,
  return_date date,
  return_depot text,
  container_vgm numeric,
  delivery_address_name text,
  delivery_address text,
  delivery_postal_code text,
  pic_name text,
  pic_contact text,
  remarks text[] not null default '{}',
  remark_prices jsonb not null default '{}',
  remarks_text text,
  status text not null default 'Pending' check (
    status in ('Pending', 'In Progress', 'Ready to Bill', 'Completed')
  ),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index sw_project_records_created_at_idx on public.sw_project_records (created_at desc);
create index sw_project_records_status_idx on public.sw_project_records (status);

create trigger sw_project_records_set_updated_at
  before update on public.sw_project_records
  for each row execute function public.set_updated_at();

alter table public.sw_project_records enable row level security;

create policy "SW projects: authenticated read"
  on public.sw_project_records for select
  to authenticated
  using (true);

create policy "SW projects: authenticated insert"
  on public.sw_project_records for insert
  to authenticated
  with check (true);

create policy "SW projects: authenticated update"
  on public.sw_project_records for update
  to authenticated
  using (true)
  with check (true);

create policy "SW projects: authenticated delete"
  on public.sw_project_records for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Job records (base44/entities/JobRecord.jsonc)
-- ---------------------------------------------------------------------------
create table public.job_records (
  id uuid primary key default gen_random_uuid(),

  is_export boolean not null default false,
  job_type text not null check (job_type in (
    '40FT FCL', '20FT FCL', '20TK', '40TK', 'OOG',
    '20FT FR', '40FT FR', '40OT', '20OT', 'LCL',
    'Local Delivery', 'Local 40ft Trailer', 'Local 20ft Trailer',
    'Cross Border Transport', 'Local Lorry Delivery'
  )),

  customer_name text,
  customer_ref text,
  bl_number text,
  export_containers jsonb not null default '[]',

  ccp text,
  ccp_valid_date date,
  portnet_released boolean not null default false,

  vendor text,
  vendor_invoice_number text,
  vendor_invoice_amount numeric,
  carrier text,
  vessel text,
  voy text,
  berthing_port text,
  container_number text,

  vessel_eta date,
  trucking_date date,
  delivery_date date,
  truck_out_date date,
  return_date date,
  port_in_date date,

  return_depot text,
  delivery_postal_code text,
  delivery_address text,
  delivery_unit text,
  pic_name text,
  pic_contact text,

  container_vgm numeric,
  is_out_of_gauge boolean not null default false,
  escort_required boolean not null default false,
  escort_date date,
  escort_time text,

  remarks text[] not null default '{}',
  remark_prices jsonb not null default '{}',
  remarks_text text,

  status text not null default 'Pending' check (
    status in ('Pending', 'In Progress', 'Ready to Bill', 'Completed')
  ),
  billed boolean not null default false,
  invoice_number text,
  invoice_amount numeric,
  invoice_to text,
  sysfreight_job_number text,

  lcl_vehicle_size text check (lcl_vehicle_size is null or lcl_vehicle_size in ('Van', '14ft', '20ft', '24ft')),
  lcl_crane boolean not null default false,
  lcl_tailgate boolean not null default false,
  lcl_box_or_open text check (lcl_box_or_open is null or lcl_box_or_open in ('Box', 'Open')),
  lcl_attendant boolean not null default false,
  lcl_attendant_count numeric,
  lcl_job_start_time text,
  lcl_job_end_time text,
  lcl_collection_postal text,
  lcl_collection_address text,
  lcl_delivery_postal text,
  lcl_delivery_address text,
  lcl_remarks text[] not null default '{}',
  lcl_remark_prices jsonb not null default '{}',
  lcl_invoice_to text,
  lcl_distance_km text,

  lld_date date,
  lld_pickup_point text,
  lld_pickup_time text,
  lld_pickup_postal text,
  lld_pickup_address text,
  lld_pickup_pic_name text,
  lld_pickup_pic_contact text,
  lld_dropoff_postal text,
  lld_dropoff_address text,
  lld_dropoff_pic_name text,
  lld_dropoff_pic_contact text,
  lld_lorry_number text,
  lld_driver_name text,
  lld_driver_contact text,
  lld_assistant_name text,
  lld_assistant_contact text,
  lld_job_notes text,
  lld_remarks text[] not null default '{}',
  lld_remark_prices jsonb not null default '{}',
  lld_ot_start_time text,
  lld_ot_end_time text,
  lld_ot_hours_manual numeric,
  lld_ot_hourly_rate numeric,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index job_records_created_at_idx on public.job_records (created_at desc);
create index job_records_status_idx on public.job_records (status);
create index job_records_job_type_idx on public.job_records (job_type);
create index job_records_return_depot_idx on public.job_records (return_depot);

create trigger job_records_set_updated_at
  before update on public.job_records
  for each row execute function public.set_updated_at();

alter table public.job_records enable row level security;

create policy "Job records: authenticated read"
  on public.job_records for select
  to authenticated
  using (true);

create policy "Job records: authenticated insert"
  on public.job_records for insert
  to authenticated
  with check (true);

create policy "Job records: authenticated update"
  on public.job_records for update
  to authenticated
  using (true)
  with check (true);

create policy "Job records: authenticated delete"
  on public.job_records for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Compatibility views (optional — map Supabase column names to Base44 names)
-- Use during migration if you want to avoid renaming every frontend field.
-- Drop once the app uses created_at / updated_at directly.
-- ---------------------------------------------------------------------------
create or replace view public.job_records_legacy as
select
  *,
  created_at as created_date,
  updated_at as updated_date
from public.job_records;

create or replace view public.sw_project_records_legacy as
select
  *,
  created_at as created_date,
  updated_at as updated_date
from public.sw_project_records;

create or replace view public.depot_charges_legacy as
select
  *,
  created_at as created_date,
  updated_at as updated_date
from public.depot_charges;

create or replace view public.sw_delivery_addresses_legacy as
select
  *,
  created_at as created_date,
  updated_at as updated_date
from public.sw_delivery_addresses;
