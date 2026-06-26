import React from "react";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ship, Calendar, Hash, Building2, Pencil, Trash2, Receipt, MapPin, User, Phone, FileText, AlertTriangle, Copy } from "lucide-react";
import JobTypeBadge from "./JobTypeBadge";
import StatusBadge from "./StatusBadge";

const OOG_TYPES = ["40OT", "20OT", "40FT FR", "20FT FR"];

// Import: truck_in > 2 days ago, no empty date
function getImportAlert(job) {
  if (job.is_export || job.job_type === 'LCL' || job.job_type === 'Local Lorry Delivery') return null;
  if (!job.trucking_date || job.empty_date) return null;
  const days = differenceInDays(new Date(), new Date(job.trucking_date));
  if (days >= 2) return { msg: `Truck In ${days}d ago — Empty not updated`, urgent: days >= 4 };
  return null;
}

// Export: ETD (truck_out_date) within 48h, missing VGM or Port In on any container
function getExportAlert(job) {
  if (!job.is_export || job.job_type === 'LCL' || job.job_type === 'Local Lorry Delivery') return null;
  const etdRef = job.truck_out_date;
  if (!etdRef) return null;
  const hoursToEtd = differenceInHours(new Date(etdRef), new Date());
  if (hoursToEtd > 48 || hoursToEtd < -24) return null;
  const missingVgm = job.export_containers?.some(c => !c.vgm);
  const missingPortIn = job.export_containers?.some(c => !c.port_in_date);
  if (!missingVgm && !missingPortIn) return null;
  const missing = [missingVgm && 'VGM', missingPortIn && 'Port In'].filter(Boolean).join(' & ');
  return { msg: `ETD in ${hoursToEtd > 0 ? `${Math.round(hoursToEtd)}h` : 'overdue'} — ${missing} missing`, urgent: hoursToEtd <= 24 };
}

function ChassisUsageDays({ job }) {
  const startDate = job.trucking_date;
  const endDate = job.is_export ? job.port_in_date : job.truck_out_date;
  const label = job.is_export ? "Chassis (Truck In → Port In)" : "Chassis (Truck In → Return)";
  if (!startDate || !endDate) return null;
  const days = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  const isOver = days > 3;
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border ${isOver ? 'bg-red-50 text-red-700 border-red-200' : 'bg-muted text-muted-foreground border-border'}`}>
      <span>{label}:</span>
      <span className={`font-bold ${isOver ? 'text-red-700' : ''}`}>{days}d</span>
      {isOver && <span className="font-normal">(exceeded)</span>}
    </div>
  );
}

function DateField({ label, value, highlight }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Calendar className={`w-3.5 h-3.5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{format(new Date(value), 'dd MMM yyyy')}</span>
    </div>
  );
}

