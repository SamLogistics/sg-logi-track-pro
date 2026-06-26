import React, { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Copy, ChevronDown, ChevronRight, AlertTriangle, Receipt, FileText, ClipboardCheck } from 'lucide-react';
import JobTypeBadge from './JobTypeBadge';
import StatusBadge from './StatusBadge';

const OOG_TYPES = ["40OT", "20OT", "40FT FR", "20FT FR"];

function fmt(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yy'); } catch { return d; }
}

// Calculate total charges for billing reference
function calcCharges(job, depots) {
  const depot = depots.find(d => d.depot_name === job.return_depot);
  const depotTotal = depot ? (depot.dhc_charge || 0) + (depot.admin_charge || 0) + (depot.additional_charges || 0) : 0;
  const remarkTotal = (job.remarks || []).reduce((sum, r) => sum + (parseFloat(job.remark_prices?.[r]) || 0), 0);
  const lclRemarkTotal = (job.lcl_remarks || []).reduce((sum, r) => sum + (parseFloat(job.lcl_remark_prices?.[r]) || 0), 0);
  const lldRemarkTotal = (job.lld_remarks || []).reduce((sum, r) => sum + (parseFloat(job.lld_remark_prices?.[r]) || 0), 0);
  return { depotTotal, remarkTotal: remarkTotal + lclRemarkTotal + lldRemarkTotal, depot };
}

function ChassisBadge({ job }) {
  if (job.is_export) {
    // For export: show worst-case chassis across containers (truck_in → port_in per container)
    if (!job.trucking_date || !job.export_containers?.length) return null;
    const maxDays = Math.max(...job.export_containers.map(c =>
      c.port_in_date ? Math.round((new Date(c.port_in_date) - new Date(job.trucking_date)) / 86400000) : -1
    ));
    if (maxDays < 0) return null;
    const over = maxDays > 3;
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold border ${over ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
        {maxDays}d{over ? ' ⚠' : ''}
      </span>
    );
  }
  // Import: truck_in → truck_out
  const start = job.trucking_date;
  const end = job.truck_out_date;
  if (!start || !end) return null;
  const days = Math.round((new Date(end) - new Date(start)) / 86400000);
  if (days < 0) return null;
  const over = days > 3;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold border ${over ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
      {days}d{over ? ' ⚠' : ''}
    </span>
  );
}

function ChargesSummary({ job, depots }) {
  const { depotTotal, remarkTotal, depot } = calcCharges(job, depots);
  const hasInv = !!job.invoice_amount;
  const hasVendor = !!job.vendor_invoice_amount;
  const hasCharges = depotTotal > 0 || remarkTotal > 0 || hasInv || hasVendor;

  if (!hasCharges) return <span className="text-muted-foreground text-xs">—</span>;

  const inv = parseFloat(job.invoice_amount) || 0;
  const vnd = parseFloat(job.vendor_invoice_amount) || 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {hasInv && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 border border-green-200 text-green-700">
          INV {inv.toFixed(0)}
        </span>
      )}
      {hasVendor && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700">
          VND {vnd.toFixed(0)}
        </span>
      )}
      {remarkTotal > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-50 border border-orange-200 text-orange-700">
          +{remarkTotal.toFixed(0)}
        </span>
      )}
      {depotTotal > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 border border-purple-200 text-purple-700">
          DHC {depotTotal.toFixed(0)}
        </span>
      )}
    </div>
  );
}

