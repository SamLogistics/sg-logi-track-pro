import React, { useState } from 'react';
import { entities } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Truck, Settings, Search, Home, Container, Package, Layers, Bike, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import JobForm from "../components/jobs/JobForm";
import JobTable from "../components/jobs/JobTable";
import FCLTable from "../components/jobs/FCLTable";
import OutstandingAlerts from "../components/jobs/OutstandingAlerts";
import SWStatsRow from "../components/sw/SWStatsRow";
import SWFilters from "../components/sw/SWFilters";
import SWJobForm from "../components/sw/SWJobForm";
import SWJobCard from "../components/sw/SWJobCard";
import ActiveJobCard from "../components/jobs/ActiveJobCard";
import GlobalSearch from "../components/jobs/GlobalSearch";
import BillJobDialog from "../components/jobs/BillJobDialog";

// Job type groupings
const FCL_TYPES = ["40FT FCL", "20FT FCL", "20TK", "40TK", "OOG", "20FT FR", "40FT FR", "40OT", "20OT"];
const LCL_TYPES = ["LCL"];
const LOCAL_TYPES = ["Local Delivery", "Local 40ft Trailer", "Local 20ft Trailer", "Cross Border Transport", "Local Lorry Delivery"];

const JOB_TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "fcl", label: "FCL / Container", icon: Container },
  { id: "lcl", label: "LCL", icon: Package },
  { id: "local", label: "Local Jobs", icon: Bike },
  { id: "swproject", label: "SW Project", icon: Layers },
];

const STATUSES = ["Pending", "In Progress", "Ready to Bill", "Completed"];

