import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, BookmarkPlus, Search, Loader2 } from "lucide-react";
import { entities } from "@/api/entities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AutocompleteInput, { saveToSuggestions } from "@/components/jobs/AutocompleteInput";

const SW_PREFIX = "sw_";


const SW_JOB_TYPES = ["40FT FCL", "20FT FCL"];
const STATUSES = ["Pending", "In Progress", "Ready to Bill", "Completed"];
const COMMON_REMARKS = [
  "OT Incur",
  "One Way Charge",
  "Out of Jurong Charge",
  "Tuas Mega Port Charge",
  "Waiting Charge",
  "Detention Charge",
  "Demurrage Charge",
  "Chassis Demurrage Charge",
  "Special Equipment",
  "Heavy Duty Surcharge",
  "Temporary Operational Surcharge",
];

export default function SWJobForm({ job, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    job_type: job?.job_type || "40FT FCL",
    vendor: job?.vendor || "",
    vessel: job?.vessel || "",
    voy: job?.voy || "",
    container_number: job?.container_number || "",
    ccp: job?.ccp || "",
    ccp_valid_date: job?.ccp_valid_date || "",
    out_gate_date: job?.out_gate_date || "",
    trucking_date: job?.trucking_date || "",
    empty_date: job?.empty_date || "",
    truck_out_date: job?.truck_out_date || "",
    return_date: job?.return_date || "",
    container_vgm: job?.container_vgm || "",
    delivery_address_name: job?.delivery_address_name || "",
    delivery_address: job?.delivery_address || "",
    delivery_postal_code: job?.delivery_postal_code || "",
    pic_name: job?.pic_name || "",
    pic_contact: job?.pic_contact || "",
    return_depot: job?.return_depot || "",
    remarks: job?.remarks || [],
    remark_prices: job?.remark_prices || {},
    remarks_text: job?.remarks_text || "",
    status: job?.status || "Pending",
  });

  const [saveAddrName, setSaveAddrName] = useState("");
  const [showSaveAddr, setShowSaveAddr] = useState(false);
  const [postalLoading, setPostalLoading] = useState(false);
  const [postalError, setPostalError] = useState("");

  const { data: depots = [] } = useQuery({
    queryKey: ['depots'],
    queryFn: () => entities.DepotCharge.list('depot_name'),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const lookupPostalCode = async (code) => {
    if (code.length !== 6) return;
    setPostalLoading(true);
    setPostalError("");
    try {
      const res = await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${code}&returnGeom=N&getAddrDetails=Y&pageNum=1`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const addr = [r.BLK_NO, r.ROAD_NAME, `Singapore ${r.POSTAL}`].filter(v => v && v !== 'NIL').join(', ');
        setForm(prev => ({ ...prev, delivery_address: addr, delivery_postal_code: r.POSTAL }));
      } else {
        setPostalError("No address found for this postal code.");
      }
    } catch {
      setPostalError("Failed to look up address.");
    } finally {
      setPostalLoading(false);
    }
  };
  const queryClient = useQueryClient();

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['sw_delivery_addresses'],
    queryFn: () => entities.SWDeliveryAddress.list('name'),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const applyAddress = (addr) => {
    setForm(prev => ({
      ...prev,
      delivery_address_name: addr.name,
      delivery_address: addr.address || "",
      delivery_postal_code: addr.postal_code || "",
      pic_name: addr.pic_name || "",
      pic_contact: addr.pic_contact || "",
    }));
  };

  const handleSaveAddress = async () => {
    if (!saveAddrName.trim()) return;
    await entities.SWDeliveryAddress.create({
      name: saveAddrName.trim(),
      address: form.delivery_address,
      postal_code: form.delivery_postal_code,
      pic_name: form.pic_name,
      pic_contact: form.pic_contact,
    });
    queryClient.invalidateQueries({ queryKey: ['sw_delivery_addresses'] });
    setSaveAddrName("");
    setShowSaveAddr(false);
  };

  const toggleRemark = (remark) => {
    setForm(prev => {
      const selected = prev.remarks.includes(remark)
        ? prev.remarks.filter(r => r !== remark)
        : [...prev.remarks, remark];
      const prices = { ...prev.remark_prices };
      if (!selected.includes(remark)) delete prices[remark];
      return { ...prev, remarks: selected, remark_prices: prices };
    });
  };

  const setRemarkPrice = (remark, price) => {
    setForm(prev => ({ ...prev, remark_prices: { ...prev.remark_prices, [remark]: price } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveToSuggestions(SW_PREFIX + 'return_depot', form.return_depot);
    saveToSuggestions(SW_PREFIX + 'vendor', form.vendor);
    saveToSuggestions(SW_PREFIX + 'vessel', form.vessel);
    saveToSuggestions(SW_PREFIX + 'voy', form.voy);
    saveToSuggestions(SW_PREFIX + 'container_number', form.container_number);
    saveToSuggestions(SW_PREFIX + 'ccp', form.ccp);
    saveToSuggestions(SW_PREFIX + 'pic_name', form.pic_name);
    saveToSuggestions(SW_PREFIX + 'pic_contact', form.pic_contact);
    saveToSuggestions(SW_PREFIX + 'delivery_address', form.delivery_address);
    const cleanedPrices = {};
    Object.entries(form.remark_prices).forEach(([k, v]) => {
      if (v !== "" && v !== undefined) cleanedPrices[k] = Number(v);
    });
    const submitData = {
      ...form,
      return_depot: form.return_depot === "__none__" ? "" : form.return_depot,
      container_vgm: form.container_vgm !== "" ? Number(form.container_vgm) : undefined,
      remark_prices: cleanedPrices,
    };
    onSubmit(submitData);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {job?._isDuplicate ? 'Duplicate SW Project Record' : job ? 'Edit SW Project Record' : 'New SW Project Record'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Job Type + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Job Type *</Label>
              <Select value={form.job_type} onValueChange={(v) => handleChange('job_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  {SW_JOB_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Vendor + Vessel + Voy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <AutocompleteInput field={SW_PREFIX + 'vendor'} value={form.vendor} onChange={(v) => handleChange('vendor', v)} placeholder="e.g. MSC" />
            </div>
            <div className="space-y-1.5">
              <Label>Vessel</Label>
              <AutocompleteInput field={SW_PREFIX + 'vessel'} value={form.vessel} onChange={(v) => handleChange('vessel', v)} placeholder="e.g. Ever Given" />
            </div>
            <div className="space-y-1.5">
              <Label>Voyage</Label>
              <AutocompleteInput field={SW_PREFIX + 'voy'} value={form.voy} onChange={(v) => handleChange('voy', v)} placeholder="e.g. 012E" />
            </div>
          </div>

          {/* Row 3: Container Number */}
          <div className="space-y-1.5">
            <Label>Container Number</Label>
            <AutocompleteInput
              field={SW_PREFIX + 'container_number'}
              value={form.container_number}
              onChange={(v) => handleChange('container_number', v.toUpperCase())}
              placeholder="e.g. MSCU1234567"
              inputClassName="font-mono tracking-wider"
            />
          </div>

          {/* CCP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>CCP Number</Label>
              <AutocompleteInput field={SW_PREFIX + 'ccp'} value={form.ccp} onChange={(v) => handleChange('ccp', v)} placeholder="e.g. CCP123456" />
            </div>
            <div className="space-y-1.5">
              <Label>CCP Valid Date</Label>
              <Input type="date" value={form.ccp_valid_date} onChange={(e) => handleChange('ccp_valid_date', e.target.value)} />
            </div>
          </div>

          {/* Row 4: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label>Out Gate Date</Label>
              <Input type="date" value={form.out_gate_date} onChange={(e) => handleChange('out_gate_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Truck In Date</Label>
              <Input type="date" value={form.trucking_date} onChange={(e) => handleChange('trucking_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Empty Date</Label>
              <Input type="date" value={form.empty_date} onChange={(e) => handleChange('empty_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Truck Out Date</Label>
              <Input type="date" value={form.truck_out_date} onChange={(e) => handleChange('truck_out_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Return Date</Label>
              <Input type="date" value={form.return_date} onChange={(e) => handleChange('return_date', e.target.value)} />
            </div>
          </div>

          {/* Return Depot */}
          <div className="space-y-1.5">
            <Label>Return Depot</Label>
            {depots.length > 0 ? (
              <Select value={form.return_depot} onValueChange={(v) => handleChange('return_depot', v)}>
                <SelectTrigger><SelectValue placeholder="Select depot" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {depots.map(d => (
                    <SelectItem key={d.id} value={d.depot_name}>{d.depot_name}{d.dhc_charge ? ` — ${d.currency || 'SGD'} ${Number(d.dhc_charge).toFixed(2)}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <AutocompleteInput field={SW_PREFIX + 'return_depot'} value={form.return_depot} onChange={(v) => handleChange('return_depot', v)} placeholder="e.g. Jurong Port Depot" />
            )}
            {(() => {
              const depot = depots.find(d => d.depot_name === form.return_depot);
              if (!depot) return null;
              const dhc = depot.dhc_charge || 0;
              const admin = depot.admin_charge || 0;
              const additional = depot.additional_charges || 0;
              const total = dhc + admin + additional;
              return (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1.5">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Depot Charges ({depot.currency || 'SGD'})</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">DHC:</span><span className="font-medium">{dhc.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Admin:</span><span className="font-medium">{admin.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Additional:</span><span className="font-medium">{additional.toFixed(2)}</span></div>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-blue-200">
                    <span className="text-xs font-semibold text-blue-700">Total:</span>
                    <span className="text-sm font-bold text-blue-800">{depot.currency || 'SGD'} {total.toFixed(2)}</span>
                  </div>
                  {depot.notes && <p className="text-xs text-muted-foreground italic">{depot.notes}</p>}
                </div>
              );
            })()}
          </div>

          {/* Delivery Address */}
          <div className="space-y-3 p-4 bg-muted/30 border border-border/60 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Delivery Address</Label>
              {savedAddresses.length > 0 && (
                <Select onValueChange={(id) => {
                  const addr = savedAddresses.find(a => a.id === id);
                  if (addr) applyAddress(addr);
                }}>
                  <SelectTrigger className="w-48 h-7 text-xs">
                    <SelectValue placeholder="Load saved address" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedAddresses.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Postal Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.delivery_postal_code}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); handleChange('delivery_postal_code', v); setPostalError(""); }}
                    placeholder="e.g. 098683"
                    className="font-mono flex-1"
                    maxLength={6}
                  />
                  <Button
                    type="button" variant="outline" size="icon"
                    disabled={postalLoading || form.delivery_postal_code.length !== 6}
                    onClick={() => lookupPostalCode(form.delivery_postal_code)}
                    className="shrink-0"
                  >
                    {postalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {postalError && <p className="text-xs text-destructive">{postalError}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Address</Label>
                <AutocompleteInput field={SW_PREFIX + 'delivery_address'} value={form.delivery_address} onChange={(v) => handleChange('delivery_address', v)} placeholder="Street address" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">PIC Name</Label>
                <AutocompleteInput field={SW_PREFIX + 'pic_name'} value={form.pic_name} onChange={(v) => handleChange('pic_name', v)} placeholder="Person in charge name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">PIC Contact</Label>
                <AutocompleteInput field={SW_PREFIX + 'pic_contact'} value={form.pic_contact} onChange={(v) => handleChange('pic_contact', v)} placeholder="e.g. +65 9123 4567" />
              </div>
            </div>
            {/* Save address */}
            {(form.delivery_address || form.delivery_postal_code) && (
              <div>
                {!showSaveAddr ? (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => setShowSaveAddr(true)}>
                    <BookmarkPlus className="w-3.5 h-3.5" /> Save this address
                  </Button>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={saveAddrName}
                      onChange={(e) => setSaveAddrName(e.target.value)}
                      placeholder="Address name (e.g. Jurong Cold Store)"
                      className="h-7 text-xs flex-1"
                    />
                    <Button type="button" size="sm" className="h-7 text-xs gap-1" onClick={handleSaveAddress} disabled={!saveAddrName.trim()}>
                      <Save className="w-3 h-3" /> Save
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowSaveAddr(false); setSaveAddrName(""); }}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remarks Checkboxes */}
          <div className="space-y-2">
            <Label>Remarks / Charges</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_REMARKS.map(remark => {
                const checked = form.remarks.includes(remark);
                return (
                  <div key={remark} className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${checked ? 'bg-primary/5 border-primary/20' : 'border-transparent hover:bg-muted/50'}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleRemark(remark)} id={`sw-remark-${remark.replace(/\s+/g, '-')}`} />
                    <label htmlFor={`sw-remark-${remark.replace(/\s+/g, '-')}`} className="flex-1 text-sm cursor-pointer">{remark}</label>
                    {checked && (
                      <Input
                        type="number" min="0" step="0.01" placeholder="Price"
                        value={form.remark_prices[remark] || ""}
                        onChange={(e) => setRemarkPrice(remark, e.target.value)}
                        className="h-7 w-28 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* VGM field */}
          {form.remarks.includes("Heavy Duty Surcharge") && (
            <div className="space-y-1.5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Label className="text-amber-700 font-medium">Container VGM (KG) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0"
                value={form.container_vgm}
                onChange={(e) => handleChange('container_vgm', e.target.value)}
                placeholder="Enter container VGM weight in KG"
                className="border-amber-300 focus:border-amber-500"
              />
              <p className="text-xs text-amber-600">Required for Heavy Duty Surcharge — please enter the verified gross mass.</p>
            </div>
          )}

          {/* Additional Remarks */}
          <div className="space-y-1.5">
            <Label>Additional Remarks</Label>
            <Textarea
              value={form.remarks_text}
              onChange={(e) => handleChange('remarks_text', e.target.value)}
              placeholder="Any additional notes..."
              className="h-20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={!form.job_type} className="gap-2">
              <Save className="w-4 h-4" />
              {job ? 'Update Record' : 'Create Record'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}