import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Search, Loader2, Plus, Trash2 } from "lucide-react";
import AutocompleteInput, { saveToSuggestions } from "./AutocompleteInput";
import LCLJobForm from "./LCLJobForm";
import LocalLorryJobForm from "./LocalLorryJobForm";
import { entities } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";

const JOB_TYPES = ["40FT FCL", "20FT FCL", "20TK", "40TK", "OOG", "20FT FR", "40FT FR", "40OT", "20OT", "LCL", "Local Delivery", "Local 40ft Trailer", "Local 20ft Trailer", "Cross Border Transport", "Local Lorry Delivery"];

const OOG_TYPES = ["40OT", "20OT", "40FT FR", "20FT FR"];
const STATUSES = ["Pending", "In Progress", "Ready to Bill", "Completed"];

const COMMON_REMARKS = [
  "OT Incur",
  "Out of Jurong Charge",
  "Tuas Mega Port Charge",
  "Waiting Charge",
  "Detention Charge",
  "Demurrage Charge",
  "Special Equipment",
  "Heavy Duty Surcharge",
  "One Way Laden",
  "One Way Empty",
  "Weighing",
  "Fuel Surcharge",
  "Construction Site Surcharge",
  "Restricted Area Surcharge",
  "PSA Storent",
  "Temporary Operational Surcharge",
];

const IMPORT_ONLY_REMARKS = [
  "Washing",
  "Repair Charge",
];

const PRICE_REMARKS = [...COMMON_REMARKS, ...IMPORT_ONLY_REMARKS];

function toDateInput(value) {
  if (!value) return '';
  const text = String(value);
  return text.includes('T') ? text.slice(0, 10) : text;
}

