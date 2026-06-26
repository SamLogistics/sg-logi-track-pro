import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, FileText } from "lucide-react";

const STATUS_CONFIG = {
  "Pending": { icon: Clock, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "In Progress": { icon: Loader2, className: "bg-primary/10 text-primary border-primary/20" },
  "Ready to Bill": { icon: FileText, className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  "Completed": { icon: CheckCircle2, className: "bg-green-500/10 text-green-600 border-green-500/20" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} border font-medium gap-1.5 px-2.5 py-1`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </Badge>
  );
}