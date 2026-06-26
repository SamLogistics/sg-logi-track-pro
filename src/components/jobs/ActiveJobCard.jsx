import React from 'react';
import { format, differenceInHours, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Copy, MapPin, Calendar, AlertTriangle, Ship, Hash } from "lucide-react";
import JobTypeBadge from "./JobTypeBadge";
import StatusBadge from "./StatusBadge";

const STATUS_BAR = {
  "Pending":       "bg-slate-300",
  "In Progress":   "bg-blue-400",
  "Ready to Bill": "bg-amber-400",
  "Completed":     "bg-green-400",
};

// Returns alert info if import job needs attention (truck_in > 2 days ago, no empty_date)
function getImportAlert(job) {
  if (job.is_export || job.job_type === 'LCL' || job.job_type === 'Local Lorry Delivery') return null;
  if (!job.trucking_date || job.empty_date) return null;
  const daysSinceTruckIn = differenceInDays(new Date(), new Date(job.trucking_date));
  if (daysSinceTruckIn >= 2) {
    return { type: 'import', msg: `Truck In ${daysSinceTruckIn}d ago — Empty not updated`, urgent: daysSinceTruckIn >= 4 };
  }
  return null;
}

// Returns alert info if export job needs attention (ETD within 48h, missing VGM or port_in)
function getExportAlert(job) {
  if (!job.is_export || job.job_type === 'LCL' || job.job_type === 'Local Lorry Delivery') return null;

  // Use truck_out_date as ETD proxy (when container is gated in, truck_out is the cutoff/ETD reference)
  const etdRef = job.truck_out_date;
  if (!etdRef) return null;

  const hoursToEtd = differenceInHours(new Date(etdRef), new Date());
  if (hoursToEtd > 48 || hoursToEtd < -24) return null; // only warn within 48h window (and not too far past)

  const missingVgm = job.export_containers?.some(c => !c.vgm);
  const missingPortIn = job.export_containers?.some(c => !c.port_in_date);

  if (!missingVgm && !missingPortIn) return null;

  const missing = [missingVgm && 'VGM', missingPortIn && 'Port In'].filter(Boolean).join(' & ');
  const urgent = hoursToEtd <= 24;
  return { type: 'export', msg: `ETD in ${hoursToEtd > 0 ? `${Math.round(hoursToEtd)}h` : 'overdue'} — ${missing} missing`, urgent };
}

export default function ActiveJobCard({ job, onEdit, onDelete, onDuplicate }) {
  const status = job.status || "Pending";

  const importAlert = getImportAlert(job);
  const exportAlert = getExportAlert(job);
  const alert = importAlert || exportAlert;

  // Primary identifier
  const containerDisplay = job.job_type === 'Local Lorry Delivery'
    ? null
    : (job.container_number || (job.export_containers?.[0]?.container_number
        ? `${job.export_containers[0].container_number}${job.export_containers.length > 1 ? ` +${job.export_containers.length - 1}` : ''}`
        : null));

  // Key date
  let keyDate = null, keyDateLabel = '';
  if (job.job_type === 'Local Lorry Delivery') {
    keyDate = job.lld_date; keyDateLabel = 'Date';
  } else if (job.is_export) {
    keyDate = job.truck_out_date || job.trucking_date; keyDateLabel = job.truck_out_date ? 'ETD' : 'Truck In';
  } else if (job.job_type === 'LCL') {
    keyDate = null;
  } else {
    keyDate = job.vessel_eta || job.trucking_date; keyDateLabel = job.vessel_eta ? 'ETA' : 'Truck In';
  }

  const deliveryDate = !job.is_export && job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery'
    ? job.delivery_date : null;

  // Import: show empty_date if available, else show truck_in for reference
  const emptyDate = !job.is_export && job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery'
    ? job.empty_date : null;

  return (
    <div className={`group flex bg-card border rounded-xl hover:shadow-md transition-all duration-200 overflow-hidden ${alert ? (alert.urgent ? 'border-red-300' : 'border-amber-300') : 'border-border/60 hover:border-border'}`}>
      {/* Status bar */}
      <div className={`w-1.5 shrink-0 ${STATUS_BAR[status] || STATUS_BAR["Pending"]}`} />

      <div className="flex-1 min-w-0 px-4 py-3">
        {/* Row 1: badges + actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <JobTypeBadge type={job.job_type} />
            <StatusBadge status={status} />
            {job.is_export && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">Export</span>
            )}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onDuplicate(job)} title="Duplicate">
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(job)} title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(job)} title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Alert banner */}
        {alert && (
          <div className={`mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${alert.urgent ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {alert.msg}
          </div>
        )}

        {/* Row 2: container + customer — prominent */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 items-baseline">
          {containerDisplay && (
            <span className="font-mono font-bold text-base tracking-wider text-foreground">{containerDisplay}</span>
          )}
          {job.customer_name && (
            <span className="text-sm font-semibold text-foreground">{job.customer_name}</span>
          )}
          {job.bl_number && (
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">BL: {job.bl_number}</span>
          )}
          {job.vendor && (
            <span className="text-xs text-muted-foreground">{job.vendor}</span>
          )}
        </div>

        {/* Row 3: key dates — highlighted */}
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          {keyDate && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Calendar className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">{keyDateLabel}:</span>
              <span className="text-primary font-semibold">{format(new Date(keyDate), 'dd MMM yy')}</span>
            </span>
          )}
          {deliveryDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Delivery:</span>
              <span className="font-semibold text-foreground">{format(new Date(deliveryDate), 'dd MMM yy')}</span>
            </span>
          )}
          {emptyDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Empty:</span>
              <span className="font-semibold text-green-700">{format(new Date(emptyDate), 'dd MMM yy')}</span>
            </span>
          )}
          {job.vessel && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Ship className="w-3 h-3" />
              {job.vessel}{job.voy ? ` V.${job.voy}` : ''}
            </span>
          )}
          {(job.delivery_address || job.delivery_postal_code) && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {job.delivery_address_name || job.delivery_postal_code || job.delivery_address}
            </span>
          )}
        </div>

        {/* Row 4: remarks */}
        {job.remarks && job.remarks.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {job.remarks.map((r, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-destructive/8 border border-destructive/15 text-destructive/80">
                {r}{job.remark_prices?.[r] ? `: $${Number(job.remark_prices[r]).toFixed(2)}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}