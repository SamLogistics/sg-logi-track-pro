import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import AutocompleteInput, { saveToSuggestions } from "./AutocompleteInput";

const VEHICLE_SIZES = ["Van", "14ft", "20ft", "24ft"];

const LCL_REMARKS = [
  "Delivery Charge",
  "Fuel Surcharge",
  "Temporary Operational Surcharge",
  "Attendant Charge",
  "Out of Jurong Surcharge",
  "Admin Charge",
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

export default function LCLJobForm({ form, handleChange, handleChangeBatch }) {
  const [collectPostal, setCollectPostal] = useState(form.lcl_collection_postal || "");
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectError, setCollectError] = useState("");
  const [deliverPostal, setDeliverPostal] = useState(form.lcl_delivery_postal || "");
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [deliverError, setDeliverError] = useState("");
  const [distance, setDistance] = useState(form.lcl_distance_km || null);
  const [distanceLoading, setDistanceLoading] = useState(false);

  const geocodeQuery = async (query) => {
    const res = await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=N&pageNum=1`);
    const data = await res.json();
    return data.results?.[0] || null;
  };

  const getDistanceAuto = useCallback(async (fromQuery, toQuery) => {
    setDistanceLoading(true);
    setDistance(null);
    try {
      const [locA, locB] = await Promise.all([
        geocodeQuery(fromQuery),
        geocodeQuery(toQuery),
      ]);
      if (!locA || !locB) { setDistance("Address not found"); setDistanceLoading(false); return; }
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${locA.LONGITUDE},${locA.LATITUDE};${locB.LONGITUDE},${locB.LATITUDE}?overview=false`
      );
      const routeData = await routeRes.json();
      const metres = routeData?.routes?.[0]?.distance;
      if (metres != null) {
        const km = (metres / 1000).toFixed(1) + " km";
        setDistance(km);
        handleChange('lcl_distance_km', km);
      } else {
        setDistance("Unable to calculate");
      }
    } catch {
      setDistance("Error fetching distance");
    }
    setDistanceLoading(false);
  }, [handleChange]);

  // Auto-calculate when both addresses/postals are available
  useEffect(() => {
    const fromQuery = form.lcl_collection_postal || form.lcl_collection_address;
    const toQuery = form.lcl_delivery_postal || form.lcl_delivery_address;
    if (fromQuery && toQuery) {
      getDistanceAuto(fromQuery, toQuery);
    }
  }, [form.lcl_collection_postal, form.lcl_delivery_postal, form.lcl_collection_address, form.lcl_delivery_address, getDistanceAuto]);

  const getDistance = () => {
    const fromQuery = form.lcl_collection_postal || form.lcl_collection_address;
    const toQuery = form.lcl_delivery_postal || form.lcl_delivery_address;
    if (fromQuery && toQuery) getDistanceAuto(fromQuery, toQuery);
  };

  const invoiceAmount = parseFloat(form.invoice_amount) || 0;
  const vendorAmount = parseFloat(form.vendor_invoice_amount) || 0;
  const profit = invoiceAmount - vendorAmount;
  const showProfit = invoiceAmount > 0 && vendorAmount > 0;

  const handleCollectLookup = async () => {
    if (collectPostal.length !== 6) return;
    setCollectLoading(true); setCollectError("");
    const addr = await lookupPostal(collectPostal);
    if (addr) { handleChange('lcl_collection_address', addr); }
    else setCollectError("No address found.");
    setCollectLoading(false);
  };

  const handleDeliverLookup = async () => {
    if (deliverPostal.length !== 6) return;
    setDeliverLoading(true); setDeliverError("");
    const addr = await lookupPostal(deliverPostal);
    if (addr) { handleChange('lcl_delivery_address', addr); }
    else setDeliverError("No address found.");
    setDeliverLoading(false);
  };

  const toggleRemark = (remark) => {
    const selected = form.lcl_remarks || [];
    const prices = { ...(form.lcl_remark_prices || {}) };
    let newSelected;
    if (selected.includes(remark)) {
      delete prices[remark];
      newSelected = selected.filter(r => r !== remark);
    } else {
      newSelected = [...selected, remark];
    }
    const total = Object.values(prices).reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
    handleChangeBatch({
      lcl_remarks: newSelected,
      lcl_remark_prices: prices,
      invoice_amount: total > 0 ? total.toFixed(2) : form.invoice_amount,
    });
  };

  const setRemarkPrice = (remark, price) => {
    const updatedPrices = { ...(form.lcl_remark_prices || {}), [remark]: price };
    const total = Object.values(updatedPrices).reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
    handleChangeBatch({
      lcl_remark_prices: updatedPrices,
      invoice_amount: total > 0 ? total.toFixed(2) : form.invoice_amount,
    });
  };

  return (
    <div className="space-y-5 p-4 bg-purple-50/50 border border-purple-200 rounded-lg">
      <p className="text-sm font-semibold text-purple-700">LCL Job Details</p>

      {/* Customer + PIC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Customer Name</Label>
          <AutocompleteInput field="customer_name" value={form.customer_name} onChange={(v) => handleChange('customer_name', v)} placeholder="e.g. ABC Trading Pte Ltd" />
        </div>
        <div className="space-y-1.5">
          <Label>PIC Name</Label>
          <AutocompleteInput field="pic_name" value={form.pic_name} onChange={(v) => handleChange('pic_name', v)} placeholder="Person in charge" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>PIC Contact</Label>
        <AutocompleteInput field="pic_contact" value={form.pic_contact} onChange={(v) => handleChange('pic_contact', v)} placeholder="e.g. +65 9123 4567" />
      </div>

      {/* Vehicle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Vehicle Size</Label>
          <Select value={form.lcl_vehicle_size || ""} onValueChange={(v) => handleChange('lcl_vehicle_size', v)}>
            <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
            <SelectContent>
              {VEHICLE_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Box or Open</Label>
          <Select value={form.lcl_box_or_open || ""} onValueChange={(v) => handleChange('lcl_box_or_open', v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Box">Box</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="block mb-1">Crane Required?</Label>
          <button type="button" onClick={() => handleChange('lcl_crane', !form.lcl_crane)}
            className={`flex items-center gap-2.5 w-full h-9 px-3 rounded-md border text-sm font-medium transition-colors ${form.lcl_crane ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-muted border-border text-muted-foreground'}`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${form.lcl_crane ? 'bg-orange-500' : 'bg-muted-foreground/40'}`} />
            {form.lcl_crane ? 'Crane' : 'No Crane'}
          </button>
        </div>
        <div className="space-y-1.5">
          <Label className="block mb-1">Tailgate?</Label>
          <button type="button" onClick={() => handleChange('lcl_tailgate', !form.lcl_tailgate)}
            className={`flex items-center gap-2.5 w-full h-9 px-3 rounded-md border text-sm font-medium transition-colors ${form.lcl_tailgate ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-muted border-border text-muted-foreground'}`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${form.lcl_tailgate ? 'bg-blue-500' : 'bg-muted-foreground/40'}`} />
            {form.lcl_tailgate ? 'With Tailgate' : 'No Tailgate'}
          </button>
        </div>
      </div>

      {/* Attendant */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="lcl_attendant" checked={!!form.lcl_attendant} onCheckedChange={(v) => handleChange('lcl_attendant', !!v)} />
          <label htmlFor="lcl_attendant" className="text-sm font-medium cursor-pointer">Attendant Needed?</label>
        </div>
        {form.lcl_attendant && (
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">No. of Attendants</Label>
            <Input type="number" min="1" value={form.lcl_attendant_count || ""} onChange={(e) => handleChange('lcl_attendant_count', e.target.value)} className="w-20 h-8" />
          </div>
        )}
      </div>

      {/* Job Times */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Job Start Time</Label>
          <Input type="time" value={form.lcl_job_start_time || ""} onChange={(e) => handleChange('lcl_job_start_time', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Job End Time</Label>
          <Input type="time" value={form.lcl_job_end_time || ""} onChange={(e) => handleChange('lcl_job_end_time', e.target.value)} />
        </div>
      </div>

      {/* Collection Address */}
      <div className="space-y-2 p-3 bg-white border border-purple-100 rounded-lg">
        <Label className="font-medium">Collection Address</Label>
        <div className="flex gap-2">
          <Input
            maxLength={6}
            value={collectPostal}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setCollectPostal(v); setCollectError(""); handleChange('lcl_collection_postal', v); }}
            placeholder="Postal code"
            className="w-32 font-mono"
          />
          <Button type="button" variant="outline" size="icon" disabled={collectLoading || collectPostal.length !== 6} onClick={handleCollectLookup} className="shrink-0">
            {collectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
          <Input value={form.lcl_collection_address || ""} onChange={(e) => handleChange('lcl_collection_address', e.target.value)} placeholder="Full collection address" className="flex-1" />
        </div>
        {collectError && <p className="text-xs text-destructive">{collectError}</p>}
      </div>

      {/* Delivery Address */}
      <div className="space-y-2 p-3 bg-white border border-purple-100 rounded-lg">
        <Label className="font-medium">Delivery Address</Label>
        <div className="flex gap-2">
          <Input
            maxLength={6}
            value={deliverPostal}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setDeliverPostal(v); setDeliverError(""); handleChange('lcl_delivery_postal', v); }}
            placeholder="Postal code"
            className="w-32 font-mono"
          />
          <Button type="button" variant="outline" size="icon" disabled={deliverLoading || deliverPostal.length !== 6} onClick={handleDeliverLookup} className="shrink-0">
            {deliverLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
          <Input value={form.lcl_delivery_address || ""} onChange={(e) => handleChange('lcl_delivery_address', e.target.value)} placeholder="Full delivery address" className="flex-1" />
        </div>
        {deliverError && <p className="text-xs text-destructive">{deliverError}</p>}
      </div>

      {/* Distance */}
      {(form.lcl_collection_address || form.lcl_collection_postal) && (form.lcl_delivery_address || form.lcl_delivery_postal) && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">Driving Distance:</span>
          {distance ? (
            <span className="text-sm font-bold text-blue-800">{distance}</span>
          ) : (
            <span className="text-sm text-blue-500 italic">Not calculated</span>
          )}
          <Button type="button" variant="outline" size="sm" className="ml-auto h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100" onClick={getDistance} disabled={distanceLoading}>
            {distanceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Get Distance"}
          </Button>
        </div>
      )}

      {/* Remarks / Charges */}
      <div className="space-y-3">
        <Label className="font-medium">Remarks / Charges</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LCL_REMARKS.map(remark => {
            const checked = (form.lcl_remarks || []).includes(remark);
            return (
              <div key={remark} className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${checked ? 'bg-primary/5 border-primary/20' : 'border-transparent hover:bg-muted/50'}`}>
                <Checkbox checked={checked} onCheckedChange={() => toggleRemark(remark)} id={`lcl-remark-${remark}`} />
                <label htmlFor={`lcl-remark-${remark}`} className="flex-1 text-sm cursor-pointer">{remark}</label>
                {checked && (
                  <Input
                    type="number" min="0" step="0.01" placeholder="Price"
                    value={(form.lcl_remark_prices || {})[remark] || ""}
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

      {/* Billed */}
      <div className={`space-y-3 rounded-lg px-4 py-3 border transition-colors ${form.billed ? 'bg-green-50 border-green-200' : 'border-border hover:bg-muted/50'}`}>
        <div className="flex items-center gap-3">
          <Checkbox id="lcl_billed" checked={!!form.billed} onCheckedChange={(v) => handleChange('billed', !!v)} />
          <label htmlFor="lcl_billed" className="text-sm font-medium cursor-pointer">Billed?</label>
        </div>
        {form.billed && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Sysfreight Job No.</Label>
                <Input value={form.sysfreight_job_number || ""} onChange={(e) => handleChange('sysfreight_job_number', e.target.value)} placeholder="e.g. SFJ-0001" />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Number</Label>
                <Input value={form.invoice_number || ""} onChange={(e) => handleChange('invoice_number', e.target.value)} placeholder="e.g. INV-0001" />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Amount (SGD)</Label>
                <Input type="number" min="0" step="0.01" value={form.invoice_amount || ""} onChange={(e) => handleChange('invoice_amount', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice To (Bill to Company)</Label>
              <AutocompleteInput field="lcl_invoice_to" value={form.lcl_invoice_to || ""} onChange={(v) => handleChange('lcl_invoice_to', v)} placeholder="e.g. ABC Trading Pte Ltd" />
            </div>
          </div>
        )}
      </div>

      {/* Vendor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="space-y-1.5">
          <Label>Vendor Name</Label>
          <AutocompleteInput field="vendor" value={form.vendor} onChange={(v) => handleChange('vendor', v)} placeholder="e.g. Speedy Transport" />
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

      {/* Profit Display */}
      {showProfit && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-lg border font-medium ${profit >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <span>Profit</span>
          <span className="text-lg font-bold">SGD {profit.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}