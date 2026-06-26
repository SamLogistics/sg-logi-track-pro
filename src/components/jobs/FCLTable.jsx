import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Copy, ChevronDown, ChevronRight, AlertTriangle, FileText, Receipt, CheckCircle2, Circle, ClipboardCheck } from 'lucide-react';
import StatusBadge from './StatusBadge';

function fmt(d) {
  if (!d) return null;
  try { return format(new Date(d), 'dd/MM/yy'); } catch { return d; }
}

function Cell({ children, className = '' }) {
  return <div className={`px-3 py-2.5 text-sm truncate ${className}`}>{children}</div>;
}

function DateCell({ value, highlight }) {
  if (!value) return <Cell><span className="text-muted-foreground/40">—</span></Cell>;
  return <Cell className={highlight ? 'font-semibold text-primary' : 'text-foreground'}>{fmt(value)}</Cell>;
}

function calcChargeTotal(job, depots) {
  const depot = depots.find(d => d.depot_name === job.return_depot);
  const depotTotal = depot ? (depot.dhc_charge || 0) + (depot.admin_charge || 0) + (depot.additional_charges || 0) : 0;
  const remarkTotal = (job.remarks || []).reduce((s, r) => s + (parseFloat(job.remark_prices?.[r]) || 0), 0);
  return { depotTotal, remarkTotal, total: depotTotal + remarkTotal };
}