export default function JobForm({ job, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    is_export: job?.is_export || false,
    job_type: job?.job_type || "",
    customer_name: job?.customer_name || "",
    vendor: job?.vendor || "",
    vendor_invoice_number: job?.vendor_invoice_number || "",
    vendor_invoice_amount: job?.vendor_invoice_amount ?? "",
    carrier: job?.carrier || "",
    vessel: job?.vessel || "",
    voy: job?.voy || "",
    container_number: job?.container_number || "",
    customer_ref: job?.customer_ref || "",
    bl_number: job?.bl_number || "",
    export_containers: (job?.export_containers?.length
      ? job.export_containers
      : [{ container_number: "", vgm: "", truck_out_date: "", port_in_date: "" }]
    ).map((c) => ({
      container_number: c.container_number || "",
      vgm: c.vgm ?? "",
      truck_out_date: toDateInput(c.truck_out_date),
      port_in_date: toDateInput(c.port_in_date),
    })),
    ccp: job?.ccp || "",
    ccp_valid_date: toDateInput(job?.ccp_valid_date),
    portnet_released: job?.portnet_released || false,
    vessel_eta: toDateInput(job?.vessel_eta),
    trucking_date: toDateInput(job?.trucking_date),
    container_vgm: job?.container_vgm ?? "",
    delivery_date: toDateInput(job?.delivery_date),
    truck_out_date: toDateInput(job?.truck_out_date),
    return_date: toDateInput(job?.return_date),
    port_in_date: toDateInput(job?.port_in_date),
    return_depot: job?.return_depot || "",
    remarks: job?.remarks || [],
    remark_prices: job?.remark_prices || {},
    remarks_text: job?.remarks_text || "",
    status: job?.status || "Pending",
    billed: job?.billed || false,
    invoice_number: job?.invoice_number || "",
    invoice_amount: job?.invoice_amount || "",
    sysfreight_job_number: job?.sysfreight_job_number || "",
    delivery_postal_code: job?.delivery_postal_code || "",
    delivery_address: job?.delivery_address || "",
    delivery_unit: job?.delivery_unit || "",
    is_out_of_gauge: job?.is_out_of_gauge || false,
    escort_required: job?.escort_required || false,
    escort_date: toDateInput(job?.escort_date),
    escort_time: job?.escort_time || "",
    pic_name: job?.pic_name || "",
    pic_contact: job?.pic_contact || "",
    berthing_port: job?.berthing_port || "",
    lcl_vehicle_size: job?.lcl_vehicle_size || "",
    lcl_crane: job?.lcl_crane || false,
    lcl_box_or_open: job?.lcl_box_or_open || "",
    lcl_attendant: job?.lcl_attendant || false,
    lcl_attendant_count: job?.lcl_attendant_count || "",
    lcl_job_start_time: job?.lcl_job_start_time || "",
    lcl_job_end_time: job?.lcl_job_end_time || "",
    lcl_collection_address: job?.lcl_collection_address || "",
    lcl_delivery_address: job?.lcl_delivery_address || "",
    lcl_tailgate: job?.lcl_tailgate || false,
    lcl_collection_postal: job?.lcl_collection_postal || "",
    lcl_delivery_postal: job?.lcl_delivery_postal || "",
    lcl_remarks: job?.lcl_remarks || [],
    lcl_remark_prices: job?.lcl_remark_prices || {},
    lcl_invoice_to: job?.lcl_invoice_to || "",
    lcl_distance_km: job?.lcl_distance_km || "",
    lld_date: toDateInput(job?.lld_date),
    lld_pickup_point: job?.lld_pickup_point || "",
    lld_pickup_time: job?.lld_pickup_time || "",
    lld_pickup_postal: job?.lld_pickup_postal || "",
    lld_pickup_address: job?.lld_pickup_address || "",
    lld_pickup_pic_name: job?.lld_pickup_pic_name || "",
    lld_pickup_pic_contact: job?.lld_pickup_pic_contact || "",
    lld_dropoff_postal: job?.lld_dropoff_postal || "",
    lld_dropoff_address: job?.lld_dropoff_address || "",
    lld_dropoff_pic_name: job?.lld_dropoff_pic_name || "",
    lld_dropoff_pic_contact: job?.lld_dropoff_pic_contact || "",
    lld_lorry_number: job?.lld_lorry_number || "",
    lld_driver_name: job?.lld_driver_name || "",
    lld_driver_contact: job?.lld_driver_contact || "",
    lld_assistant_name: job?.lld_assistant_name || "",
    lld_assistant_contact: job?.lld_assistant_contact || "",
    lld_job_notes: job?.lld_job_notes || "",
    lld_remarks: job?.lld_remarks || [],
    lld_remark_prices: job?.lld_remark_prices || {},
    lld_ot_start_time: job?.lld_ot_start_time || "",
    lld_ot_end_time: job?.lld_ot_end_time || "",
    lld_ot_hours_manual: job?.lld_ot_hours_manual || "",
    lld_ot_hourly_rate: job?.lld_ot_hourly_rate || "",
  });

  const [postalLoading, setPostalLoading] = useState(false);
  const [postalError, setPostalError] = useState("");

  const { data: depots = [] } = useQuery({
    queryKey: ['depots'],
    queryFn: () => entities.DepotCharge.list('depot_name'),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const isLCL = form.job_type === "LCL";
  const isLLD = form.job_type === "Local Lorry Delivery";

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-set status to Completed when billed + invoice number are both set
      if ((field === 'billed' || field === 'invoice_number') && updated.billed && updated.invoice_number) {
        updated.status = 'Completed';
      }
      return updated;
    });
  };

  const handleChangeBatch = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
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

  const addExportContainer = () => {
    setForm(prev => ({ ...prev, export_containers: [...prev.export_containers, { container_number: "", vgm: "", truck_out_date: "", port_in_date: "" }] }));
  };

  const removeExportContainer = (index) => {
    setForm(prev => ({ ...prev, export_containers: prev.export_containers.filter((_, i) => i !== index) }));
  };

  const updateExportContainer = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.export_containers];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, export_containers: updated };
    });
  };

  const setRemarkPrice = (remark, price) => {
    setForm(prev => ({ ...prev, remark_prices: { ...prev.remark_prices, [remark]: price } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    ['vendor', 'carrier', 'vessel', 'voy', 'return_depot', 'customer_name', 'berthing_port', 'lcl_invoice_to', 'pic_name', 'pic_contact'].forEach(f => saveToSuggestions(f, form[f]));

    const cleaned = {
      ...form,
      return_depot: form.return_depot === "__none__" ? "" : form.return_depot,
      container_vgm: form.container_vgm !== "" ? Number(form.container_vgm) : undefined,
      invoice_amount: form.invoice_amount !== "" ? Number(form.invoice_amount) : undefined,
      vendor_invoice_amount: form.vendor_invoice_amount !== "" ? Number(form.vendor_invoice_amount) : undefined,
      lcl_attendant_count: form.lcl_attendant_count !== "" ? Number(form.lcl_attendant_count) : undefined,
      lld_ot_hours_manual: form.lld_ot_hours_manual !== "" ? Number(form.lld_ot_hours_manual) : undefined,
      lld_ot_hourly_rate: form.lld_ot_hourly_rate !== "" ? Number(form.lld_ot_hourly_rate) : undefined,
      export_containers: form.export_containers.map(c => ({
        container_number: c.container_number,
        vgm: c.vgm !== "" ? Number(c.vgm) : undefined,
        truck_out_date: c.truck_out_date || undefined,
        port_in_date: c.port_in_date || undefined,
      })),
    };

    onSubmit(cleaned);
  };

  const invoiceAmt = parseFloat(form.invoice_amount) || 0;
  const vendorAmt = parseFloat(form.vendor_invoice_amount) || 0;
  const showProfit = !isLCL && !isLLD && invoiceAmt > 0 && vendorAmt > 0 && form.vendor_invoice_number && form.invoice_number;
  const profit = invoiceAmt - vendorAmt;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {job?._isDuplicate ? 'Duplicate Job Record' : job ? 'Edit Job Record' : 'New Job Record'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Row 1: Job Type + Status + Export toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Job Type *</Label>
              <Select value={form.job_type} onValueChange={(v) => handleChange('job_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select job type" /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
            {!isLCL && (
              <div className="space-y-1.5">
                <Label>Job Direction</Label>
                <button
                  type="button"
                  onClick={() => handleChange('is_export', !form.is_export)}
                  className={`flex items-center gap-2.5 w-full h-9 px-3 rounded-md border text-sm font-medium transition-colors ${form.is_export ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-muted border-border text-muted-foreground'}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${form.is_export ? 'bg-blue-500' : 'bg-muted-foreground/40'}`} />
                  {form.is_export ? 'Export' : 'Import'}
                </button>
              </div>
            )}
          </div>

          {/* LCL — completely different form */}
          {isLCL ? (
            <LCLJobForm form={form} handleChange={handleChange} handleChangeBatch={handleChangeBatch} />
          ) : isLLD ? (
            <LocalLorryJobForm form={form} handleChange={handleChange} handleChangeBatch={handleChangeBatch} />
          ) : (
            <>
              {/* Customer Name */}
              <div className="space-y-1.5">
                <Label>Customer Name</Label>
                <AutocompleteInput field="customer_name" value={form.customer_name} onChange={(v) => handleChange('customer_name', v)} placeholder="e.g. ABC Trading Pte Ltd" />
              </div>

              {/* Vendor + Vendor Invoice + Carrier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Vendor</Label>
                  <AutocompleteInput field="vendor" value={form.vendor} onChange={(v) => handleChange('vendor', v)} placeholder="e.g. MSC" />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor Invoice No.</Label>
                  <Input value={form.vendor_invoice_number} onChange={(e) => handleChange('vendor_invoice_number', e.target.value)} placeholder="e.g. VIN-0001" />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor Invoice Amount (SGD)</Label>
                  <Input type="number" min="0" step="0.01" value={form.vendor_invoice_amount} onChange={(e) => handleChange('vendor_invoice_amount', e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Carrier</Label>
                  <AutocompleteInput field="carrier" value={form.carrier} onChange={(v) => handleChange('carrier', v)} placeholder="e.g. COSCO" />
                </div>
              </div>

              {/* Vessel + Voy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Vessel</Label>
                  <AutocompleteInput field="vessel" value={form.vessel} onChange={(v) => handleChange('vessel', v)} placeholder="e.g. Ever Given" />
                </div>
                <div className="space-y-1.5">
                  <Label>Voyage</Label>
                  <AutocompleteInput field="voy" value={form.voy} onChange={(v) => handleChange('voy', v)} placeholder="e.g. 012E" />
                </div>
              </div>

              {/* Berthing Port */}
              <div className="space-y-1.5">
                <Label>Vessel Berthing Port</Label>
                <AutocompleteInput field="berthing_port" value={form.berthing_port} onChange={(v) => handleChange('berthing_port', v)} placeholder="e.g. Tanjong Pagar Terminal, Pasir Panjang" />
              </div>

              {/* Container / Ref / CCP */}
              {form.is_export ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Customer Ref No.</Label>
                    <Input value={form.customer_ref} onChange={(e) => handleChange('customer_ref', e.target.value)} placeholder="e.g. REF-20240001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CCP No.</Label>
                    <Input value={form.ccp} onChange={(e) => handleChange('ccp', e.target.value)} placeholder="Cargo Clearance Permit No." />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label>Container Number</Label>
                    <Input value={form.container_number} onChange={(e) => handleChange('container_number', e.target.value.toUpperCase())} placeholder="e.g. MSCU1234567" className="font-mono tracking-wider" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>BL Number</Label>
                    <Input value={form.bl_number} onChange={(e) => handleChange('bl_number', e.target.value)} placeholder="e.g. MSCUSG123456" className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Customer Ref No.</Label>
                    <Input value={form.customer_ref} onChange={(e) => handleChange('customer_ref', e.target.value)} placeholder="e.g. REF-20240001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CCP No.</Label>
                    <Input value={form.ccp} onChange={(e) => handleChange('ccp', e.target.value)} placeholder="Cargo Clearance Permit No." />
                  </div>
                </div>
              )}

              {/* Booking Number + Multi-container — Export only */}
              {form.is_export && (
                <div className="space-y-4 p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <div className="space-y-1.5">
                    <Label>Booking Number <span className="text-destructive">*</span></Label>
                    <Input value={form.bl_number} onChange={(e) => handleChange('bl_number', e.target.value)} placeholder="Booking number" className="font-mono tracking-wider" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Containers under this Booking</Label>
                      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addExportContainer}>
                        <Plus className="w-3.5 h-3.5" /> Add Container
                      </Button>
                    </div>
                    {form.export_containers.map((c, i) => {
                      // Chassis = Truck In (shared trucking_date) → Port In (per container)
                      const chassisDays = (form.trucking_date && c.port_in_date)
                        ? Math.round((new Date(c.port_in_date) - new Date(form.trucking_date)) / (1000 * 60 * 60 * 24))
                        : null;
                      const chassisOver = chassisDays !== null && chassisDays > 3;
                      return (
                        <div key={i} className="p-3 rounded-lg border border-border/60 bg-background space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5 shrink-0 font-semibold">{i + 1}.</span>
                            <Input
                              value={c.container_number}
                              onChange={(e) => updateExportContainer(i, 'container_number', e.target.value.toUpperCase())}
                              placeholder="Container No."
                              className="font-mono tracking-wider flex-1"
                            />
                            <Input
                              type="number"
                              min="0"
                              value={c.vgm}
                              onChange={(e) => updateExportContainer(i, 'vgm', e.target.value)}
                              placeholder="VGM (KG)"
                              className="w-28"
                            />
                            {form.export_containers.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExportContainer(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 pl-7">
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-muted-foreground">Truck Out Date</Label>
                              <Input type="date" value={c.truck_out_date || ""} onChange={(e) => updateExportContainer(i, 'truck_out_date', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs text-muted-foreground">Port In Date</Label>
                              <Input type="date" value={c.port_in_date || ""} onChange={(e) => updateExportContainer(i, 'port_in_date', e.target.value)} className="h-8 text-sm" />
                            </div>
                            {chassisDays !== null && (
                              <div className={`self-end mb-0.5 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${chassisOver ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                {chassisDays}d{chassisOver ? ` ⚠ +${chassisDays - 3}d over` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CCP Valid Date + Portnet Release — Import only */}
              {!form.is_export && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>CCP Valid Date</Label>
                    <Input type="date" value={form.ccp_valid_date} onChange={(e) => handleChange('ccp_valid_date', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Portnet Release</Label>
                    <button
                      type="button"
                      onClick={() => handleChange('portnet_released', !form.portnet_released)}
                      className={`flex items-center gap-2.5 w-full h-9 px-3 rounded-md border text-sm font-medium transition-colors ${form.portnet_released ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${form.portnet_released ? 'bg-green-500' : 'bg-red-500'}`} />
                      {form.portnet_released ? 'Released' : 'Not Released'}
                    </button>
                  </div>
                </div>
              )}

              {/* Dates */}
              {form.is_export ? (
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label>Truck In Date <span className="text-xs text-muted-foreground">(shared for all containers)</span></Label>
                    <Input type="date" value={form.trucking_date} onChange={(e) => handleChange('trucking_date', e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label>Vessel ETA</Label>
                    <Input type="date" value={form.vessel_eta} onChange={(e) => handleChange('vessel_eta', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Truck In Date</Label>
                    <Input type="date" value={form.trucking_date} onChange={(e) => handleChange('trucking_date', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Truck Out Date</Label>
                    <Input type="date" value={form.truck_out_date} onChange={(e) => handleChange('truck_out_date', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Return Date</Label>
                    <Input type="date" value={form.return_date || ""} onChange={(e) => handleChange('return_date', e.target.value)} />
                  </div>
                </div>
              )}

              {/* Return / Collection Depot */}
              <div className="space-y-1.5">
                <Label>{form.is_export ? 'Collection Depot' : 'Return Depot'}</Label>
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
                  <AutocompleteInput field="return_depot" value={form.return_depot} onChange={(v) => handleChange('return_depot', v)} placeholder={form.is_export ? 'e.g. Tanjong Pagar Terminal' : 'e.g. Jurong Port Depot'} />
                )}
                {/* Show depot costs when a depot with charges is selected */}
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
                <Label className="text-sm font-semibold">Delivery Address</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Postal Code</Label>
                    <div className="flex gap-2">
                      <Input
                        maxLength={6}
                        value={form.delivery_postal_code}
                        onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); handleChange('delivery_postal_code', val); setPostalError(""); }}
                        placeholder="e.g. 098683"
                        className="font-mono"
                      />
                      <Button type="button" variant="outline" size="icon" disabled={postalLoading || form.delivery_postal_code.length !== 6} onClick={() => lookupPostalCode(form.delivery_postal_code)} className="shrink-0">
                        {postalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    {postalError && <p className="text-xs text-destructive">{postalError}</p>}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <Input value={form.delivery_address} onChange={(e) => handleChange('delivery_address', e.target.value)} placeholder="Street address" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Unit Number</Label>
                  <Input value={form.delivery_unit} onChange={(e) => handleChange('delivery_unit', e.target.value)} placeholder="e.g. #05-12" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">PIC Name</Label>
                    <Input value={form.pic_name} onChange={(e) => handleChange('pic_name', e.target.value)} placeholder="Person in charge name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">PIC Contact</Label>
                    <Input value={form.pic_contact} onChange={(e) => handleChange('pic_contact', e.target.value)} placeholder="e.g. +65 9123 4567" />
                  </div>
                </div>
              </div>

              {/* OOG / Escort — for OT and FR job types */}
              {OOG_TYPES.includes(form.job_type) && (
                <div className="space-y-3 p-4 bg-orange-50/60 border border-orange-200 rounded-lg">
                  <Label className="text-orange-700 font-semibold">Gauge / Escort</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange('is_out_of_gauge', false)}
                      className={`flex-1 h-9 px-3 rounded-md border text-sm font-medium transition-colors ${!form.is_out_of_gauge ? 'bg-green-50 border-green-300 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}
                    >
                      In Gauge
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('is_out_of_gauge', true)}
                      className={`flex-1 h-9 px-3 rounded-md border text-sm font-medium transition-colors ${form.is_out_of_gauge ? 'bg-red-50 border-red-300 text-red-700' : 'bg-muted border-border text-muted-foreground'}`}
                    >
                      Out of Gauge
                    </button>
                  </div>
                  {form.is_out_of_gauge && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleChange('escort_required', !form.escort_required)}
                          className={`flex items-center gap-2.5 w-full h-9 px-3 rounded-md border text-sm font-medium transition-colors ${form.escort_required ? 'bg-red-50 border-red-300 text-red-700' : 'bg-muted border-border text-muted-foreground'}`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${form.escort_required ? 'bg-red-500' : 'bg-muted-foreground/40'}`} />
                          {form.escort_required ? 'Escort Required' : 'No Escort Needed'}
                        </button>
                      </div>
                      {form.escort_required && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Escort Date</Label>
                            <Input type="date" value={form.escort_date} onChange={(e) => handleChange('escort_date', e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Escort Time</Label>
                            <Input type="time" value={form.escort_time} onChange={(e) => handleChange('escort_time', e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Remarks Checkboxes */}
              <div className="space-y-3">
                <Label>Remarks / Charges</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[...COMMON_REMARKS, ...(form.is_export ? [] : IMPORT_ONLY_REMARKS)].map(remark => {
                    const checked = form.remarks.includes(remark);
                    const hasPrice = PRICE_REMARKS.includes(remark);
                    return (
                      <div key={remark} className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${checked ? 'bg-primary/5 border-primary/20' : 'border-transparent hover:bg-muted/50'}`}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleRemark(remark)} id={`remark-${remark}`} />
                        <label htmlFor={`remark-${remark}`} className="flex-1 text-sm cursor-pointer">{remark}</label>
                        {checked && hasPrice && (
                          <Input type="number" min="0" step="0.01" placeholder="Price" value={form.remark_prices[remark] || ""} onChange={(e) => setRemarkPrice(remark, e.target.value)} className="h-7 w-28 text-xs" onClick={(e) => e.stopPropagation()} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VGM — shown for ALL job types when Heavy Duty Surcharge is selected */}
              {form.remarks.includes("Heavy Duty Surcharge") && (
                <div className="space-y-1.5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <Label className="text-amber-700 font-medium">
                    Container VGM (KG) <span className="text-destructive">*</span>
                  </Label>
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
                <Textarea value={form.remarks_text} onChange={(e) => handleChange('remarks_text', e.target.value)} placeholder="Any additional notes..." className="h-20 resize-none" />
              </div>

              {/* Billed */}
              <div className={`space-y-3 rounded-lg px-4 py-3 border transition-colors ${form.billed ? 'bg-green-50 border-green-200' : 'border-border hover:bg-muted/50'}`}>
                <div className="flex items-center gap-3">
                  <Checkbox id="billed" checked={form.billed} onCheckedChange={(v) => handleChange('billed', !!v)} />
                  <label htmlFor="billed" className="text-sm font-medium cursor-pointer">Billed?</label>
                </div>
                {form.billed && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                      <Input placeholder="e.g. INV-0001" value={form.invoice_number} onChange={(e) => handleChange('invoice_number', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Invoice Amount (SGD)</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.invoice_amount} onChange={(e) => handleChange('invoice_amount', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Sysfreight Job No.</Label>
                      <Input placeholder="e.g. SFJ-0001" value={form.sysfreight_job_number} onChange={(e) => handleChange('sysfreight_job_number', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Profit display */}
              {showProfit && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg border font-medium ${profit >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <span>Estimated Profit</span>
                  <span className="text-lg font-bold">SGD {profit.toFixed(2)}</span>
                </div>
              )}
            </>
          )}

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