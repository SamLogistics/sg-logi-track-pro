import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Container, Truck, Package } from "lucide-react";

const JOB_TYPE_CONFIG = {
  "40FT FCL": { icon: Container, className: "bg-primary/10 text-primary border-primary/20" },
  "20FT FCL": { icon: Container, className: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  "20TK": { icon: Package, className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  "40TK": { icon: Package, className: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  "OOG": { icon: Truck, className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  "20FT FR": { icon: Container, className: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  "40FT FR": { icon: Container, className: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  "LCL": { icon: Package, className: "bg-accent/10 text-accent border-accent/20" },
  "Local Delivery": { icon: Truck, className: "bg-green-500/10 text-green-600 border-green-500/20" },
  "Local 40ft Trailer": { icon: Container, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "Local 20ft Trailer": { icon: Container, className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  "Cross Border Transport": { icon: Truck, className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function JobTypeBadge({ type }) {
  const config = JOB_TYPE_CONFIG[type] || { icon: Truck, className: "bg-muted text-muted-foreground border-muted" };
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} border font-medium gap-1.5 px-2.5 py-1`}>
      <Icon className="w-3.5 h-3.5" />
      {type}
    </Badge>
  );
}