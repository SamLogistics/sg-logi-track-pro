import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Container, Package, Truck } from 'lucide-react';
import { Input } from "@/components/ui/input";

const FCL_TYPES = ["40FT FCL", "20FT FCL", "20TK", "40TK", "OOG", "20FT FR", "40FT FR", "40OT", "20OT"];
const LCL_TYPES = ["LCL"];
const LOCAL_TYPES = ["Local Delivery", "Local 40ft Trailer", "Local 20ft Trailer", "Cross Border Transport", "Local Lorry Delivery"];

function getJobIcon(jobType) {
  if (FCL_TYPES.includes(jobType)) return Container;
  if (LCL_TYPES.includes(jobType)) return Package;
  return Truck;
}

function getJobGroup(jobType) {
  if (FCL_TYPES.includes(jobType)) return 'FCL';
  if (LCL_TYPES.includes(jobType)) return 'LCL';
  if (LOCAL_TYPES.includes(jobType)) return 'Local';
  return 'SW';
}

function getMatchedField(job, q) {
  const checks = [
    { label: 'Container', val: job.container_number },
    { label: 'BL', val: job.bl_number },
    { label: 'Customer Ref', val: job.customer_ref },
    { label: 'Invoice', val: job.invoice_number },
    { label: 'Sysfreight', val: job.sysfreight_job_number },
    { label: 'CCP', val: job.ccp },
    { label: 'Vessel', val: job.vessel },
    { label: 'Voy', val: job.voy },
    { label: 'Vendor', val: job.vendor },
    { label: 'Customer', val: job.customer_name },
    { label: 'Address', val: job.delivery_address },
    { label: 'Depot', val: job.return_depot },
  ];
  for (const c of checks) {
    if (c.val && c.val.toLowerCase().includes(q)) return { label: c.label, val: c.val };
  }
  // check export containers
  for (const c of (job.export_containers || [])) {
    if (c.container_number && c.container_number.toLowerCase().includes(q)) {
      return { label: 'Container', val: c.container_number };
    }
  }
  return null;
}

function searchJobs(jobs, swJobs, query) {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 1) return [];

  const results = [];

  [...jobs].forEach(job => {
    const match = getMatchedField(job, q);
    if (match) {
      results.push({ ...job, _source: 'job', _matchedField: match });
    }
  });

  [...swJobs].forEach(job => {
    const swChecks = [
      { label: 'Container', val: job.container_number },
      { label: 'CCP', val: job.ccp },
      { label: 'Vendor', val: job.vendor },
      { label: 'Vessel', val: job.vessel },
      { label: 'Voy', val: job.voy },
      { label: 'Depot', val: job.return_depot },
    ];
    for (const c of swChecks) {
      if (c.val && c.val.toLowerCase().includes(q)) {
        results.push({ ...job, _source: 'sw', _matchedField: c });
        break;
      }
    }
  });

  return results.slice(0, 20);
}

export default function GlobalSearch({ jobs = [], swJobs = [], onSelectJob, onSelectSWJob }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const results = searchJobs(jobs, swJobs, query);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result) => {
    setQuery('');
    setOpen(false);
    if (result._source === 'sw') {
      onSelectSWJob?.(result);
    } else {
      onSelectJob?.(result);
    }
  };

  const clear = () => { setQuery(''); setOpen(false); inputRef.current?.focus(); };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search container, BL, customer..."
          className="pl-9 pr-8 h-9 text-sm"
        />
        {query && (
          <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && query.length >= 1 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-[420px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No results for "{query}"</div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((r, i) => {
                const Icon = getJobIcon(r.job_type);
                const group = r._source === 'sw' ? 'SW' : getJobGroup(r.job_type);
                const matched = r._matchedField;
                // Primary label: matched value if it's a key identifier, else fallback
                const mainLabel = matched?.val || r.container_number || r.bl_number || r.job_type;
                // Show matched field label if it's not the obvious container/BL
                const showMatchTag = matched && !['Container', 'BL'].includes(matched.label);
                const sub = [r.customer_name, r.vendor, r.vessel].filter(Boolean).join(' · ');
                const statusColor = r.status === 'Completed' ? 'bg-green-100 text-green-700'
                  : r.status === 'Ready to Bill' ? 'bg-amber-100 text-amber-700'
                  : r.status === 'In Progress' ? 'bg-blue-100 text-blue-700'
                  : 'bg-muted text-muted-foreground';
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-muted shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm truncate">{mainLabel}</span>
                        {showMatchTag && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{matched.label}</span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{group} · {r.job_type}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${statusColor}`}>{r.status || 'Pending'}</span>
                      </div>
                      {sub && <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}