function ExpandedDetail({ job, depots }) {
  const depot = depots.find(d => d.depot_name === job.return_depot);
  const depotTotal = depot ? (depot.dhc_charge || 0) + (depot.admin_charge || 0) + (depot.additional_charges || 0) : 0;
  const inv = parseFloat(job.invoice_amount) || 0;
  const vnd = parseFloat(job.vendor_invoice_amount) || 0;
  const profit = inv > 0 && vnd > 0 ? inv - vnd : null;

  return (
    <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-border text-sm space-y-3">

      {/* Key details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-1.5">
        {job.customer_name && <div><span className="text-muted-foreground">Customer: </span><span className="font-medium">{job.customer_name}</span></div>}
        {job.customer_ref && <div><span className="text-muted-foreground">Ref: </span><span className="font-medium">{job.customer_ref}</span></div>}
        {job.bl_number && <div><span className="text-muted-foreground">BL#: </span><span className="font-mono font-medium">{job.bl_number}</span></div>}
        {job.carrier && <div><span className="text-muted-foreground">Carrier: </span><span className="font-medium">{job.carrier}</span></div>}
        {job.berthing_port && <div><span className="text-muted-foreground">Berth: </span><span className="font-medium">{job.berthing_port}</span></div>}
        {job.vessel_eta && <div><span className="text-muted-foreground">ETA: </span><span className="font-medium">{fmt(job.vessel_eta)}</span></div>}
        {job.trucking_date && <div><span className="text-muted-foreground">Truck In: </span><span className="font-medium">{fmt(job.trucking_date)}</span></div>}
        {job.delivery_date && <div><span className="text-muted-foreground">Delivery: </span><span className="font-medium">{fmt(job.delivery_date)}</span></div>}
        {job.truck_out_date && <div><span className="text-muted-foreground">Truck Out: </span><span className="font-medium">{fmt(job.truck_out_date)}</span></div>}
        {/* CCP — import only */}
        {!job.is_export && job.ccp && <div><span className="text-muted-foreground">CCP: </span><span className="font-medium">{job.ccp}{job.ccp_valid_date ? ` (til ${fmt(job.ccp_valid_date)})` : ''}</span></div>}
        {job.pic_name && <div><span className="text-muted-foreground">PIC: </span><span className="font-medium">{job.pic_name}{job.pic_contact ? ` · ${job.pic_contact}` : ''}</span></div>}
        {job.container_vgm && <div><span className="text-muted-foreground">VGM: </span><span className="font-semibold text-amber-600">{job.container_vgm} KG</span></div>}
        {job.sysfreight_job_number && <div><span className="text-muted-foreground">SF Job#: </span><span className="font-medium">{job.sysfreight_job_number}</span></div>}
      </div>

      {/* Billing section */}
      <div className="rounded-lg border border-border bg-white p-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Billing Summary</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5">
          {job.invoice_number && <div><span className="text-muted-foreground">INV#: </span><span className="font-medium">{job.invoice_number}</span></div>}
          {inv > 0 && <div><span className="text-muted-foreground">Invoice Amt: </span><span className="font-semibold text-green-700">SGD {inv.toFixed(2)}</span></div>}
          {job.vendor_invoice_number && <div><span className="text-muted-foreground">Vendor INV#: </span><span className="font-medium">{job.vendor_invoice_number}</span></div>}
          {vnd > 0 && <div><span className="text-muted-foreground">Vendor Amt: </span><span className="font-semibold text-blue-700">SGD {vnd.toFixed(2)}</span></div>}
        </div>

        {/* Remarks / charges */}
        {(() => {
          const allRemarks = [
            ...(job.remarks || []).map(r => ({ r, price: job.remark_prices?.[r] })),
            ...(job.lcl_remarks || []).map(r => ({ r, price: job.lcl_remark_prices?.[r] })),
            ...(job.lld_remarks || []).map(r => ({ r, price: job.lld_remark_prices?.[r] })),
          ];
          if (allRemarks.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
              {allRemarks.map(({ r, price }, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200 border">
                  {r}{price ? `: SGD ${Number(price).toFixed(2)}` : ''}
                </Badge>
              ))}
            </div>
          );
        })()}

        {/* Depot charges */}
        {depot && depotTotal > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border text-xs">
            <span className="text-muted-foreground font-medium">{job.is_export ? 'Collection' : 'Return'} Depot: <span className="text-foreground">{job.return_depot}</span></span>
            <span className="text-muted-foreground">DHC: <span className="font-semibold text-foreground">{(depot.dhc_charge || 0).toFixed(2)}</span></span>
            {(depot.admin_charge || 0) > 0 && <span className="text-muted-foreground">Admin: <span className="font-semibold text-foreground">{depot.admin_charge.toFixed(2)}</span></span>}
            {(depot.additional_charges || 0) > 0 && <span className="text-muted-foreground">Additional: <span className="font-semibold text-foreground">{depot.additional_charges.toFixed(2)}</span></span>}
            <span className="font-bold text-purple-700 border-l border-border pl-3">{depot.currency || 'SGD'} {depotTotal.toFixed(2)}</span>
          </div>
        )}
        {job.return_depot && !depot && (
          <div className="text-xs text-muted-foreground pt-1 border-t border-border">{job.is_export ? 'Collection' : 'Return'} Depot: {job.return_depot}</div>
        )}

        {/* Profit/Loss */}
        {profit !== null && (
          <div className={`flex items-center justify-between px-3 py-1.5 rounded-md border text-sm mt-1 ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span className={`font-medium ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{profit >= 0 ? 'Profit' : 'Loss'}</span>
            <span className={`font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>SGD {profit.toFixed(2)}</span>
          </div>
        )}

        {job.remarks_text && <p className="text-xs text-muted-foreground italic pt-1">{job.remarks_text}</p>}
      </div>

      {/* Flags / Alerts */}
      <div className="flex flex-wrap gap-2">
        {job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && !job.is_export && (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${job.portnet_released ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${job.portnet_released ? 'bg-green-500' : 'bg-red-500'}`} />
            Portnet {job.portnet_released ? 'Released' : 'Not Released'}
          </span>
        )}
        {/* CCP alert — import only */}
        {!job.is_export && !job.ccp && job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium bg-amber-50 border-amber-200 text-amber-700">
            <FileText className="w-3 h-3" /> CCP Missing
          </span>
        )}
        {OOG_TYPES.includes(job.job_type) && job.is_out_of_gauge && (
          <>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium bg-red-50 border-red-200 text-red-700">
              <AlertTriangle className="w-3 h-3" /> Out of Gauge
            </span>
            {job.escort_required && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium bg-orange-50 border-orange-200 text-orange-700">
                Escort: {job.escort_date ? fmt(job.escort_date) : ''} {job.escort_time || ''}
              </span>
            )}
          </>
        )}
        <ChassisBadge job={job} />
      </div>

      {/* Delivery Address */}
      {(job.delivery_address || job.delivery_postal_code) && (
        <div><span className="text-muted-foreground">Delivery: </span><span className="font-medium">{job.delivery_address || job.delivery_postal_code}</span></div>
      )}

      {/* Export containers */}
      {job.is_export && job.export_containers && job.export_containers.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Containers ({job.export_containers.length})</div>
          <div className="flex flex-col gap-1">
            {job.export_containers.map((c, i) => {
              // Chassis days = Truck In (job.trucking_date) → Port In (per container)
              const cd = (job.trucking_date && c.port_in_date) ? Math.round((new Date(c.port_in_date) - new Date(job.trucking_date)) / 86400000) : null;
              const over = cd !== null && cd > 3;
              return (
                <div key={i} className="flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs">
                  <span className="font-mono font-bold text-blue-800">{c.container_number || `#${i + 1}`}</span>
                  {c.vgm && <span className="text-blue-500">{c.vgm} KG</span>}
                  {c.truck_out_date && <span>Truck Out: <span className="font-medium">{fmt(c.truck_out_date)}</span></span>}
                  {c.port_in_date && <span>Port In: <span className="font-medium">{fmt(c.port_in_date)}</span></span>}
                  {cd !== null && <span className={`px-1.5 py-0.5 rounded font-semibold border ${over ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>{cd}d{over ? ` ⚠ +${cd - 3}d` : ''}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LCL extras */}
      {job.job_type === 'LCL' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
          {job.lcl_vehicle_size && <div><span className="text-muted-foreground">Vehicle: </span><span className="font-medium">{job.lcl_vehicle_size} {job.lcl_box_or_open || ''}</span></div>}
          {job.lcl_job_start_time && <div><span className="text-muted-foreground">Time: </span><span className="font-medium">{job.lcl_job_start_time}–{job.lcl_job_end_time || ''}</span></div>}
          {job.lcl_collection_address && <div className="col-span-2"><span className="text-muted-foreground">Collect: </span><span className="font-medium">{job.lcl_collection_address}</span></div>}
          {job.lcl_delivery_address && <div className="col-span-2"><span className="text-muted-foreground">Deliver: </span><span className="font-medium">{job.lcl_delivery_address}</span></div>}
          {job.lcl_distance_km && <div><span className="text-muted-foreground">Distance: </span><span className="font-medium">{job.lcl_distance_km}</span></div>}
        </div>
      )}

      {/* LLD extras */}
      {job.job_type === 'Local Lorry Delivery' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
          {job.lld_lorry_number && <div><span className="text-muted-foreground">Lorry: </span><span className="font-mono font-medium">{job.lld_lorry_number}</span></div>}
          {job.lld_driver_name && <div><span className="text-muted-foreground">Driver: </span><span className="font-medium">{job.lld_driver_name}{job.lld_driver_contact ? ` · ${job.lld_driver_contact}` : ''}</span></div>}
          {job.lld_pickup_point && <div className="col-span-2"><span className="text-muted-foreground">Pickup: </span><span className="font-medium">{job.lld_pickup_point}{job.lld_pickup_time ? ` · ${job.lld_pickup_time}` : ''}</span></div>}
          {job.lld_dropoff_address && <div className="col-span-2"><span className="text-muted-foreground">Drop-off: </span><span className="font-medium">{job.lld_dropoff_address}</span></div>}
          {job.lld_job_notes && <div className="col-span-3 text-muted-foreground italic">{job.lld_job_notes}</div>}
        </div>
      )}
    </div>
  );
}

// Determine the primary display date for a job (for sorting & display)
function primaryDate(job) {
  if (job.job_type === 'Local Lorry Delivery') return job.lld_date;
  if (job.job_type === 'LCL') return job.created_date;
  if (job.is_export) return job.trucking_date || job.created_date;
  return job.trucking_date || job.vessel_eta || job.created_date;
}

export default function JobTable({ jobs, depots = [], onEdit, onDelete, onDuplicate, onBill, onBulkStatusUpdate }) {
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  function toggleSelect(id, e) {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleBulkReadyToBill() {
    if (onBulkStatusUpdate && selectedIds.size > 0) {
      onBulkStatusUpdate([...selectedIds], 'Ready to Bill');
      setSelectedIds(new Set());
    }
  }

  const sorted = [...jobs].sort((a, b) => {
    const da = primaryDate(a);
    const db = primaryDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return new Date(db) - new Date(da);
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
          <span className="text-sm font-semibold text-amber-800">{selectedIds.size} job{selectedIds.size > 1 ? 's' : ''} selected</span>
          <Button size="sm" className="h-7 px-3 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleBulkReadyToBill}>
            <ClipboardCheck className="w-3.5 h-3.5" /> Mark Ready to Bill
          </Button>
          <button className="text-xs text-amber-600 underline hover:text-amber-800" onClick={() => setSelectedIds(new Set())}>Clear selection</button>
        </div>
      )}

      {/* Header */}
      <div className="hidden md:grid text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/60 border-b border-border px-3 py-2 gap-2"
        style={{ gridTemplateColumns: '36px 24px 82px 110px 130px 130px 130px 130px 160px 88px' }}>
        <div className="flex items-center justify-center">
          <Checkbox
            checked={sorted.length > 0 && sorted.every(j => selectedIds.has(j.id))}
            onCheckedChange={() => {
              const allSelected = sorted.every(j => selectedIds.has(j.id));
              setSelectedIds(prev => {
                const next = new Set(prev);
                if (allSelected) sorted.forEach(j => next.delete(j.id));
                else sorted.forEach(j => next.add(j.id));
                return next;
              });
            }}
          />
        </div>
        <div />
        <div>Date</div>
        <div>Type</div>
        <div>Customer</div>
        <div>Vessel / Voy</div>
        <div>Vendor</div>
        <div>Container</div>
        <div>Charges</div>
        <div className="text-right">Actions</div>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">No jobs to display.</div>
      )}

      {sorted.map((job) => {
        const isExpanded = expandedId === job.id;
        const isSelected = selectedIds.has(job.id);
        const date = primaryDate(job);
        const chassisOver = (() => {
          if (job.is_export) {
            if (!job.trucking_date || !job.export_containers?.length) return false;
            return job.export_containers.some(c =>
              c.port_in_date && Math.round((new Date(c.port_in_date) - new Date(job.trucking_date)) / 86400000) > 3
            );
          }
          if (!job.trucking_date || !job.truck_out_date) return false;
          const d = Math.round((new Date(job.truck_out_date) - new Date(job.trucking_date)) / 86400000);
          return d > 3;
        })();

        return (
          <div key={job.id} className={`border-b border-border last:border-0 transition-colors ${isSelected ? 'bg-amber-50/70' : chassisOver ? 'bg-red-50/50' : 'hover:bg-muted/30'}`}>
            {/* Main Row */}
            <div
              className="grid grid-cols-[1fr_auto] md:gap-2 px-3 py-2.5 cursor-pointer items-center"
              style={{ gridTemplateColumns: 'repeat(1, 1fr) auto' }}
              onClick={() => setExpandedId(isExpanded ? null : job.id)}
            >
              {/* Desktop layout */}
              <div className="hidden md:grid items-center gap-2 w-full"
                style={{ gridTemplateColumns: '36px 24px 82px 110px 130px 130px 130px 130px 160px' }}>
                {/* Checkbox */}
                <div className="flex items-center justify-center" onClick={(e) => toggleSelect(job.id, e)}>
                  <Checkbox checked={isSelected} onCheckedChange={() => {}} className="pointer-events-none" />
                </div>
                {/* Expand toggle */}
                <div className="flex items-center justify-center text-muted-foreground">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </div>

                {/* Date */}
                <div className="text-sm font-medium tabular-nums whitespace-nowrap">{fmt(date)}</div>

                {/* Type */}
                <div className="flex items-center gap-1">
                  <JobTypeBadge type={job.job_type} />
                  {job.is_export && <span className="text-xs text-blue-600 font-medium">↑</span>}
                </div>

                {/* Customer */}
                <div className="text-sm truncate font-medium">
                  {job.customer_name || <span className="text-muted-foreground">—</span>}
                </div>

                {/* Vessel / Voy */}
                <div className="text-sm truncate">
                  {job.vessel
                    ? <span className="font-medium">{job.vessel}{job.voy ? <span className="text-muted-foreground font-normal"> / {job.voy}</span> : ''}</span>
                    : <span className="text-muted-foreground">—</span>}
                </div>

                {/* Vendor */}
                <div className="text-sm truncate font-medium">
                  {job.vendor || <span className="text-muted-foreground">—</span>}
                </div>

                {/* Container */}
                <div className="text-sm font-mono font-semibold tracking-wide truncate">
                  {job.container_number || (job.export_containers?.length ? `${job.export_containers.length} ctns` : <span className="text-muted-foreground font-sans font-normal">—</span>)}
                </div>

                {/* Charges */}
                <ChargesSummary job={job} depots={depots} />
              </div>

              {/* Mobile layout — compact single line */}
              <div className="md:hidden flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <JobTypeBadge type={job.job_type} />
                  {job.is_export && <span className="text-xs text-blue-600 font-medium">EXP</span>}
                  <span className="text-xs text-muted-foreground">{fmt(date)}</span>
                  <StatusBadge status={job.status || 'Pending'} />
                </div>
                <div className="text-sm font-medium truncate">{job.customer_name || job.vendor || '—'}</div>
                <div className="text-xs text-muted-foreground truncate">{job.vessel || ''}{job.container_number ? ` · ${job.container_number}` : ''}</div>
              </div>

              {/* Actions (always right) */}
              <div className="flex items-center justify-end gap-0.5 ml-2">
                {/* Status badge — desktop only in this column */}
                <span className="hidden md:inline-flex mr-1">
                  <StatusBadge status={job.status || 'Pending'} />
                </span>
                {!job.is_export && !job.portnet_released && job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && (
                  <span className="hidden md:inline px-1 py-0.5 rounded text-xs font-medium bg-orange-50 border border-orange-200 text-orange-600 mr-1">P✗</span>
                )}
                {chassisOver && (
                  <span className="hidden md:inline px-1 py-0.5 rounded text-xs font-semibold bg-red-100 border border-red-300 text-red-700 mr-1">⚠</span>
                )}
                {onBill && (job.status === 'Ready to Bill') && !job.billed && (
                  <Button size="sm" className="h-7 px-2 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white" title="Bill this job" onClick={(e) => { e.stopPropagation(); onBill(job); }}>
                    <Receipt className="w-3 h-3" /> Bill
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(job); }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(job); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(job); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Expanded Detail */}
            {isExpanded && <ExpandedDetail job={job} depots={depots} />}
          </div>
        );
      })}
    </div>
  );
}