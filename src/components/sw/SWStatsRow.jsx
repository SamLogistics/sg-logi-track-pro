import React from 'react';
import { ClipboardList, Clock, Loader2, CheckCircle2, FileText } from "lucide-react";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 bg-card rounded-xl border border-border/60 px-4 py-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function SWStatsRow({ jobs }) {
  const total = jobs.length;
  const pending = jobs.filter(j => (j.status || "Pending") === "Pending").length;
  const inProgress = jobs.filter(j => j.status === "In Progress").length;
  const readyToBill = jobs.filter(j => j.status === "Ready to Bill").length;
  const completed = jobs.filter(j => j.status === "Completed").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <StatCard icon={ClipboardList} label="Total Jobs" value={total} color="bg-primary/10 text-primary" />
      <StatCard icon={Clock} label="Pending" value={pending} color="bg-amber-500/10 text-amber-600" />
      <StatCard icon={Loader2} label="In Progress" value={inProgress} color="bg-blue-500/10 text-blue-600" />
      <StatCard icon={FileText} label="Ready to Bill" value={readyToBill} color="bg-orange-500/10 text-orange-600" />
      <StatCard icon={CheckCircle2} label="Completed" value={completed} color="bg-green-500/10 text-green-600" />
    </div>
  );
}