import React from 'react';
import { differenceInDays, differenceInHours } from 'date-fns';
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

function getAlerts(jobs) {
  const alerts = [];
  const today = new Date();

  jobs.forEach(job => {
    if (job.billed && job.invoice_number) return; // skip completed

    // Import: truck_in >= 2 days, no Truck Out
    if (!job.is_export && job.trucking_date && !job.truck_out_date &&
        job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery') {
      const days = differenceInDays(today, new Date(job.trucking_date));
      if (days >= 2) {
        alerts.push({
          id: job.id,
          urgent: true,
          label: job.container_number || job.job_type,
          customer: job.customer_name || null,
          vendor: job.vendor || null,
          msg: `Truck In ${days}d ago — no Truck Out!`,
          type: 'import_truck_out',
        });
      }
    }

    // Import: truck_in >= 3 days, no Return Date
    if (!job.is_export && job.trucking_date && !job.return_date &&
        job.job_type !== 'LCL' && job.job_type !== 'Local Lorry Delivery') {
      const days = differenceInDays(today, new Date(job.trucking_date));
      if (days >= 3) {
        alerts.push({
          id: job.id,
          urgent: false,
          label: job.container_number || job.job_type,
          customer: job.customer_name || null,
          vendor: job.vendor || null,
          msg: `Truck In ${days}d ago — no Return Date!`,
          type: 'import_return_date',
        });
      }
    }

    // Export: ETD within 48h, missing VGM or Port In
    if (job.is_export && job.truck_out_date) {
      const hoursToEtd = differenceInHours(new Date(job.truck_out_date), today);
      if (hoursToEtd <= 48 && hoursToEtd > -24) {
        const missingVgm = job.export_containers?.some(c => !c.vgm);
        const missingPortIn = job.export_containers?.some(c => !c.port_in_date);
        if (missingVgm || missingPortIn) {
          const missing = [missingVgm && 'VGM', missingPortIn && 'Port In'].filter(Boolean).join(' & ');
          const label = job.export_containers?.[0]?.container_number || job.bl_number || job.job_type;
          alerts.push({
            id: job.id,
            urgent: hoursToEtd <= 24,
            label,
            customer: job.customer_name || null,
            vendor: job.vendor || null,
            msg: `ETD in ${hoursToEtd > 0 ? `${Math.round(hoursToEtd)}h` : 'overdue'} — ${missing} missing`,
            type: 'export_etd',
          });
        }
      }
    }
  });

  return alerts.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
}

export default function OutstandingAlerts({ jobs }) {
  const alerts = getAlerts(jobs);
  const activeJobs = jobs.filter(j => !(j.billed && j.invoice_number));
  const readyToBill = jobs.filter(j => !j.billed && (j.status === 'Ready to Bill'));
  const inProgress = jobs.filter(j => j.status === 'In Progress');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary stats */}
      <div className="lg:col-span-1 grid grid-cols-3 lg:grid-cols-1 gap-3">
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary"><TrendingUp className="w-4 h-4" /></div>
          <div><p className="text-2xl font-bold leading-none">{activeJobs.length}</p><p className="text-xs text-muted-foreground mt-0.5">Active Jobs</p></div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Clock className="w-4 h-4" /></div>
          <div><p className="text-2xl font-bold leading-none">{inProgress.length}</p><p className="text-xs text-muted-foreground mt-0.5">In Progress</p></div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><CheckCircle2 className="w-4 h-4" /></div>
          <div><p className="text-2xl font-bold leading-none">{readyToBill.length}</p><p className="text-xs text-muted-foreground mt-0.5">Ready to Bill</p></div>
        </div>
      </div>

      {/* Alert feed */}
      <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm">Outstanding Alerts</span>
          {alerts.length > 0 && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{alerts.length}</span>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            All clear — no outstanding alerts
          </div>
        ) : (
          <div className="divide-y divide-border max-h-48 overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-2.5 text-sm ${a.urgent ? 'bg-red-50/50' : 'bg-amber-50/30'}`}>
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${a.urgent ? 'text-red-500' : 'text-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono font-bold text-xs ${a.urgent ? 'text-red-700' : 'text-amber-700'} shrink-0`}>{a.label}</span>
                    {a.customer && <span className="text-xs text-foreground font-medium shrink-0">{a.customer}</span>}
                    {a.vendor && <span className="text-xs text-muted-foreground shrink-0">/ {a.vendor}</span>}
                  </div>
                  <p className={`text-xs mt-0.5 ${a.urgent ? 'text-red-600' : 'text-amber-600'}`}>{a.msg}</p>
                </div>
                {a.urgent && <span className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded shrink-0">URGENT</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}