import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";

const LLD_REMARKS = [
  "Delivery Charge",
  "Waiting Charge",
  "ERP",
  "Parking",
  "OT Charge",
  "Fuel Surcharge",
  "Temporary Operational Surcharge",
  "Restricted Area Surcharge",
  "Additional Point Surcharge",
];

async function lookupPostal(code) {
  const res = await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${code}&returnGeom=N&getAddrDetails=Y&pageNum=1`);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    const r = data.results[0];
    return [r.BLK_NO, r.ROAD_NAME, `Singapore ${r.POSTAL}`].filter(v => v && v !== 'NIL').join(', ');
  }
  return null;
}

export default function LocalLorryJobForm({ form, handleChange, handleChangeBatch }) {
  const [pickupPostal, setPickupPostal] = useState(form.lld_pickup_postal || "");
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupError, setPickupError] = useState("");
  const [dropoffPostal, setDropoffPostal] = useState(form.lld_dropoff_postal || "");
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [dropoffError, setDropoffError] = useState("");

  const handlePickupLookup = async () => {
    if (pickupPostal.length !== 6) return;
    setPickupLoading(true); setPickupError("");
    const addr = await lookupPostal(pickupPostal);
    if (addr) handleChange('lld_pickup_address', addr);
    else setPickupError("No address found.");
    setPickupLoading(false);
  };

  const handleDropoffLookup = async () => {
    if (dropoffPostal.length !== 6) return;
    setDropoffLoading(true); setDropoffError("");
    const addr = await lookupPostal(dropoffPostal);
    if (addr) handleChange('lld_dropoff_address', addr);
    else setDropoffError("No address found.");
    setDropoffLoading(false);
  };

  // OT hours calculation
  const calcOtHours = () => {
    if (!form.lld_ot_start_time || !form.lld_ot_end_time) return null;
    const [sh, sm] = form.lld_ot_start_time.split(':').map(Number);
    const [eh, em] = form.lld_ot_end_time.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return (mins / 60).toFixed(2);
  };
  const otHoursCalc = calcOtHours();
  const otHours = otHoursCalc !== null ? parseFloat(otHoursCalc) : (parseFloat(form.lld_ot_hours_manual) || 0);
  const otRate = parseFloat(form.lld_ot_hourly_rate) || 0;
  const otTotal = otHours * otRate;

  const toggleRemark = (remark) => {
    const selected = form.lld_remarks || [];
    const prices = { ...(form.lld_remark_prices || {}) };
    let newSelected;
    if (selected.includes(remark)) {
      delete prices[remark];
      newSelected = selected.filter(r => r !== remark);
    } else {
      newSelected = [...selected, remark];
    }
    handleChangeBatch({ lld_remarks: newSelected, lld_remark_prices: prices });
  };

  const setRemarkPrice = (remark, price) => {
    handleChangeBatch({ lld_remark_prices: { ...(form.lld_remark_prices || {}), [remark]: price } });
  };

  const invoiceAmount = parseFloat(form.invoice_amount) || 0;
  const vendorAmount = parseFloat(form.vendor_invoice_amount) || 0;
  const showProfit = invoiceAmount > 0 && vendorAmount > 0;
  const profit = invoiceAmount - vendorAmount;

  return (
    <div className="space-y-5 p-4 bg-amber-50/40 border border-amber-200 rounded-lg">
      <p className="text-sm font-semibold text-amber-700">Local Lorry Delivery Details</p>

      {/* Date + Customer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Job Date</Label>
          <Input type="date" value={form.lld_date || ""} onChange={(e) => handleChange('lld_date', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Customer Name</Label>
          <AutocompleteInput field="customer_name" value={form.customer_name} onChange={(v) => handleChange('customer_name', v)} placeholder="e.g. ABC Trading Pte Ltd" />
        </div>
      </div>

      {/* Job Start / End Time */}
      {(() => {
        const calcJobHours = () => {
          if (!form.lld_job_start_time || !form.lld_job_end_time) return null;
          const [sh, sm] = form.lld_job_start_time.split(':').map(Number);
          const [eh, em] = form.lld_job_end_time.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          return (mins / 60).toFixed(2);
        };
        const jobHours = calcJobHours();
        const isOver3h = jobHours !== null && parseFloat(jobHours) > 3;
        return (
          <div className="space-y-2 p-3 bg-white border border-amber-100 rounded-lg">
            <Label className="font-medium text-amber-700">Job Duration <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start Time</Label>
                <Input type="time" value={form.lld_job_start_time || ""} onChange={(e) => handleChange('lld_job_start_time', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End Time</Label>
                <Input type="time" value={form.lld_job_end_time || ""} onChange={(e) => handleChange('lld_job_end_time', e.target.value)} className="h-9" />
              </div>
            </div>
            {jobHours !== null && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${isOver3h ? 'bg-red-50 border border-red-300 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                <span>Duration: <span className="font-bold">{jobHours} hrs</span></span>
                {isOver3h && <span className="text-xs font-normal">(exceeds 3 hours)</span>}
              </div>
            )}
          </div>
        );
      })()}

      {/* Vendor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-white border border-amber-100 rounded-lg">
        <div className="space-y-1.5">
          <Label>Vendor</Label>
          <AutocompleteInput field="vendor" value={form.vendor} onChange={(v) => handleChange('vendor', v)} placeholder="e.g. Express Logistics" />
        </div>
        <div className="space-y-1.5">
          <Label>Vendor Invoice No.</Label>
          <Input value={form.vendor_invoice_number || ""} onChange={(e) => handleChange('vendor_invoice_number', e.target.value)} placeholder="e.g. VIN-0001" />
        </div>
        <div className="space-y-1.5">
          <Label>Vendor Invoice Amount (SGD)</Label>
          <Input type="number" min="0" step="0.01" value={form.vendor_invoice_amount || ""} onChange={(e) => handleChange('vendor_invoice_amount', e.target.value)} placeholder="0.00" />
        </div>
      </div>

      {/* Pickup Point + Time */}
      <div className="space-y-3 p-3 bg-white border border-amber-100 rounded-lg">
        <Label className="font-medium text-amber-700">Pickup Details</Label>
        <div className="space-y-1.5">
          <Label>Pickup Point</Label>
          <Input value={form.lld_pickup_point || ""} onChange={(e) => handleChange('lld_pickup_point', e.target.value)} placeholder="e.g. Warehouse A, Jurong" />
        </div>
        <div className="space-y-1.5">
          <Label>Pickup Time <span className="text-muted-foreground font-normal text-xs">(time or comment e.g. "After 9am", "ASAP")</span></Label>
          <Input value={form.lld_pickup_time || ""} onChange={(e) => handleChange('lld_pickup_time', e.target.value)} placeholder="e.g. 09:00 or 'After 9am'" />
        </div>
        {/* Pickup Address */}
        <div className="space-y-1.5">
          <Label>Pickup Address</Label>
          <div className="flex gap-2">
            <Input
              maxLength={6}
              value={pickupPostal}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setPickupPostal(v); setPickupError(""); handleChange('lld_pickup_postal', v); }}
              placeholder="Postal"
              className="w-28 font-mono"
            />
            <Button type="button" variant="outline" size="icon" disabled={pickupLoading || pickupPostal.length !== 6} onClick={handlePickupLookup} className="shrink-0">
              {pickupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
            <Input value={form.lld_pickup_address || ""} onChange={(e) => handleChange('lld_pickup_address', e.target.value)} placeholder="Full pickup address" className="flex-1" />
          </div>
          {pickupError && <p className="text-xs text-destructive">{pickupError}</p>}
        </div>
        {/* Pickup PIC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Pickup PIC Name</Label>
            <Input value={form.lld_pickup_pic_name || ""} onChange={(e) => handleChange('lld_pickup_pic_name', e.target.value)} placeholder="Person in charge" />
          </div>
          <div className="space-y-1.5">
            <Label>Pickup PIC Contact</Label>
            <Input value={form.lld_pickup_pic_contact || ""} onChange={(e) => handleChange('lld_pickup_pic_contact', e.target.value)} placeholder="+65 9123 4567" />
          </div>
        </div>
      </div>

      {/* Drop-off Address */}
      <div className="space-y-3 p-3 bg-white border border-amber-100 rounded-lg">
        <Label className="font-medium text-amber-700">Drop-off Details</Label>
        <div className="space-y-1.5">
          <Label>Drop-off Address</Label>
          <div className="flex gap-2">
            <Input
              maxLength={6}
              value={dropoffPostal}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setDropoffPostal(v); setDropoffError(""); handleChange('lld_dropoff_postal', v); }}
              placeholder="Postal"
              className="w-28 font-mono"
            />
            <Button type="button" variant="outline" size="icon" disabled={dropoffLoading || dropoffPostal.length !== 6} onClick={handleDropoffLookup} className="shrink-0">
              {dropoffLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
            <Input value={form.lld_dropoff_address || ""} onChange={(e) => handleChange('lld_dropoff_address', e.target.value)} placeholder="Full drop-off address" className="flex-1" />
          </div>
          {dropoffError && <p className="text-xs text-destructive">{dropoffError}</p>}
        </div>
        {/* Drop-off PIC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Drop-off PIC Name</Label>
            <Input value={form.lld_dropoff_pic_name || ""} onChange={(e) => handleChange('lld_dropoff_pic_name', e.target.value)} placeholder="Person in charge" />
          </div>
          <div className="space-y-1.5">
            <Label>Drop-off PIC Contact</Label>
            <Input value={form.lld_dropoff_pic_contact || ""} onChange={(e) => handleChange('lld_dropoff_pic_contact', e.target.value)} placeholder="+65 9123 4567" />
          </div>
        </div>
      </div>

      {/* Job Notes */}
      <div className="space-y-1.5">
        <Label>Job Notes</Label>
        <Textarea value={form.lld_job_notes || ""} onChange={(e) => handleChange('lld_job_notes', e.target.value)} placeholder="Any special instructions or notes..." className="h-20 resize-none" />
      </div>

      {/* Optional: Driver / Lorry */}
      <div className="space-y-3 p-3 bg-white border border-dashed border-amber-200 rounded-lg">
        <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Optional — Lorry & Driver Info</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Lorry Number</Label>
            <Input value={form.lld_lorry_number || ""} onChange={(e) => handleChange('lld_lorry_number', e.target.value.toUpperCase())} placeholder="e.g. SBA1234A" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Driver Name</Label>
            <Input value={form.lld_driver_name || ""} onChange={(e) => handleChange('lld_driver_name', e.target.value)} placeholder="Driver full name" />
          </div>
          <div className="space-y-1.5">
            <Label>Driver Contact</Label>
            <Input value={form.lld_driver_contact || ""} onChange={(e) => handleChange('lld_driver_contact', e.target.value)} placeholder="+65 9123 4567" />
          </div>
          <div className="space-y-1.5">
            <Label>Delivery Assistant Name</Label>
            <Input value={form.lld_assistant_name || ""} onChange={(e) => handleChange('lld_assistant_name', e.target.value)} placeholder="Assistant name" />
          </div>
          <div className="space-y-1.5">
            <Label>Delivery Assistant Contact</Label>
            <Input value={form.lld_assistant_contact || ""} onChange={(e) => handleChange('lld_assistant_contact', e.target.value)} placeholder="+65 9123 4567" />
          </div>
        </div>
      </div>

      {/* Remarks / Charges */}
      <div className="space-y-3">
        <Label className="font-medium">Remarks / Charges</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LLD_REMARKS.map(remark => {
            const checked = (form.lld_remarks || []).includes(remark);
            const isOT = remark === "OT Charge";
            return (
              <div key={remark} className={`rounded-lg px-3 py-2 border transition-colors ${checked ? 'bg-primary/5 border-primary/20' : 'border-transparent hover:bg-muted/50'}`}>
                <div className="flex items-center gap-2">
                  <Checkbox checked={checked} onCheckedChange={() => toggleRemark(remark)} id={`lld-remark-${remark.replace(/\s+/g, '-')}`} />
                  <label htmlFor={`lld-remark-${remark.replace(/\s+/g, '-')}`} className="flex-1 text-sm cursor-pointer">{remark}</label>
                  {checked && !isOT && (
                    <Input
                      type="number" min="0" step="0.01" placeholder="Price"
                      value={(form.lld_remark_prices || {})[remark] || ""}
                      onChange={(e) => setRemarkPrice(remark, e.target.value)}
                      className="h-7 w-28 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>

                {/* OT Charge — expanded fields */}
                {checked && isOT && (
                  <div className="mt-3 space-y-3 pl-6">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">OT Start Time</Label>
                        <Input type="time" value={form.lld_ot_start_time || ""} onChange={(e) => handleChange('lld_ot_start_time', e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">OT End Time</Label>
                        <Input type="time" value={form.lld_ot_end_time || ""} onChange={(e) => handleChange('lld_ot_end_time', e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    {otHoursCalc !== null && (
                      <p className="text-xs text-primary font-medium">Calculated: {otHoursCalc} hours</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Or manual hours:</span>
                      <Input
                        type="number" min="0" step="0.25" placeholder="hrs"
                        value={form.lld_ot_hours_manual || ""}
                        onChange={(e) => handleChange('lld_ot_hours_manual', e.target.value)}
                        className="h-7 w-20 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Hourly rate (SGD):</span>
                      <Input
                        type="number" min="0" step="0.01" placeholder="rate"
                        value={form.lld_ot_hourly_rate || ""}
                        onChange={(e) => {
                          handleChange('lld_ot_hourly_rate', e.target.value);
                          const h = otHoursCalc !== null ? parseFloat(otHoursCalc) : (parseFloat(form.lld_ot_hours_manual) || 0);
                          const total = h * parseFloat(e.target.value || 0);
                          setRemarkPrice(remark, total.toFixed(2));
                        }}
                        className="h-7 w-24 text-xs"
                      />
                    </div>
                    {otTotal > 0 && (
                      <p className="text-xs font-semibold text-primary">OT Total: SGD {otTotal.toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billed */}
      <div className={`space-y-3 rounded-lg px-4 py-3 border transition-colors ${form.billed ? 'bg-green-50 border-green-200' : 'border-border hover:bg-muted/50'}`}>
        <div className="flex items-center gap-3">
          <Checkbox id="lld_billed" checked={!!form.billed} onCheckedChange={(v) => handleChange('billed', !!v)} />
          <label htmlFor="lld_billed" className="text-sm font-medium cursor-pointer">Billed?</label>
        </div>
        {form.billed && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input value={form.invoice_number || ""} onChange={(e) => handleChange('invoice_number', e.target.value)} placeholder="e.g. INV-0001" />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Amount (SGD)</Label>
              <Input type="number" min="0" step="0.01" value={form.invoice_amount || ""} onChange={(e) => handleChange('invoice_amount', e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Sysfreight Job No.</Label>
              <Input value={form.sysfreight_job_number || ""} onChange={(e) => handleChange('sysfreight_job_number', e.target.value)} placeholder="e.g. SFJ-0001" />
            </div>
          </div>
        )}
      </div>

      {/* Profit */}
      {showProfit && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-lg border font-medium ${profit >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <span>Profit</span>
          <span className="text-lg font-bold">SGD {profit.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}