export default function Dashboard() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState("home");

  // Job Record state
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [fclSubTab, setFclSubTab] = useState("active"); // active | ready_to_bill | completed
  const [lclSubTab, setLclSubTab] = useState("active");
  const [localSubTab, setLocalSubTab] = useState("active");
  const [billingJob, setBillingJob] = useState(null);
  const [fclSearch, setFclSearch] = useState("");
  const [fclStatusFilter, setFclStatusFilter] = useState("all");
  const [lclSearch, setLclSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [completedSearch, setCompletedSearch] = useState("");

  // SW Project state
  const [swSubTab, setSWSubTab] = useState("active");
  const [showSWForm, setShowSWForm] = useState(false);
  const [editingSWJob, setEditingSWJob] = useState(null);
  const [deletingSWJob, setDeletingSWJob] = useState(null);
  const [swFilters, setSWFilters] = useState({ search: "", job_type: "all", status: "all" });

  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => entities.JobRecord.list('-created_date'),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const { data: depots = [] } = useQuery({
    queryKey: ['depots'],
    queryFn: () => entities.DepotCharge.list('depot_name'),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.JobRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowForm(false);
      setFclSubTab("active"); setLclSubTab("active"); setLocalSubTab("active");
    },
    onError: (error) => { alert('Failed to create record: ' + (error?.message || 'Unknown error')); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.JobRecord.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobs'] }); setShowForm(false); setEditingJob(null); },
    onError: (error) => { alert('Failed to update record: ' + (error?.message || 'Unknown error')); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.JobRecord.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobs'] }); setDeletingJob(null); },
    onError: (error) => { alert('Failed to delete record: ' + (error?.message || 'Unknown error')); },
  });

  // SW mutations
  const { data: swJobs = [], isLoading: swLoading } = useQuery({
    queryKey: ['swjobs'],
    queryFn: () => entities.SWProjectRecord.list('-created_date'),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const swCreateMutation = useMutation({
    mutationFn: (data) => entities.SWProjectRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['swjobs'] }); setShowSWForm(false); },
    onError: (error) => { alert('Failed to create SW record: ' + (error?.message || 'Unknown error')); },
  });

  const swUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.SWProjectRecord.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['swjobs'] }); setShowSWForm(false); setEditingSWJob(null); },
    onError: (error) => { alert('Failed to update SW record: ' + (error?.message || 'Unknown error')); },
  });

  const swDeleteMutation = useMutation({
    mutationFn: (id) => entities.SWProjectRecord.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['swjobs'] }); setDeletingSWJob(null); },
    onError: (error) => { alert('Failed to delete SW record: ' + (error?.message || 'Unknown error')); },
  });

  const swMarkCompletedMutation = useMutation({
    mutationFn: (id) => entities.SWProjectRecord.update(id, { status: "Completed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['swjobs'] }),
  });

  const handleBill = (job) => setBillingJob(job);
  const handleBillSave = (data) => {
    if (billingJob?.id) updateMutation.mutate({ id: billingJob.id, data });
    setBillingJob(null);
  };

  const handleBulkStatusUpdate = (ids, status) => {
    ids.forEach(id => updateMutation.mutate({ id, data: { status } }));
  };

  const handleSubmit = (data) => {
    if (editingJob && editingJob.id && !editingJob._isDuplicate) updateMutation.mutate({ id: editingJob.id, data });
    else createMutation.mutate(data);
  };

  const handleEdit = (job) => {
    // If on Home tab, switch to the correct tab so JobForm is rendered
    if (activeTab === "home") {
      const tab = FCL_TYPES.includes(job.job_type) ? 'fcl'
        : LCL_TYPES.includes(job.job_type) ? 'lcl'
        : LOCAL_TYPES.includes(job.job_type) ? 'local'
        : 'fcl';
      setActiveTab(tab);
    }
    setEditingJob(job);
    setShowForm(true);
  };

  const handleDuplicate = (job) => {
    const { id, created_date, updated_date, created_by, invoice_number, billed, sysfreight_job_number,
      vendor_invoice_number, trucking_date, delivery_date, truck_out_date, port_in_date,
      vessel_eta, escort_date, lld_date, ...rest } = job;
    setEditingJob({ ...rest, _isDuplicate: true });
    setShowForm(true);
  };

  const handleCancelForm = () => { setShowForm(false); setEditingJob(null); };

  const handleSWSubmit = (data) => {
    if (editingSWJob && !editingSWJob._isDuplicate) swUpdateMutation.mutate({ id: editingSWJob.id, data });
    else swCreateMutation.mutate(data);
  };

  const handleSWEdit = (job) => { setEditingSWJob(job); setShowSWForm(true); };
  const handleCancelSWForm = () => { setShowSWForm(false); setEditingSWJob(null); };

  const handleSWDuplicate = (job) => {
    const { id, created_date, updated_date, created_by,
      out_gate_date, trucking_date, empty_date, truck_out_date, return_date, ...rest } = job;
    setEditingSWJob({ ...rest, _isDuplicate: true });
    setShowSWForm(true);
  };

  // Filter helpers
  const isCompleted = (job) => job.billed === true && !!job.invoice_number;
  const isReadyToBill = (job) => !isCompleted(job) && (job.status || "Pending") === "Ready to Bill";
  const isActive = (job) => !isCompleted(job) && !isReadyToBill(job);

  const isSWCompleted = (job) => (job.status || "Pending") === "Completed";
  const isSWReadyToBill = (job) => !isSWCompleted(job) && (job.status || "Pending") === "Ready to Bill";
  const isSWActive = (job) => !isSWCompleted(job) && !isSWReadyToBill(job);

  // Tab-specific job filtering
  function filterByGroup(jobs, group, subTab, search, statusFilter) {
    let filtered = jobs.filter(j => group.includes(j.job_type));
    if (subTab === "completed") {
      filtered = filtered.filter(isCompleted);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(j =>
          [j.customer_name, j.vendor, j.container_number, j.invoice_number, j.vessel]
            .filter(Boolean).some(f => f.toLowerCase().includes(q)));
      }
      return filtered;
    }
    if (subTab === "ready_to_bill") {
      filtered = filtered.filter(isReadyToBill);
    } else {
      filtered = filtered.filter(isActive);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(j =>
        [j.vendor, j.vessel, j.container_number, j.voy, j.customer_name, j.bl_number, j.customer_ref]
          .filter(Boolean).some(f => f.toLowerCase().includes(q)));
    }
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(j => (j.status || "Pending") === statusFilter);
    }
    return filtered;
  }

  const fclJobs = filterByGroup(jobs, FCL_TYPES, fclSubTab, fclSearch, fclStatusFilter);
  const lclJobs = filterByGroup(jobs, LCL_TYPES, lclSubTab, lclSearch, "all");
  const localJobs = filterByGroup(jobs, LOCAL_TYPES, localSubTab, localSearch, "all");

  const filteredSWJobs = swJobs.filter(job => {
    if (swSubTab === "completed") return isSWCompleted(job);
    if (swSubTab === "ready_to_bill") return isSWReadyToBill(job);
    if (!isSWActive(job)) return false;
    const searchMatch = !swFilters.search ||
      [job.vendor, job.vessel, job.container_number, job.voy]
        .filter(Boolean).some(f => f.toLowerCase().includes(swFilters.search.toLowerCase()));
    const typeMatch = swFilters.job_type === "all" || job.job_type === swFilters.job_type;
    const statusMatch = swFilters.status === "all" || (job.status || "Pending") === swFilters.status;
    return searchMatch && typeMatch && statusMatch;
  }).sort((a, b) => {
    if (swSubTab !== "active") return 0;
    const dateA = a.out_gate_date ? new Date(a.out_gate_date) : new Date(0);
    const dateB = b.out_gate_date ? new Date(b.out_gate_date) : new Date(0);
    return dateB - dateA;
  });

  // Counts for tab badges
  const activeFCL = jobs.filter(j => FCL_TYPES.includes(j.job_type) && isActive(j)).length;
  const activeLCL = jobs.filter(j => LCL_TYPES.includes(j.job_type) && isActive(j)).length;
  const activeLocal = jobs.filter(j => LOCAL_TYPES.includes(j.job_type) && isActive(j)).length;
  const activeSW = swJobs.filter(isSWActive).length;

  function SubTabBar({ subTab, setSubTab, jobs, group, label }) {
    const grp = jobs.filter(j => group.includes(j.job_type));
    const activeCount = grp.filter(isActive).length;
    const billCount = grp.filter(isReadyToBill).length;
    const doneCount = grp.filter(isCompleted).length;
    return (
      <div className="flex gap-0 border-b border-border">
        {[
          { id: "active", label: "Active", count: activeCount, cls: "bg-muted text-muted-foreground" },
          { id: "ready_to_bill", label: "Ready to Bill", count: billCount, cls: "bg-amber-100 text-amber-700" },
          { id: "completed", label: "Completed", count: doneCount, cls: "bg-green-100 text-green-700" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${t.cls}`}>{t.count}</span>
          </button>
        ))}
      </div>
    );
  }

  const openNewJobForm = (defaultType) => {
    setEditingJob(defaultType ? { job_type: defaultType } : null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">Job Management</h1>
              <p className="text-xs text-muted-foreground">Transportation tracking system</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlobalSearch
              jobs={jobs}
              swJobs={swJobs}
              onSelectJob={(job) => {
                const tab = FCL_TYPES.includes(job.job_type) ? 'fcl'
                  : LCL_TYPES.includes(job.job_type) ? 'lcl' : 'local';
                setActiveTab(tab);
                handleEdit(job);
              }}
              onSelectSWJob={(job) => {
                setActiveTab('swproject');
                handleSWEdit(job);
              }}
            />
            <Link to="/settings">
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => logout()} title={`Sign out${user?.email ? ` (${user.email})` : ''}`}>
              <LogOut className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => {
                if (activeTab === "swproject") { setEditingSWJob(null); setShowSWForm(true); }
                else if (activeTab === "home") {
                  setActiveTab("fcl");
                  openNewJobForm("40FT FCL");
                } else {
                  const defaultType = activeTab === "fcl" ? "40FT FCL"
                    : activeTab === "lcl" ? "LCL"
                    : activeTab === "local" ? "Local Lorry Delivery"
                    : null;
                  openNewJobForm(defaultType);
                }
              }}
              className="gap-2 h-9"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Job</span>
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex gap-0 overflow-x-auto">
          {JOB_TABS.map(tab => {
            const count = tab.id === "fcl" ? activeFCL : tab.id === "lcl" ? activeLCL : tab.id === "local" ? activeLocal : tab.id === "swproject" ? activeSW : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {count !== null && count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ===================== HOME TAB ===================== */}
        {activeTab === "home" && (
          <div className="space-y-6">
            <OutstandingAlerts jobs={jobs} />

            {/* Quick summary by type */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "FCL Active", count: activeFCL, tab: "fcl", color: "bg-slate-800 text-white" },
                { label: "LCL Active", count: activeLCL, tab: "lcl", color: "bg-purple-700 text-white" },
                { label: "Local Active", count: activeLocal, tab: "local", color: "bg-amber-600 text-white" },
                { label: "SW Active", count: activeSW, tab: "swproject", color: "bg-blue-700 text-white" },
              ].map(item => (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className={`${item.color} rounded-xl px-5 py-4 text-left hover:opacity-90 transition-opacity`}
                >
                  <p className="text-3xl font-bold">{item.count}</p>
                  <p className="text-sm opacity-80 mt-1">{item.label}</p>
                </button>
              ))}
            </div>

            {/* Recent active jobs across all types */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Active Jobs</h2>
              {isLoading ? (
                <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {jobs.filter(isActive).slice(0, 8).map(job => (
                    <ActiveJobCard key={job.id} job={job} onEdit={handleEdit} onDelete={setDeletingJob} onDuplicate={handleDuplicate} />
                  ))}
                  {jobs.filter(isActive).length === 0 && (
                    <p className="text-center py-10 text-muted-foreground text-sm">No active jobs. Click "New Job" to get started.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== FCL TAB ===================== */}
        {activeTab === "fcl" && (
          <div className="space-y-4">
            <AnimatePresence>
              {showForm && (
                <motion.div key="job-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <JobForm job={editingJob} onSubmit={handleSubmit} onCancel={handleCancelForm} />
                </motion.div>
              )}
            </AnimatePresence>

            <SubTabBar subTab={fclSubTab} setSubTab={setFclSubTab} jobs={jobs} group={FCL_TYPES} />

            {/* Search + Status filter */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search container, vessel, customer..." value={fclSearch} onChange={e => setFclSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <div className="flex gap-1.5">
                {["all", ...STATUSES].map(s => (
                  <button
                    key={s}
                    onClick={() => setFclStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${fclStatusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'}`}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
            ) : fclSubTab === "active" ? (
              <FCLTable jobs={fclJobs} depots={depots} onEdit={handleEdit} onDelete={setDeletingJob} onDuplicate={handleDuplicate} onBill={handleBill} onBulkStatusUpdate={handleBulkStatusUpdate} />
            ) : (
              <JobTable jobs={fclJobs} depots={depots} onEdit={handleEdit} onDelete={setDeletingJob} onDuplicate={handleDuplicate} onBill={handleBill} onBulkStatusUpdate={handleBulkStatusUpdate} />
            )}
          </div>
        )}

        {/* ===================== LCL TAB ===================== */}
        {activeTab === "lcl" && (
          <div className="space-y-4">
            <AnimatePresence>
              {showForm && (
                <motion.div key="job-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <JobForm job={editingJob} onSubmit={handleSubmit} onCancel={handleCancelForm} />
                </motion.div>
              )}
            </AnimatePresence>

            <SubTabBar subTab={lclSubTab} setSubTab={setLclSubTab} jobs={jobs} group={LCL_TYPES} />

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search customer, vendor..." value={lclSearch} onChange={e => setLclSearch(e.target.value)} className="pl-9 h-9" />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
            ) : lclJobs.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">No LCL jobs match your filters.</div>
            ) : (
              <JobTable jobs={lclJobs} depots={depots} onEdit={handleEdit} onDelete={setDeletingJob} onDuplicate={handleDuplicate} onBill={handleBill} onBulkStatusUpdate={handleBulkStatusUpdate} />
            )}
          </div>
        )}

        {/* ===================== LOCAL JOBS TAB ===================== */}
        {activeTab === "local" && (
          <div className="space-y-4">
            <AnimatePresence>
              {showForm && (
                <motion.div key="job-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <JobForm job={editingJob} onSubmit={handleSubmit} onCancel={handleCancelForm} />
                </motion.div>
              )}
            </AnimatePresence>

            <SubTabBar subTab={localSubTab} setSubTab={setLocalSubTab} jobs={jobs} group={LOCAL_TYPES} />

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search customer, vendor, address..." value={localSearch} onChange={e => setLocalSearch(e.target.value)} className="pl-9 h-9" />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
            ) : localJobs.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">No local jobs match your filters.</div>
            ) : (
              <JobTable jobs={localJobs} depots={depots} onEdit={handleEdit} onDelete={setDeletingJob} onDuplicate={handleDuplicate} onBill={handleBill} onBulkStatusUpdate={handleBulkStatusUpdate} />
            )}
          </div>
        )}

        {/* ===================== SW PROJECT TAB ===================== */}
        {activeTab === "swproject" && (
          <div className="space-y-4">
            <SWStatsRow jobs={swJobs} />

            <div className="flex gap-0 border-b border-border">
              {[
                { id: "active", label: "Active", count: swJobs.filter(isSWActive).length, cls: "bg-muted text-muted-foreground" },
                { id: "ready_to_bill", label: "Ready to Bill", count: swJobs.filter(isSWReadyToBill).length, cls: "bg-amber-100 text-amber-700" },
                { id: "completed", label: "Completed", count: swJobs.filter(isSWCompleted).length, cls: "bg-green-100 text-green-700" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSWSubTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${swSubTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {t.label}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${t.cls}`}>{t.count}</span>
                </button>
              ))}
            </div>

            <AnimatePresence>
              {showSWForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <SWJobForm job={editingSWJob} onSubmit={handleSWSubmit} onCancel={handleCancelSWForm} />
                </motion.div>
              )}
            </AnimatePresence>

            {swSubTab === "active" && <SWFilters filters={swFilters} onFilterChange={setSWFilters} />}

            {swLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
            ) : filteredSWJobs.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">
                {swJobs.length === 0 ? "No SW Project records yet." : "No jobs match your filters."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSWJobs.map(job => (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
                    <SWJobCard job={job} depots={depots} onEdit={handleSWEdit} onDelete={setDeletingSWJob}
                      onMarkCompleted={(j) => swMarkCompletedMutation.mutate(j.id)} onDuplicate={handleSWDuplicate} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bill Job Dialog */}
      {billingJob && (
        <BillJobDialog
          job={billingJob}
          open={!!billingJob}
          onClose={() => setBillingJob(null)}
          onSave={handleBillSave}
        />
      )}

      {/* Delete - Job Record */}
      <AlertDialog open={!!deletingJob} onOpenChange={() => setDeletingJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deletingJob?.job_type} job
              {deletingJob?.container_number ? ` (${deletingJob.container_number})` : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deletingJob.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete - SW Project */}
      <AlertDialog open={!!deletingSWJob} onOpenChange={() => setDeletingSWJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this SW Project record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deletingSWJob?.job_type} job
              {deletingSWJob?.container_number ? ` (${deletingSWJob.container_number})` : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => swDeleteMutation.mutate(deletingSWJob.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}