// Row expansion detail
function DetailPanel({ job, depots }) {
  const { depotTotal, remarkTotal, total } = calcChargeTotal(job, depots);
  const depot = depots.find(d => d.depot_name === job.return_depot);

  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
      {/* Delivery & PIC */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivery</p>
        {job.delivery_address
          ? <p className="text-foreground">{job.delivery_address}{job.delivery_unit ? `, ${job.delivery_unit}` : ''}</p>
          : <p className="text-muted-foreground">—</p>}
        {job.delivery_postal_code && <p className="text-muted-foreground text-xs">Postal: {job.delivery_postal_code}</p>}
        {job.pic_name && <p className="text-muted-foreground text-xs">PIC: {job.pic_name}{job.pic_contact ? ` · ${job.pic_contact}` : ''}</p>}
      </div>

      {/* Container / Vessel */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shipment</p>
        {job.vessel && <p>Vessel: <span className="font-medium">{job.vessel}{job.voy ? ` / V.${job.voy}` : ''}</span></p>}
        {job.carrier && <p>Carrier: <span className="font-medium">{job.carrier}</span></p>}
        {job.bl_number && <p>BL#: <span className="font-mono font-medium">{job.bl_number}</span></p>}
        {job.customer_ref && <p>Ref: <span className="font-medium">{job.customer_ref}</span></p>}
        {job.berthing_port && <p>Berth: <span className="font-medium">{job.berthing_port}</span></p>}
        {job.container_vgm && <p>VGM: <span className="font-semibold text-amber-600">{job.container_vgm} KG</span></p>}
      </div>

      {/* CCP & Status flags */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compliance</p>
        {job.ccp
          ? <p className="text-green-700">CCP: <span className="font-medium">{job.ccp}</span>{job.ccp_valid_date ? ` (til ${fmt(job.ccp_valid_date)})` : ''}</p>
          : <p className="text-amber-600 font-medium flex items-center gap-1"><FileText className="w-3 h-3" /> CCP Missing</p>}
        <p className={job.portnet_released ? 'text-green-700' : 'text-red-600'}>
          Portnet: <span className="font-medium">{job.portnet_released ? 'Released' : 'Not Released'}</span>
        </p>
        {job.sysfreight_job_number && <p className="text-muted-foreground text-xs">SF Job#: {job.sysfreight_job_number}</p>}
      </div>

      {/* Charges */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Charges</p>
        {job.remarks && job.remarks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.remarks.map((r, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700">
                {r}{job.remark_prices?.[r] ? `: $${Number(job.remark_prices[r]).toFixed(2)}` : ''}
              </span>
            ))}
          </div>
        )}
        {depot && depotTotal > 0 && (
          <p className="text-xs text-purple-700">Depot ({job.return_depot}): <span className="font-semibold">${depotTotal.toFixed(2)}</span></p>
        )}
        {total > 0 && <p className="font-bold text-foreground text-sm border-t border-border pt-1">Extra: SGD {total.toFixed(2)}</p>}
        {job.remarks_text && <p className="text-xs text-muted-foreground italic">{job.remarks_text}</p>}
        {job.invoice_number && <p className="text-green-700 text-xs">INV: {job.invoice_number}{job.invoice_amount ? ` · SGD ${Number(job.invoice_amount).toFixed(2)}` : ''}</p>}
      </div>
    </div>
  );
}

// Column config for Import FCL
const IMPORT_COLS = [
  { key: 'expand', label: '', width: '28px' },
  { key: 'status', label: 'Status', width: '100px' },
  { key: 'container', label: 'Container #', width: '130px' },
  { key: 'customer', label: 'Customer', width: '120px' },
  { key: 'vendor', label: 'Vendor', width: '100px' },
  { key: 'eta', label: 'ETA', width: '80px' },
  { key: 'truck_in', label: 'Truck In', width: '80px' },
  { key: 'truck_out', label: 'Truck Out', width: '80px' },
  { key: 'return_date', label: 'Return', width: '80px' },
  { key: 'return_depot', label: 'Return Depot', width: '110px' },
  { key: 'charges', label: 'Charges', width: '100px' },
  { key: 'actions', label: '', width: '90px' },
];

// Column config for Export FCL
const EXPORT_COLS = [
  { key: 'expand', label: '', width: '28px' },
  { key: 'status', label: 'Status', width: '100px' },
  { key: 'container', label: 'Container(s)', width: '130px' },
  { key: 'customer', label: 'Customer', width: '120px' },
  { key: 'vendor', label: 'Vendor', width: '100px' },
  { key: 'bl', label: 'BL / Booking', width: '120px' },
  { key: 'truck_in', label: 'Truck In', width: '80px' },
  { key: 'etd', label: 'ETD', width: '80px' },
  { key: 'port_in', label: 'Port In', width: '80px' },
  { key: 'depot', label: 'Collection Depot', width: '110px' },
  { key: 'charges', label: 'Charges', width: '100px' },
  { key: 'actions', label: '', width: '90px' },
];

function calcChassisDays(job) {
  if (job.is_export) {
    if (!job.trucking_date || !job.export_containers?.length) return null;
    const days = Math.max(...job.export_containers.map(c =>
      c.port_in_date ? Math.round((new Date(c.port_in_date) - new Date(job.trucking_date)) / 86400000) : -1
    ));
    return days >= 0 ? days : null;
  }
  if (!job.trucking_date || !job.truck_out_date) return null;
  return Math.round((new Date(job.truck_out_date) - new Date(job.trucking_date)) / 86400000);
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getImportProgress(job) {
  return [
    { key: 'vendor', label: 'Vendor', done: !!job.vendor },
    { key: 'truck_in', label: 'Truck In', done: !!job.trucking_date },
    { key: 'ccp', label: 'CCP', done: !!job.ccp },
    { key: 'portnet', label: 'Portnet', done: !!job.portnet_released },
  ];
}

function getImportAlerts(job) {
  const alerts = [];
  if (job.trucking_date) {
    const sinceIn = daysSince(job.trucking_date);
    if (sinceIn !== null && sinceIn >= 2 && !job.truck_out_date) {
      alerts.push({ level: 'red', msg: `Truck In ${sinceIn}d ago — no Truck Out!` });
    }
    if (sinceIn !== null && sinceIn >= 3 && !job.return_date) {
      alerts.push({ level: 'orange', msg: `Truck In ${sinceIn}d ago — no Return Date!` });
    }
  }
  return alerts;
}

export default function FCLTable({ jobs, depots = [], onEdit, onDelete, onDuplicate, onBill, onBulkStatusUpdate }) {
  const [expandedId, setExpandedId] = useState(null);
  const [sortKey, setSortKey] = useState('truck_in');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());

  function toggleSelect(id, e) {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll(arr) {
    const ids = arr.map(j => j.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }

  function handleBulkReadyToBill() {
    if (onBulkStatusUpdate && selectedIds.size > 0) {
      onBulkStatusUpdate([...selectedIds], 'Ready to Bill');
      setSelectedIds(new Set());
    }
  }

  const imports = jobs.filter(j => !j.is_export);
  const exports = jobs.filter(j => j.is_export);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function sortJobs(arr) {
    return [...arr].sort((a, b) => {
      let va, vb;
      if (sortKey === 'truck_in') { va = a.trucking_date; vb = b.trucking_date; }
      else if (sortKey === 'eta') { va = a.vessel_eta; vb = b.vessel_eta; }
      else if (sortKey === 'etd') { va = a.truck_out_date; vb = b.truck_out_date; }
      else if (sortKey === 'customer') { va = a.customer_name || ''; vb = b.customer_name || ''; }
      else { va = a.trucking_date; vb = b.trucking_date; }
      if (!va && !vb) return 0;
      if (!va) return 1; if (!vb) return -1;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  function ColHeader({ col, sortable, children }) {
    return (
      <div
        className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none whitespace-nowrap ${sortable ? 'cursor-pointer hover:text-foreground' : ''}`}
        style={{ width: col.width, minWidth: col.width }}
        onClick={sortable ? () => handleSort(col.key) : undefined}
      >
        {children || col.label}
        {sortable && sortKey === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    );
  }

  function renderImport(job) {
    const chassisDays = calcChassisDays(job);
    const chassisOver = chassisDays !== null && chassisDays > 3;
    const chargeTotal = calcChargeTotal(job, depots);
    const isExpanded = expandedId === job.id;
    const alerts = getImportAlerts(job);
    const hasRedAlert = alerts.some(a => a.level === 'red');
    const hasOrangeAlert = alerts.some(a => a.level === 'orange');
    const progress = getImportProgress(job);
    const doneCount = progress.filter(p => p.done).length;
    const allDone = doneCount === progress.length;

    const isSelected = selectedIds.has(job.id);
    return (
      <div key={job.id} className={`border-b border-slate-200 last:border-0 transition-colors ${isSelected ? 'bg-amber-50/70' : hasRedAlert ? 'bg-red-50/80' : hasOrangeAlert ? 'bg-orange-50/60' : chassisOver ? 'bg-red-50/40' : 'hover:bg-slate-50/80'}`}>
        <div
          className="flex items-stretch cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : job.id)}
        >
          {/* Checkbox */}
          <div className="flex items-center justify-center shrink-0" style={{ width: '36px', minWidth: '36px' }} onClick={(e) => toggleSelect(job.id, e)}>
            <Checkbox checked={isSelected} onCheckedChange={() => {}} className="pointer-events-none" />
          </div>
          {/* Expand */}
          <div className="flex items-center justify-center text-muted-foreground shrink-0" style={{ width: '28px', minWidth: '28px' }}>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
          {/* Status */}
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '100px', minWidth: '100px' }}>
            <StatusBadge status={job.status || 'Pending'} />
          </div>
          {/* Container */}
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '130px', minWidth: '130px' }}>
            <span className="font-mono font-bold text-sm tracking-wide text-foreground truncate">{job.container_number || <span className="text-muted-foreground font-normal font-sans">—</span>}</span>
          </div>
          {/* Customer */}
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '120px', minWidth: '120px' }}>
            <span className="text-sm font-medium truncate">{job.customer_name || <span className="text-muted-foreground">—</span>}</span>
          </div>
          {/* Vendor */}
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '100px', minWidth: '100px' }}>
            <span className="text-sm truncate text-muted-foreground">{job.vendor || '—'}</span>
          </div>
          {/* ETA */}
          <div className="flex items-center shrink-0" style={{ width: '80px', minWidth: '80px' }}>
            <DateCell value={job.vessel_eta} highlight />
          </div>
          {/* Truck In */}
          <div className="flex items-center shrink-0" style={{ width: '80px', minWidth: '80px' }}>
            <DateCell value={job.trucking_date} />
          </div>
          {/* Truck Out */}
          <div className="flex items-center shrink-0" style={{ width: '80px', minWidth: '80px' }}>
            <DateCell value={job.truck_out_date} />
          </div>
          {/* Return Date */}
          <div className="flex items-center shrink-0" style={{ width: '80px', minWidth: '80px' }}>
            {job.return_date
              ? <Cell className="font-semibold text-green-700">{fmt(job.return_date)}</Cell>
              : <Cell><span className={hasOrangeAlert || hasRedAlert ? 'text-orange-500 font-bold' : 'text-muted-foreground/40'}>—</span></Cell>}
          </div>
          {/* Return Depot */}
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '110px', minWidth: '110px' }}>
            <span className="text-xs truncate text-muted-foreground">{job.return_depot || '—'}</span>
          </div>
          {/* Extra Charges */}
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '100px', minWidth: '100px' }}>
            {chargeTotal.total > 0
              ? <span className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">+${chargeTotal.total.toFixed(0)}</span>
              : <span className="text-muted-foreground/40 text-xs">—</span>}
          </div>
          {/* Actions */}
          <div className="flex items-center justify-end gap-0.5 px-1 shrink-0" style={{ width: '90px', minWidth: '90px' }}>
            {(hasRedAlert || hasOrangeAlert || chassisOver) && <AlertTriangle className={`w-3.5 h-3.5 mr-0.5 ${hasRedAlert ? 'text-red-500' : 'text-orange-500'}`} />}
            {onBill && job.status === 'Ready to Bill' && !job.billed && (
              <Button size="sm" className="h-6 px-1.5 text-xs gap-0.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={(e) => { e.stopPropagation(); onBill(job); }}>
                <Receipt className="w-3 h-3" />Bill
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(job); }}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(job); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(job); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {/* Progress checklist strip */}
        {!allDone && (job.status === 'Pending' || job.status === 'In Progress') && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-50 border-t border-slate-100">
            {progress.map(p => (
              <div key={p.key} className={`flex items-center gap-1 text-xs font-medium ${p.done ? 'text-green-600' : 'text-slate-400'}`}>
                {p.done
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                {p.label}
              </div>
            ))}
            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : doneCount >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {doneCount}/4
            </span>
          </div>
        )}
        {alerts.length > 0 && (
          <div className={`flex flex-wrap gap-2 px-4 py-2.5 border-l-4 ${alerts.some(a => a.level === 'red') ? 'border-l-red-500 bg-red-100' : 'border-l-orange-500 bg-orange-100'}`}>
            {alerts.map((a, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${a.level === 'red' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                <AlertTriangle className="w-4 h-4" />⚠ {a.msg}
              </span>
            ))}
          </div>
        )}
        {isExpanded && <DetailPanel job={job} depots={depots} />}
      </div>
    );
  }

  function renderExport(job) {
    const isExpanded = expandedId === job.id;
    const chargeTotal = calcChargeTotal(job, depots);
    const containerDisplay = job.export_containers?.length
      ? (job.export_containers[0]?.container_number || '—') + (job.export_containers.length > 1 ? ` +${job.export_containers.length - 1}` : '')
      : '—';
    const latestPortIn = job.export_containers?.reduce((latest, c) => {
      if (!c.port_in_date) return latest;
      return !latest || c.port_in_date > latest ? c.port_in_date : latest;
    }, null);

    return (
      <div key={job.id} className={`border-b border-slate-200 last:border-0 hover:bg-slate-50/80 transition-colors`}>
        <div
          className="flex items-stretch cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : job.id)}
        >
          <div className="flex items-center justify-center text-muted-foreground shrink-0" style={{ width: '28px', minWidth: '28px' }}>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '100px', minWidth: '100px' }}>
            <StatusBadge status={job.status || 'Pending'} />
          </div>
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '130px', minWidth: '130px' }}>
            <span className="font-mono font-bold text-sm tracking-wide text-blue-800 truncate">{containerDisplay}</span>
          </div>
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '120px', minWidth: '120px' }}>
            <span className="text-sm font-medium truncate">{job.customer_name || <span className="text-muted-foreground">—</span>}</span>
          </div>
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '100px', minWidth: '100px' }}>
            <span className="text-sm truncate text-muted-foreground">{job.vendor || '—'}</span>
          </div>
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '120px', minWidth: '120px' }}>
            <span className="font-mono text-xs text-muted-foreground truncate">{job.bl_number || '—'}</span>
          </div>
          <div className="flex items-center shrink-0" style={{ width: '80px', minWidth: '80px' }}>
            <DateCell value={job.trucking_date} />
          </div>
          <div className="flex items-center shrink-0" style={{ width: '80px', minWidth: '80px' }}>
            <DateCell value={job.truck_out_date} highlight />
          </div>
          <div className="flex items-center shrink-0" style={{ width: '80px', minWidth: '80px' }}>
            <DateCell value={latestPortIn} />
          </div>
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '110px', minWidth: '110px' }}>
            <span className="text-xs truncate text-muted-foreground">{job.return_depot || '—'}</span>
          </div>
          <div className="flex items-center px-2 py-2.5 shrink-0" style={{ width: '100px', minWidth: '100px' }}>
            {chargeTotal.total > 0
              ? <span className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">+${chargeTotal.total.toFixed(0)}</span>
              : <span className="text-muted-foreground/40 text-xs">—</span>}
          </div>
          <div className="flex items-center justify-end gap-0.5 px-1 shrink-0" style={{ width: '90px', minWidth: '90px' }}>
            {onBill && job.status === 'Ready to Bill' && !job.billed && (
              <Button size="sm" className="h-6 px-1.5 text-xs gap-0.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={(e) => { e.stopPropagation(); onBill(job); }}>
                <Receipt className="w-3 h-3" />Bill
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(job); }}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(job); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(job); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {isExpanded && <DetailPanel job={job} depots={depots} />}
      </div>
    );
  }

  const sortedImports = sortJobs(imports);
  const sortedExports = sortJobs(exports);

  const SORTABLE = ['eta', 'truck_in', 'etd', 'customer'];

  return (
    <div className="space-y-6">
      {/* Import Section */}
      {imports.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-card shadow-sm">
          <div className="px-4 py-2.5 bg-slate-800 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Import — {imports.length} job{imports.length > 1 ? 's' : ''}
            {selectedIds.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-amber-300 font-semibold">{selectedIds.size} selected</span>
                <Button size="sm" className="h-6 px-2 text-xs gap-1 bg-amber-500 hover:bg-amber-400 text-white border-0" onClick={handleBulkReadyToBill}>
                  <ClipboardCheck className="w-3.5 h-3.5" /> Mark Ready to Bill
                </Button>
                <button className="text-slate-400 hover:text-white text-xs underline" onClick={() => setSelectedIds(new Set())}>Clear</button>
              </div>
            )}
          </div>
          {/* Header */}
          <div className="flex bg-slate-100 border-b border-slate-200 overflow-x-auto">
            {/* Select-all checkbox */}
            <div className="flex items-center justify-center px-2 shrink-0" style={{ width: '36px', minWidth: '36px' }}>
              <Checkbox
                checked={sortedImports.length > 0 && sortedImports.every(j => selectedIds.has(j.id))}
                onCheckedChange={() => toggleSelectAll(sortedImports)}
              />
            </div>
            {IMPORT_COLS.map(col => (
              <ColHeader key={col.key} col={col} sortable={SORTABLE.includes(col.key)}>
                {col.label}
              </ColHeader>
            ))}
          </div>
          <div className="overflow-x-auto">
            {sortedImports.map(renderImport)}
          </div>
        </div>
      )}

      {/* Export Section */}
      {exports.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-card shadow-sm">
          <div className="px-4 py-2.5 bg-blue-800 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-300" />
            Export — {exports.length} job{exports.length > 1 ? 's' : ''}
          </div>
          <div className="flex bg-slate-100 border-b border-slate-200 overflow-x-auto">
            {EXPORT_COLS.map(col => (
              <ColHeader key={col.key} col={col} sortable={SORTABLE.includes(col.key)}>
                {col.label}
              </ColHeader>
            ))}
          </div>
          <div className="overflow-x-auto">
            {sortedExports.map(renderExport)}
          </div>
        </div>
      )}

      {imports.length === 0 && exports.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No FCL jobs to display.</div>
      )}
    </div>
  );
}