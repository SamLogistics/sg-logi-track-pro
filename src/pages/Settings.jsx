import React, { useState } from 'react';
import { entities } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Save, X, Truck, ArrowLeft, MapPin, Clock, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function DepotForm({ depot, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    depot_name: depot?.depot_name || "",
    dhc_charge: depot?.dhc_charge ?? "",
    admin_charge: depot?.admin_charge ?? "",
    additional_charges: depot?.additional_charges ?? "",
    currency: depot?.currency || "SGD",
    notes: depot?.notes || "",
    pending_dhc_charge: depot?.pending_dhc_charge ?? "",
    pending_admin_charge: depot?.pending_admin_charge ?? "",
    pending_additional_charges: depot?.pending_additional_charges ?? "",
    pending_effective_date: depot?.pending_effective_date || "",
  });
  const [showPending, setShowPending] = useState(
    !!(depot?.pending_effective_date)
  );

  const dhc = parseFloat(form.dhc_charge) || 0;
  const admin = parseFloat(form.admin_charge) || 0;
  const additional = parseFloat(form.additional_charges) || 0;
  const total = dhc + admin + additional;

  const hasPending = form.pending_effective_date && (
    form.pending_dhc_charge !== "" || form.pending_admin_charge !== "" || form.pending_additional_charges !== ""
  );
  const pendingTotal = (parseFloat(form.pending_dhc_charge) || dhc) +
    (parseFloat(form.pending_admin_charge) || admin) +
    (parseFloat(form.pending_additional_charges) || additional);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      dhc_charge: parseFloat(form.dhc_charge) || 0,
      admin_charge: parseFloat(form.admin_charge) || 0,
      additional_charges: parseFloat(form.additional_charges) || 0,
      pending_dhc_charge: form.pending_dhc_charge !== "" ? parseFloat(form.pending_dhc_charge) : null,
      pending_admin_charge: form.pending_admin_charge !== "" ? parseFloat(form.pending_admin_charge) : null,
      pending_additional_charges: form.pending_additional_charges !== "" ? parseFloat(form.pending_additional_charges) : null,
      pending_effective_date: form.pending_effective_date || null,
    };
    onSubmit(data);
  };

  const numField = (key, placeholder) => (
    <Input
      type="number" min="0" step="0.01"
      value={form[key]}
      onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))}
      placeholder={placeholder}
      className="h-8 text-sm w-24"
    />
  );

  return (
    <>
      <tr className="bg-muted/30">
        <td className="px-4 py-2">
          <Input
            value={form.depot_name}
            onChange={(e) => setForm(p => ({ ...p, depot_name: e.target.value }))}
            placeholder="Depot name"
            className="h-8 text-sm"
          />
        </td>
        <td className="px-4 py-2">{numField('dhc_charge', '0.00')}</td>
        <td className="px-4 py-2">{numField('admin_charge', '0.00')}</td>
        <td className="px-4 py-2">{numField('additional_charges', '0.00')}</td>
        <td className="px-4 py-2">
          <Input
            value={form.currency}
            onChange={(e) => setForm(p => ({ ...p, currency: e.target.value }))}
            placeholder="SGD"
            className="h-8 text-sm w-16"
          />
        </td>
        <td className="px-4 py-2">
          <span className="font-semibold text-primary text-sm">{total.toFixed(2)}</span>
        </td>
        <td className="px-4 py-2">
          <Input
            value={form.notes}
            onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Optional notes"
            className="h-8 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <Button size="sm" className="h-7 px-2 gap-1 text-xs" onClick={handleSubmit} disabled={!form.depot_name}>
                <Save className="w-3 h-3" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancel}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setShowPending(p => !p)}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium"
            >
              <Clock className="w-3 h-3" />
              {showPending ? 'Hide' : 'Set Future Price'}
              {showPending ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </td>
      </tr>
      {showPending && (
        <tr className="bg-amber-50 border-l-4 border-l-amber-400">
          <td className="px-4 py-3" colSpan={8}>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mr-2">
                <Clock className="w-3.5 h-3.5" /> Upcoming Price Change
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Effective Date</Label>
                <Input
                  type="date"
                  value={form.pending_effective_date}
                  onChange={(e) => setForm(p => ({ ...p, pending_effective_date: e.target.value }))}
                  className="h-8 text-sm w-36"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">New DHC</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.pending_dhc_charge}
                  onChange={(e) => setForm(p => ({ ...p, pending_dhc_charge: e.target.value }))}
                  placeholder={form.dhc_charge || "0.00"}
                  className="h-8 text-sm w-24"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">New Admin</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.pending_admin_charge}
                  onChange={(e) => setForm(p => ({ ...p, pending_admin_charge: e.target.value }))}
                  placeholder={form.admin_charge || "0.00"}
                  className="h-8 text-sm w-24"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">New Additional</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.pending_additional_charges}
                  onChange={(e) => setForm(p => ({ ...p, pending_additional_charges: e.target.value }))}
                  placeholder={form.additional_charges || "0.00"}
                  className="h-8 text-sm w-24"
                />
              </div>
              {hasPending && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">New Total</Label>
                  <span className="h-8 flex items-center text-sm font-bold text-amber-700">{pendingTotal.toFixed(2)}</span>
                </div>
              )}
              {hasPending && (
                <button
                  type="button"
                  className="text-xs text-red-500 underline hover:text-red-700 self-end mb-1"
                  onClick={() => setForm(p => ({ ...p, pending_dhc_charge: "", pending_admin_charge: "", pending_additional_charges: "", pending_effective_date: "" }))}
                >
                  Clear
                </button>
              )}
            </div>
            {hasPending && (
              <p className="text-xs text-amber-600 mt-2">
                ✓ New prices will automatically apply on <strong>{form.pending_effective_date}</strong>.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function AddressForm({ address, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: address?.name || "",
    address: address?.address || "",
    postal_code: address?.postal_code || "",
    pic_name: address?.pic_name || "",
    pic_contact: address?.pic_contact || "",
  });
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <tr className="bg-muted/30">
      <td className="px-4 py-2">
        <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Jurong Cold Store" className="h-8 text-sm" />
      </td>
      <td className="px-4 py-2">
        <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" className="h-8 text-sm" />
      </td>
      <td className="px-4 py-2">
        <Input value={form.postal_code} onChange={(e) => setForm(p => ({ ...p, postal_code: e.target.value }))} placeholder="Postal code" className="h-8 text-sm w-24" maxLength={6} />
      </td>
      <td className="px-4 py-2">
        <Input value={form.pic_name} onChange={(e) => setForm(p => ({ ...p, pic_name: e.target.value }))} placeholder="PIC name" className="h-8 text-sm" />
      </td>
      <td className="px-4 py-2">
        <Input value={form.pic_contact} onChange={(e) => setForm(p => ({ ...p, pic_contact: e.target.value }))} placeholder="PIC contact" className="h-8 text-sm" />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <Button size="sm" className="h-7 px-2 gap-1 text-xs" onClick={handleSubmit} disabled={!form.name}>
            <Save className="w-3 h-3" /> Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancel}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// Dialog shown when deleting/renaming an address that is used by SW jobs
function AddressConflictDialog({ open, onClose, affectedJobs, oldName, newName, addresses, onConfirm }) {
  // per-job replacement selection: jobId -> new address name (or "__keep__")
  const [selections, setSelections] = useState({});
  const replacements = addresses.filter(a => a.name !== oldName);

  const handleConfirm = () => {
    onConfirm(selections);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            {newName ? 'Address Renamed — Jobs Affected' : 'Address Deleted — Jobs Affected'}
          </DialogTitle>
          <DialogDescription>
            <strong>{affectedJobs.length}</strong> SW job{affectedJobs.length > 1 ? 's' : ''} currently use the address <strong>"{oldName}"</strong>.
            {newName
              ? ` It has been renamed to "${newName}". Please confirm the correct address for each job below.`
              : ' Please choose a replacement address for each job, or leave blank to clear it.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {affectedJobs.map(job => (
            <div key={job.id} className="p-3 border border-border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono font-semibold text-foreground">{job.container_number || '—'}</span>
                {job.vendor && <span className="text-muted-foreground">· {job.vendor}</span>}
                {job.vessel && <span className="text-muted-foreground">· {job.vessel}</span>}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {job.delivery_address || '—'}
              </div>
              <Select
                value={selections[job.id] || (newName ? newName : '__clear__')}
                onValueChange={(v) => setSelections(s => ({ ...s, [job.id]: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select address..." />
                </SelectTrigger>
                <SelectContent>
                  {newName && <SelectItem value={newName}>✓ Use new name: {newName}</SelectItem>}
                  <SelectItem value="__clear__">— Clear address link —</SelectItem>
                  {replacements.map(a => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Confirm & Update Jobs</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Settings() {
  const [editingDepot, setEditingDepot] = useState(null);
  const [deletingDepot, setDeletingDepot] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingAddress, setDeletingAddress] = useState(null);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [conflictDialog, setConflictDialog] = useState(null); // { oldName, newName, affectedJobs, pendingAction }
  const queryClient = useQueryClient();

  const { data: depots = [], isLoading } = useQuery({
    queryKey: ['depots'],
    queryFn: () => entities.DepotCharge.list('-updated_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.DepotCharge.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depots'] }); setShowAddForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.DepotCharge.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depots'] }); setEditingDepot(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.DepotCharge.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depots'] }); setDeletingDepot(null); },
  });

  const { data: addresses = [], isLoading: isLoadingAddresses } = useQuery({
    queryKey: ['sw_delivery_addresses'],
    queryFn: () => entities.SWDeliveryAddress.list('name'),
  });

  const { data: swJobs = [] } = useQuery({
    queryKey: ['swjobs'],
    queryFn: () => entities.SWProjectRecord.list(),
    staleTime: 30_000,
  });

  const createAddressMutation = useMutation({
    mutationFn: (data) => entities.SWDeliveryAddress.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sw_delivery_addresses'] }); setShowAddAddressForm(false); },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }) => entities.SWDeliveryAddress.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sw_delivery_addresses'] }); setEditingAddress(null); },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id) => entities.SWDeliveryAddress.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sw_delivery_addresses'] }); setDeletingAddress(null); },
  });

  const updateSwJobMutation = useMutation({
    mutationFn: ({ id, data }) => entities.SWProjectRecord.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['swjobs'] }),
  });

  // Find SW jobs linked to a given address name
  const getAffectedJobs = (addressName) =>
    swJobs.filter(j => j.delivery_address_name === addressName);

  // Handle address update — check for rename conflicts
  const handleAddressUpdate = (addr, data) => {
    const nameChanged = data.name !== addr.name;
    const affected = nameChanged ? getAffectedJobs(addr.name) : [];
    if (affected.length > 0) {
      setConflictDialog({
        oldName: addr.name,
        newName: data.name,
        affectedJobs: affected,
        pendingAction: () => updateAddressMutation.mutate({ id: addr.id, data }),
      });
    } else {
      updateAddressMutation.mutate({ id: addr.id, data });
    }
  };

  // Handle address delete — check for conflicts
  const handleAddressDelete = (addr) => {
    const affected = getAffectedJobs(addr.name);
    if (affected.length > 0) {
      setConflictDialog({
        oldName: addr.name,
        newName: null,
        affectedJobs: affected,
        pendingAction: () => deleteAddressMutation.mutate(addr.id),
      });
    } else {
      setDeletingAddress(addr);
    }
  };

  // Apply job address re-assignments then run the pending action (save/delete)
  const handleConflictConfirm = (selections) => {
    const { affectedJobs, pendingAction } = conflictDialog;
    affectedJobs.forEach(job => {
      const chosen = selections[job.id];
      const newAddrName = (!chosen || chosen === '__clear__') ? '' : chosen;
      // Find full address details from saved addresses list
      const addrObj = addresses.find(a => a.name === newAddrName);
      updateSwJobMutation.mutate({
        id: job.id,
        data: {
          delivery_address_name: newAddrName || null,
          delivery_address: addrObj?.address ?? job.delivery_address,
          delivery_postal_code: addrObj?.postal_code ?? job.delivery_postal_code,
          pic_name: addrObj?.pic_name ?? job.pic_name,
          pic_contact: addrObj?.pic_contact ?? job.pic_contact,
        },
      });
    });
    pendingAction();
    setConflictDialog(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage depot charges</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Return Depot Charges (DHC)</CardTitle>
              <CardDescription className="mt-1">Manage depot handling charges. Rates are updated as depots change their pricing.</CardDescription>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => { setShowAddForm(true); setEditingDepot(null); }}>
              <Plus className="w-4 h-4" /> Add Depot
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Depot Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">DHC Charge</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Additional</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {showAddForm && (
                    <DepotForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setShowAddForm(false)} />
                  )}
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        <div className="flex justify-center">
                          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
                        </div>
                      </td>
                    </tr>
                  ) : depots.length === 0 && !showAddForm ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        No depots added yet. Click "Add Depot" to get started.
                      </td>
                    </tr>
                  ) : (
                    depots.map((depot) => {
                      const total = (depot.dhc_charge || 0) + (depot.admin_charge || 0) + (depot.additional_charges || 0);
                      return editingDepot?.id === depot.id ? (
                        <DepotForm
                          key={depot.id}
                          depot={depot}
                          onSubmit={(data) => updateMutation.mutate({ id: depot.id, data })}
                          onCancel={() => setEditingDepot(null)}
                        />
                      ) : (
                        <>
                        <tr key={depot.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{depot.depot_name}</td>
                          <td className="px-4 py-3">{Number(depot.dhc_charge || 0).toFixed(2)}</td>
                          <td className="px-4 py-3">{Number(depot.admin_charge || 0).toFixed(2)}</td>
                          <td className="px-4 py-3">{Number(depot.additional_charges || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{depot.currency || "SGD"}</td>
                          <td className="px-4 py-3 font-bold text-primary">{total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-muted-foreground italic">{depot.notes || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingDepot(depot)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingDepot(depot)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {depot.pending_effective_date && (
                          <tr key={`${depot.id}-pending`} className="bg-amber-50 border-b border-amber-100">
                            <td colSpan={8} className="px-4 py-2">
                              <div className="flex flex-wrap items-center gap-3 text-xs text-amber-700">
                                <span className="flex items-center gap-1 font-semibold"><Clock className="w-3 h-3" /> Pending from {depot.pending_effective_date}:</span>
                                {depot.pending_dhc_charge != null && <span>DHC: <strong>{Number(depot.pending_dhc_charge).toFixed(2)}</strong> <span className="text-amber-400">(was {Number(depot.dhc_charge || 0).toFixed(2)})</span></span>}
                                {depot.pending_admin_charge != null && <span>Admin: <strong>{Number(depot.pending_admin_charge).toFixed(2)}</strong> <span className="text-amber-400">(was {Number(depot.admin_charge || 0).toFixed(2)})</span></span>}
                                {depot.pending_additional_charges != null && <span>Additional: <strong>{Number(depot.pending_additional_charges).toFixed(2)}</strong> <span className="text-amber-400">(was {Number(depot.additional_charges || 0).toFixed(2)})</span></span>}
                              </div>
                            </td>
                          </tr>
                        )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {/* SW Saved Addresses */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-4 h-4" /> SW Project Saved Addresses</CardTitle>
              <CardDescription className="mt-1">Manage saved delivery addresses for SW Project jobs.</CardDescription>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => { setShowAddAddressForm(true); setEditingAddress(null); }}>
              <Plus className="w-4 h-4" /> Add Address
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Postal</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">PIC Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">PIC Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {showAddAddressForm && (
                    <AddressForm onSubmit={(data) => createAddressMutation.mutate(data)} onCancel={() => setShowAddAddressForm(false)} />
                  )}
                  {isLoadingAddresses ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground"><div className="flex justify-center"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div></td></tr>
                  ) : addresses.length === 0 && !showAddAddressForm ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No saved addresses yet.</td></tr>
                  ) : (
                    addresses.map((addr) => (
                      editingAddress?.id === addr.id ? (
                        <AddressForm
                          key={addr.id}
                          address={addr}
                          onSubmit={(data) => { handleAddressUpdate(addr, data); setEditingAddress(null); }}
                          onCancel={() => setEditingAddress(null)}
                        />
                      ) : (
                        <tr key={addr.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              {addr.name}
                              {getAffectedJobs(addr.name).length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                  {getAffectedJobs(addr.name).length} job{getAffectedJobs(addr.name).length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{addr.address || "—"}</td>
                          <td className="px-4 py-3 font-mono">{addr.postal_code || "—"}</td>
                          <td className="px-4 py-3">{addr.pic_name || "—"}</td>
                          <td className="px-4 py-3">{addr.pic_contact || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingAddress(addr)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleAddressDelete(addr)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deletingDepot} onOpenChange={() => setDeletingDepot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this depot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingDepot?.depot_name}</strong> and its charges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingDepot.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingAddress} onOpenChange={() => setDeletingAddress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingAddress?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAddressMutation.mutate(deletingAddress.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {conflictDialog && (
        <AddressConflictDialog
          open={!!conflictDialog}
          onClose={() => setConflictDialog(null)}
          affectedJobs={conflictDialog.affectedJobs}
          oldName={conflictDialog.oldName}
          newName={conflictDialog.newName}
          addresses={addresses}
          onConfirm={handleConflictConfirm}
        />
      )}
    </div>
  );
}