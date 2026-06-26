import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt } from "lucide-react";

export default function BillJobDialog({ job, open, onClose, onSave }) {
  const [invoiceNumber, setInvoiceNumber] = useState(job?.invoice_number || '');
  const [invoiceAmount, setInvoiceAmount] = useState(job?.invoice_amount || '');
  const [sysfreightJobNumber, setSysfreightJobNumber] = useState(job?.sysfreight_job_number || '');

  const handleSave = () => {
    onSave({
      billed: true,
      status: 'Completed',
      invoice_number: invoiceNumber,
      invoice_amount: invoiceAmount !== '' ? Number(invoiceAmount) : undefined,
      sysfreight_job_number: sysfreightJobNumber,
    });
    onClose();
  };

  const label = job?.container_number || job?.bl_number || job?.job_type || 'Job';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            Bill Job — <span className="font-mono">{label}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {job?.customer_name && (
            <p className="text-sm text-muted-foreground">Customer: <span className="font-medium text-foreground">{job.customer_name}</span></p>
          )}

          <div className="space-y-1.5">
            <Label>Invoice Number <span className="text-destructive">*</span></Label>
            <Input
              autoFocus
              placeholder="e.g. INV-0001"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Invoice Amount (SGD)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={invoiceAmount}
              onChange={e => setInvoiceAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Sysfreight Job No.</Label>
            <Input
              placeholder="e.g. SFJ-0001"
              value={sysfreightJobNumber}
              onChange={e => setSysfreightJobNumber(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!invoiceNumber.trim()}
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Receipt className="w-4 h-4" />
            Mark as Billed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}