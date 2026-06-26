import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const JOB_TYPES = ["40FT FCL", "20FT FCL", "20TK", "40TK", "OOG", "20FT FR", "40FT FR", "40OT", "20OT", "LCL", "Local Delivery", "Local 40ft Trailer", "Local 20ft Trailer", "Cross Border Transport"];
const STATUSES = ["Pending", "In Progress", "Ready to Bill", "Completed"];

export default function JobFilters({ filters, onFilterChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search vendor, vessel, container..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <Select value={filters.job_type} onValueChange={(v) => onFilterChange({ ...filters, job_type: v })}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {JOB_TYPES.map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(v) => onFilterChange({ ...filters, status: v })}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUSES.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}