export default function JobCard({ job, depots = [], onEdit, onDelete, onMarkCompleted, onDuplicate }) {
  const importAlert = getImportAlert(job);
  const exportAlert = getExportAlert(job);
  const alert = importAlert || exportAlert;

  return (
    <Card className={`group hover:shadow-md transition-all duration-200 ${alert ? (alert.urgent ? 'border-red-300' : 'border-amber-300') : 'border-border/60'}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">

            {/* Alert Banner */}
            {alert && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${alert.urgent ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {alert.msg}
              </div>
            )}

            {/* Header Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <JobTypeBadge type={job.job_type} />
              <StatusBadge status={job.status || "Pending"} />
              {job.billed ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 text-xs font-medium">
                  <Receipt className="w-3 h-3" />
                  {job.invoice_number ? `INV: ${job.invoice_number}` : 'Billed'}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 text-xs font-medium">
                  <Receipt className="w-3 h-3" />
                  Pending Bill
                </Badge>
              )}
              {job.is_export && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium">Export</Badge>
              )}
              {!job.is_export && job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${
                  job.portnet_released ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${job.portnet_released ? 'bg-green-500' : 'bg-red-500'}`} />
                  Portnet {job.portnet_released ? 'Released' : 'Not Released'}
                </span>
              )}
              {job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${
                  job.ccp ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <FileText className="w-3 h-3" />
                  {job.ccp ? `CCP: ${job.ccp}${job.ccp_valid_date ? ` (valid til ${format(new Date(job.ccp_valid_date), 'dd MMM')})` : ''}` : 'CCP Missing'}
                </span>
              )}
              {job.job_type === 'LCL' && job.lcl_vehicle_size && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-medium">
                  {job.lcl_vehicle_size} {job.lcl_box_or_open ? `· ${job.lcl_box_or_open}` : ''}
                </Badge>
              )}
              {job.job_type === 'LCL' && (
                <Badge variant="outline" className={`text-xs font-medium ${job.lcl_tailgate ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-muted text-muted-foreground border-border'}`}>
                  {job.lcl_tailgate ? 'With Tailgate' : 'No Tailgate'}
                </Badge>
              )}
              {job.job_type === 'LCL' && job.lcl_crane && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-medium">Crane</Badge>
              )}
            </div>

            {/* LCL Key Info */}
            {job.job_type === 'LCL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                {job.customer_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-semibold truncate">{job.customer_name}</span>
                  </div>
                )}
                {job.vendor && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Vendor:</span>
                    <span className="font-medium truncate">{job.vendor}</span>
                  </div>
                )}
                {job.lcl_attendant && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Attendants:</span>
                    <span className="font-medium">{job.lcl_attendant_count || 1}</span>
                  </div>
                )}
                {(job.lcl_job_start_time || job.lcl_job_end_time) && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{job.lcl_job_start_time || '—'} – {job.lcl_job_end_time || '—'}</span>
                  </div>
                )}
                {job.lcl_collection_address && (
                  <div className="flex items-center gap-1.5 text-sm sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Collect:</span>
                    <span className="font-medium truncate">{job.lcl_collection_address}</span>
                  </div>
                )}
                {job.lcl_delivery_address && (
                  <div className="flex items-center gap-1.5 text-sm sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Deliver:</span>
                    <span className="font-medium truncate">{job.lcl_delivery_address}</span>
                  </div>
                )}
                {job.lcl_distance_km && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-xs">{job.lcl_distance_km}</span>
                  </div>
                )}
                {job.pic_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">PIC:</span>
                    <span className="font-medium">{job.pic_name}</span>
                    {job.pic_contact && <span className="text-muted-foreground">· {job.pic_contact}</span>}
                  </div>
                )}
                {job.invoice_number && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">INV:</span>
                    <span className="font-medium">{job.invoice_number}</span>
                    {job.invoice_amount && <span className="text-muted-foreground">· SGD {Number(job.invoice_amount).toFixed(2)}</span>}
                    {job.lcl_invoice_to && <span className="text-muted-foreground">→ {job.lcl_invoice_to}</span>}
                  </div>
                )}
                {job.lcl_remarks && job.lcl_remarks.length > 0 && (
                  <div className="flex items-start gap-1.5 text-sm sm:col-span-2 flex-wrap">
                    {job.lcl_remarks.map((r, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/5 text-destructive border border-destructive/10 text-xs">
                        {r}{job.lcl_remark_prices?.[r] ? `: $${Number(job.lcl_remark_prices[r]).toFixed(2)}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LCL Profit Indicator */}
            {job.job_type === 'LCL' && (() => {
              const inv = parseFloat(job.invoice_amount) || 0;
              const vnd = parseFloat(job.vendor_invoice_amount) || 0;
              if (inv <= 0 || vnd <= 0) return null;
              const profit = inv - vnd;
              const margin = ((profit / inv) * 100).toFixed(1);
              const isPositive = profit >= 0;
              return (
                <div className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border ${isPositive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-xs font-medium ${isPositive ? 'text-green-700' : 'text-red-700'}`}>{isPositive ? 'Profit' : 'Loss'}</span>
                    <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>({margin}% margin)</span>
                  </div>
                  <span className={`text-base font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>SGD {profit.toFixed(2)}</span>
                </div>
              );
            })()}

            {/* Local Lorry Delivery Key Info */}
            {job.job_type === 'Local Lorry Delivery' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                  {job.lld_date && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-semibold text-primary">{format(new Date(job.lld_date), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                  {job.customer_name && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-semibold truncate">{job.customer_name}</span>
                    </div>
                  )}
                  {job.vendor && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Vendor:</span>
                      <span className="font-medium truncate">{job.vendor}</span>
                    </div>
                  )}
                  {(job.lld_job_start_time || job.lld_job_end_time) && (() => {
                    let jobHours = null;
                    if (job.lld_job_start_time && job.lld_job_end_time) {
                      const [sh, sm] = job.lld_job_start_time.split(':').map(Number);
                      const [eh, em] = job.lld_job_end_time.split(':').map(Number);
                      let mins = (eh * 60 + em) - (sh * 60 + sm);
                      if (mins < 0) mins += 24 * 60;
                      jobHours = (mins / 60).toFixed(2);
                    }
                    const isOver3h = jobHours !== null && parseFloat(jobHours) > 3;
                    return (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium">{job.lld_job_start_time} – {job.lld_job_end_time}</span>
                        {jobHours !== null && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-semibold ${isOver3h ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700'}`}>
                            {jobHours}h{isOver3h ? ' ⚠' : ''}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  {job.lld_lorry_number && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Lorry:</span>
                      <span className="font-medium font-mono">{job.lld_lorry_number}</span>
                    </div>
                  )}
                  {job.lld_driver_name && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Driver:</span>
                      <span className="font-medium">{job.lld_driver_name}</span>
                      {job.lld_driver_contact && <span className="text-muted-foreground">· {job.lld_driver_contact}</span>}
                    </div>
                  )}
                </div>
                {(job.lld_pickup_address || job.lld_pickup_point) && (
                  <div className="flex items-start gap-1.5 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Pickup: </span>
                      <span className="font-medium">{job.lld_pickup_point || job.lld_pickup_address}</span>
                      {job.lld_pickup_time && <span className="text-muted-foreground"> · {job.lld_pickup_time}</span>}
                      {job.lld_pickup_pic_name && <span className="text-muted-foreground"> · {job.lld_pickup_pic_name}{job.lld_pickup_pic_contact ? ` (${job.lld_pickup_pic_contact})` : ''}</span>}
                    </div>
                  </div>
                )}
                {job.lld_dropoff_address && (
                  <div className="flex items-start gap-1.5 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Drop-off: </span>
                      <span className="font-medium">{job.lld_dropoff_address}</span>
                      {job.lld_dropoff_pic_name && <span className="text-muted-foreground"> · {job.lld_dropoff_pic_name}{job.lld_dropoff_pic_contact ? ` (${job.lld_dropoff_pic_contact})` : ''}</span>}
                    </div>
                  </div>
                )}
                {job.lld_remarks && job.lld_remarks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.lld_remarks.map((r, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal bg-destructive/5 text-destructive border-destructive/10 border">
                        {r}{job.lld_remark_prices?.[r] ? `: $${Number(job.lld_remark_prices[r]).toFixed(2)}` : ''}
                      </Badge>
                    ))}
                  </div>
                )}
                {job.lld_job_notes && <p className="text-xs text-muted-foreground italic">{job.lld_job_notes}</p>}
                {(() => {
                  const inv = parseFloat(job.invoice_amount) || 0;
                  const vnd = parseFloat(job.vendor_invoice_amount) || 0;
                  if (inv <= 0 || vnd <= 0) return null;
                  const p = inv - vnd;
                  const isPos = p >= 0;
                  return (
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${isPos ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <span className={`font-medium ${isPos ? 'text-green-700' : 'text-red-700'}`}>{isPos ? 'Profit' : 'Loss'}</span>
                      <span className={`font-bold ${isPos ? 'text-green-700' : 'text-red-700'}`}>SGD {p.toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Key Info — non-LCL, non-LLD */}
            {job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                {job.customer_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-semibold truncate">{job.customer_name}</span>
                  </div>
                )}
                {job.vendor && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Vendor:</span>
                    <span className="font-medium truncate">{job.vendor}</span>
                  </div>
                )}
                {job.carrier && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Carrier:</span>
                    <span className="font-medium truncate">{job.carrier}</span>
                  </div>
                )}
                {job.vessel && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Ship className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Vessel:</span>
                    <span className="font-medium truncate">{job.vessel}</span>
                    {job.voy && <span className="text-muted-foreground">/ V.{job.voy}</span>}
                  </div>
                )}
                {job.container_number && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Container:</span>
                    <span className="font-bold font-mono tracking-wide text-foreground">{job.container_number}</span>
                  </div>
                )}
                {job.customer_ref && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Ref:</span>
                    <span className="font-medium">{job.customer_ref}</span>
                  </div>
                )}
                {job.bl_number && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">BL:</span>
                    <span className="font-medium font-mono">{job.bl_number}</span>
                  </div>
                )}
                {job.berthing_port && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Ship className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Berthing Port:</span>
                    <span className="font-medium">{job.berthing_port}</span>
                  </div>
                )}
              </div>
            )}

            {/* OOG / Escort info */}
            {OOG_TYPES.includes(job.job_type) && (
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${job.is_out_of_gauge ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {job.is_out_of_gauge ? 'Out of Gauge' : 'In Gauge'}
                </span>
                {job.is_out_of_gauge && (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${job.escort_required ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-muted border-border text-muted-foreground'}`}>
                    {job.escort_required ? `Escort: ${job.escort_date ? new Date(job.escort_date).toLocaleDateString('en-GB', {day:'2-digit',month:'short'}) : ''}${job.escort_time ? ' ' + job.escort_time : ''}` : 'No Escort'}
                  </span>
                )}
              </div>
            )}

            {/* Dates — non-LCL, non-LLD */}
            {job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
                {job.is_export ? (
                  <>
                    <DateField label="Truck In" value={job.trucking_date} />
                    <DateField label="ETD" value={job.truck_out_date} highlight />
                    <DateField label="Port In" value={job.port_in_date} />
                  </>
                ) : (
                  <>
                    <DateField label="ETA" value={job.vessel_eta} highlight />
                    <DateField label="Truck In" value={job.trucking_date} />
                    <DateField label="Delivery" value={job.delivery_date} />
                    <DateField label="Empty" value={job.empty_date} highlight={!!job.empty_date} />
                    <DateField label="Truck Out" value={job.truck_out_date} />
                  </>
                )}
              </div>
            )}

            {/* Chassis Usage Days */}
            {job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && !job.is_export && <ChassisUsageDays job={job} />}

            {/* Return / Collection Depot */}
            {job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && job.return_depot && (() => {
              const depot = depots.find(d => d.depot_name === job.return_depot);
              const dhc = depot?.dhc_charge || 0;
              const admin = depot?.admin_charge || 0;
              const additional = depot?.additional_charges || 0;
              const total = dhc + admin + additional;
              return (
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{job.is_export ? 'Collection Depot' : 'Return Depot'}: </span>
                    <span className="font-medium">{job.return_depot}</span>
                  </div>
                  {depot && total > 0 && (
                    <div className="inline-flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1">
                      <span className="text-blue-600">DHC: <span className="font-semibold">{dhc.toFixed(2)}</span></span>
                      {admin > 0 && <span className="text-blue-600">Admin: <span className="font-semibold">{admin.toFixed(2)}</span></span>}
                      {additional > 0 && <span className="text-blue-600">Additional: <span className="font-semibold">{additional.toFixed(2)}</span></span>}
                      <span className="text-blue-800 font-bold border-l border-blue-300 pl-2">Total: {depot.currency || 'SGD'} {total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Export containers list */}
            {job.is_export && job.export_containers && job.export_containers.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Containers ({job.export_containers.length})</span>
                <div className="flex flex-col gap-1.5">
                  {job.export_containers.map((c, i) => {
                    const chassisDays = (c.truck_out_date && c.port_in_date)
                      ? Math.round((new Date(c.port_in_date) - new Date(c.truck_out_date)) / (1000 * 60 * 60 * 24))
                      : null;
                    const chassisOver = chassisDays !== null && chassisDays > 3;
                    const missingVgm = !c.vgm;
                    const missingPortIn = !c.port_in_date;
                    return (
                      <div key={i} className={`flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-md border ${(missingVgm || missingPortIn) ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                        <span className="text-xs font-mono font-bold text-blue-800">{c.container_number || `Container ${i + 1}`}</span>
                        {c.vgm
                          ? <span className="text-xs text-blue-600 font-medium">VGM: {c.vgm} KG</span>
                          : <span className="text-xs text-amber-600 font-semibold">⚠ VGM missing</span>
                        }
                        {c.truck_out_date && (
                          <span className="text-xs text-blue-600">ETD: <span className="font-medium">{format(new Date(c.truck_out_date), 'dd MMM yyyy')}</span></span>
                        )}
                        {c.port_in_date
                          ? <span className="text-xs text-blue-600">Port In: <span className="font-medium">{format(new Date(c.port_in_date), 'dd MMM yyyy')}</span></span>
                          : <span className="text-xs text-amber-600 font-semibold">⚠ Port In missing</span>
                        }
                        {chassisDays !== null && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${chassisOver ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            {chassisDays}d{chassisOver ? ` ⚠ +${chassisDays - 3}d over` : ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {(job.delivery_address || job.delivery_postal_code) && (
              <div className="flex items-start gap-1.5 text-sm">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">Delivery: </span>
                  <span className="font-medium">
                    {(() => {
                      const addr = job.delivery_address || job.delivery_postal_code || '';
                      if (job.delivery_unit && job.delivery_address) {
                        return addr.replace(/(, Singapore )/, `, ${job.delivery_unit}$1`);
                      }
                      return addr;
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* PIC */}
            {job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery' && (job.pic_name || job.pic_contact) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {job.pic_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">PIC:</span>
                    <span className="font-medium">{job.pic_name}</span>
                  </div>
                )}
                {job.pic_contact && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{job.pic_contact}</span>
                  </div>
                )}
              </div>
            )}

            {/* VGM (import/single container) */}
            {job.container_vgm && (
              <div className="text-sm">
                <span className="text-muted-foreground">VGM: </span>
                <span className="font-semibold text-amber-600">{job.container_vgm} KG</span>
              </div>
            )}

            {/* Remarks */}
            {job.job_type !== 'Local Lorry Delivery' && ((job.remarks && job.remarks.length > 0) || job.remarks_text) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {job.remarks?.map((r, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal bg-destructive/5 text-destructive border-destructive/10 border gap-1">
                    {r}{job.remark_prices?.[r] ? `: $${Number(job.remark_prices[r]).toFixed(2)}` : ''}
                  </Badge>
                ))}
                {job.remarks_text && (
                  <span className="text-xs text-muted-foreground italic ml-1">{job.remarks_text}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 items-end">
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Duplicate job" onClick={() => onDuplicate(job)}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(job)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(job)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}