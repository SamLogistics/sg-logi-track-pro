import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role since this is an automated/admin task
    const depots = await base44.asServiceRole.entities.DepotCharge.list();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let applied = 0;
    for (const depot of depots) {
      if (
        depot.pending_effective_date &&
        depot.pending_effective_date <= today &&
        (depot.pending_dhc_charge != null ||
          depot.pending_admin_charge != null ||
          depot.pending_additional_charges != null)
      ) {
        const updates = {};
        if (depot.pending_dhc_charge != null) updates.dhc_charge = depot.pending_dhc_charge;
        if (depot.pending_admin_charge != null) updates.admin_charge = depot.pending_admin_charge;
        if (depot.pending_additional_charges != null) updates.additional_charges = depot.pending_additional_charges;

        // Clear pending fields
        updates.pending_dhc_charge = null;
        updates.pending_admin_charge = null;
        updates.pending_additional_charges = null;
        updates.pending_effective_date = null;

        await base44.asServiceRole.entities.DepotCharge.update(depot.id, updates);
        applied++;
      }
    }

    return Response.json({ success: true, applied, checked: depots.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});