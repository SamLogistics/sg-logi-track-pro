import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Copy, MapPin, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "../jobs/StatusBadge";

const STATUS_BAR = {
  "Pending":       "bg-slate-300",
  "In Progress":   "bg-blue-400",
  "Ready to Bill": "bg-amber-400",
  "Completed":     "bg-green-400",
};

const JOB_TYPE_COLOR = {
  "40FT FCL": "bg-primary/10 text-primary border-primary/20",
  "20FT FCL": "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

export default function SWJobCard({ job, depots = [], onEdit, onDelete, onMarkCompleted, onDuplicate }) {
  const status = job.status || "Pending";

  // Chassis days
  let chassisDays = null, chassisExceeded = false;
  if (job.out_gate_date && job.return_date) {
    chassisDays = Math.round((new Date(job.return_date) - new Date(job.out_gate_date)) / 86400000);
    chassisExceeded = chassisDays > 3;
  }

  // CCP expiry
  let ccpExpired = false;
  if (job.ccp_valid_date) {
    const today = new Date(); today.setHours(0,0,0,0);
    ccpExpired = new Date(job.ccp_valid_date) < today;
  }

  // Depot total
  const depot = depots.find(d => d.depot_name === job.return_depot);
  const depotTotal = depot ? (depot.dhc_charge || 0) + (depot.admin_charge || 0) + (depot.additional_charges || 0) : 0;

  const fmt = (d) => d ? format(new Date(d), 'dd MMM yy') : null;

  return (
    <div className="group flex bg-card border border-border/60 rounded-xl hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden">
      {/* Status bar */}
      <div className={`w-1 shrink-0 ${STATUS_BAR[status] || STATUS_BAR["Pending"]}`} />

      <div className="flex-1 min-w-0 px-4 py-3">
        {/* Row 1: badges + actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${JOB_TYPE_COLOR[job.job_type] || JOB_TYPE_COLOR["40FT FCL"]}`}>
              {job.job_type}
            </span>
            <StatusBadge status={status} />
            {chassisDays !== null && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${chassisExceeded ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <Calendar className="w-3 h-3" />
                {chassisDays}d{chassisExceeded ? ` ⚠` : ''}
              </span>
            )}
            {job.ccp && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${ccpExpired ? 'bg-red-50 border-red-300 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <FileText className="w-3 h-3" />
                {job.ccp}{ccpExpired ? ' ⚠' : ''}
              </span>
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

        {/* Row 2: core identifiers */}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {job.container_number && (
            <span className="font-mono font-semibold text-sm tracking-wider text-foreground">{job.container_number}</span>
          )}
          {job.vendor && (
            <span className="text-sm font-medium text-foreground">{job.vendor}</span>
          )}
          {job.vessel && (
            <span className="text-sm text-muted-foreground">{job.vessel}{job.voy ? ` / V.${job.voy}` : ''}</span>
          )}
          {job.return_depot && (
            <span className="text-sm text-muted-foreground">
              → {job.return_depot}
              {depotTotal > 0 && <span className="ml-1 text-blue-600 font-medium">{depot?.currency || 'SGD'} {depotTotal.toFixed(2)}</span>}
            </span>
          )}
        </div>

        {/* Row 3: dates */}
        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-muted-foreground">
          {job.out_gate_date && (
            <span>Out Gate: <span className="text-foreground font-medium">{fmt(job.out_gate_date)}</span></span>
          )}
          {job.trucking_date && (
            <span>Truck In: <span className="text-foreground font-medium">{fmt(job.trucking_date)}</span></span>
          )}
          {job.empty_date && (
            <span>Empty: <span className="text-foreground font-medium">{fmt(job.empty_date)}</span></span>
          )}
          {job.truck_out_date && (
            <span>Truck Out: <span className="text-foreground font-medium">{fmt(job.truck_out_date)}</span></span>
          )}
          {job.return_date && (
            <span>Return: <span className="text-foreground font-medium">{fmt(job.return_date)}</span></span>
          )}
        </div>

        {/* Row 4: delivery address */}
        {(job.delivery_address || job.delivery_postal_code) && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>
              {job.delivery_address_name ? <span className="font-medium text-foreground/80">{job.delivery_address_name}: </span> : null}
              {[job.delivery_address, job.delivery_postal_code ? `S${job.delivery_postal_code}` : null].filter(Boolean).join(', ')}
              {(job.pic_name || job.pic_contact) && <span> · {job.pic_name}{job.pic_contact ? ` (${job.pic_contact})` : ''}</span>}
            </span>
          </div>
        )}

        {/* Row 5: remarks */}
        {job.remarks && job.remarks.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {job.remarks.map((r, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-destructive/8 border border-destructive/15 text-destructive/80">
                {r}{job.remark_prices?.[r] ? `: $${Number(job.remark_prices[r]).toFixed(2)}` : ''}
              </span>
            ))}
            {job.container_vgm && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                VGM: {job.container_vgm} KG
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}