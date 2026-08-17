// ============== PROPOSED — Inventory page ==============
// Tracks raw materials (juwar grain, mango, makhana, chilli) with vendor + cost.
// Stock decreases as batches consume from it.

// Format a YYYY-MM string into "May 2026"
const fmtMonth = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const ProInventory = () => {
  const { state, actions } = useAppState();
  const { inventory } = state;
  const [adding, setAdding] = React.useState(false);

  const totalInvestment = inventory.reduce(
    (s, i) => s + Number(i.qty) * (Number(i.costPerUnit) + Number(i.shipPerUnit)),
    0
  );
  const totalStockLeft = inventory.reduce((s, i) => s + i.stockRemaining, 0);

  return (
    <div className="pro frame" data-screen-label="Proposed · Inventory">
      <ProSidebar active="/dashboard/inventory" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Operate"
          title="Inventory"
          sub="Raw materials in stock. Batches consume from here."
          actions={
            <>
              <button className="pro-btn pro-btn-secondary"><Icons.Download size={13} sw={2} />Export</button>
              <button className="pro-btn pro-btn-primary" onClick={() => setAdding(true)}>
                <Icons.Plus size={14} sw={2} />Add raw material
              </button>
            </>
          }
        />

        <div className="pro-section" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary strip */}
          <div className="pro-statgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <ProStat label="Raw materials"  value={String(inventory.length)} delta={null} deltaLabel="active SKUs" />
            <ProStat label="Stock on hand"  value={totalStockLeft.toLocaleString('en-IN') + ' kg'} delta={null} deltaLabel="across all materials" />
            <ProStat label="Investment"     value={Math.round(totalInvestment).toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel="cost + transport" />
          </div>

          {/* Main table */}
          <div className="pro-card">
            <div className="pro-card-head">
              <div>
                <h3>Inventory</h3>
                <div className="sub">Current stock per raw material</div>
              </div>
            </div>
            <table className="pro-table">
              <thead><tr>
                <th>Name</th>
                <th>Vendor</th>
                <th>Purchased</th>
                <th className="r">KG / units</th>
                <th className="r">Cost / unit</th>
                <th className="r">Ship / unit</th>
                <th className="r">Total cost</th>
                <th className="r">Stock left</th>
                <th style={{ width: 32 }}></th>
              </tr></thead>
              <tbody>
                {inventory.map((i) => {
                  const total = Number(i.qty) * (Number(i.costPerUnit) + Number(i.shipPerUnit));
                  const stockPct = Number(i.qty) > 0 ? (i.stockRemaining / Number(i.qty)) * 100 : 0;
                  const low = stockPct < 25;
                  return (
                    <tr key={i.id}>
                      <td className="strong">
                        {i.name}
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          added {i.addedDate}
                        </div>
                      </td>
                      <td><span className="muted">{i.vendor}</span></td>
                      <td><span className="muted">{fmtMonth(i.purchaseMonth) || '—'}</span></td>
                      <td className="r"><span className="tnum">{Number(i.qty).toLocaleString('en-IN')}</span> <span className="muted">{i.unit}</span></td>
                      <td className="r"><Money v={Number(i.costPerUnit)} /></td>
                      <td className="r"><Money v={Number(i.shipPerUnit)} /></td>
                      <td className="r"><Money v={total} /></td>
                      <td className="r">
                        <span className="tnum" style={{ color: low ? 'var(--p-danger)' : 'var(--p-fg)', fontWeight: 500 }}>
                          {i.stockRemaining.toLocaleString('en-IN')}
                        </span> <span className="muted">{i.unit}</span>
                        <div style={{ marginTop: 4, height: 4, width: 70, marginLeft: 'auto', background: 'var(--p-border-soft)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${stockPct}%`, background: low ? 'var(--p-danger)' : 'var(--p-accent)' }} />
                        </div>
                      </td>
                      <td className="r">
                        <button onClick={() => actions.deleteInventory(i.id)} aria-label="Delete"
                                title="Delete this inventory entry"
                                style={{ background: 'none', border: 'none', cursor: 'pointer',
                                         color: 'var(--p-muted-soft)', padding: 4 }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--p-danger)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--p-muted-soft)'}>
                          <Icons.X size={14} sw={2} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {inventory.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--p-muted)' }}>
                    No raw materials yet. Click <span style={{ color: 'var(--p-fg)', fontWeight: 500 }}>Add raw material</span> to start.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {adding && <AddRawDialog onClose={() => setAdding(false)} onSave={actions.addInventory} />}
    </div>
  );
};

/* ----- Add Raw Material dialog ----- */
const AddRawDialog = ({ onClose, onSave }) => {
  const { state } = useAppState();
  const suppliers = state.partners.filter((p) => p.role === 'Supplier');
  const [form, setForm] = React.useState({
    name: '',
    vendorId: suppliers[0]?.id ?? '',
    vendor: suppliers[0]?.name ?? '',
    qty: '',
    unit: 'kg',
    costPerUnit: '',
    shipPerUnit: '',
    purchaseMonth: '2026-05',
  });

  const totalCost = (Number(form.qty) || 0) * ((Number(form.costPerUnit) || 0) + (Number(form.shipPerUnit) || 0));
  const valid = form.name.trim() && Number(form.qty) > 0 && Number(form.costPerUnit) >= 0;

  const setVendor = (id) => {
    const s = suppliers.find((p) => p.id === id);
    setForm((f) => ({ ...f, vendorId: id, vendor: s?.name ?? '' }));
  };

  const submit = () => {
    if (!valid) return;
    onSave({
      name: form.name.trim(),
      vendor: form.vendor,
      vendorId: form.vendorId,
      qty: Number(form.qty),
      unit: form.unit,
      costPerUnit: Number(form.costPerUnit),
      shipPerUnit: Number(form.shipPerUnit) || 0,
      purchaseMonth: form.purchaseMonth,
    });
    onClose();
  };

  return (
    <div className="pro-modal-backdrop" onClick={onClose}>
      <div className="pro-modal" onClick={(e) => e.stopPropagation()} style={{ width: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--p-border)' }}>
          <div>
            <h2 style={{ margin: 0, font: '600 16px/1.2 Inter, sans-serif', letterSpacing: '-0.01em' }}>Add raw material</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--p-muted)' }}>This becomes available for batches that need it.</p>
          </div>
          <button onClick={onClose} aria-label="Close"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted)', padding: 4 }}>
            <Icons.X size={16} sw={2} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="pro-label">Material name</label>
            <input className="pro-input" placeholder="e.g. Juwar Grain"
                   value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })}
                   autoFocus />
          </div>

          <div>
            <label className="pro-label">Vendor</label>
            {suppliers.length > 0 ? (
              <select className="pro-select-native" value={form.vendorId} onChange={(e) => setVendor(e.target.value)}>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.loc}</option>
                ))}
              </select>
            ) : (
              <input className="pro-input" placeholder="Vendor name"
                     value={form.vendor}
                     onChange={(e) => setForm({ ...form, vendor: e.target.value, vendorId: '' })} />
            )}
            {suppliers.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--p-muted)', marginTop: 4 }}>
                Tip: add suppliers in Partners → Suppliers to pick them here.
              </p>
            )}
          </div>

          <div>
            <label className="pro-label">Quantity</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="pro-input tnum" style={{ flex: 1 }}
                     placeholder="100"
                     value={form.qty}
                     onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              <select className="pro-select-native" style={{ width: 90 }}
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="units">units</option>
              </select>
            </div>
          </div>

          <div>
            <label className="pro-label">Cost per {form.unit} (₹)</label>
            <input className="pro-input tnum" placeholder="25"
                   value={form.costPerUnit}
                   onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
          </div>

          <div>
            <label className="pro-label">Ship cost per {form.unit} (₹)</label>
            <input className="pro-input tnum" placeholder="2"
                   value={form.shipPerUnit}
                   onChange={(e) => setForm({ ...form, shipPerUnit: e.target.value })} />
          </div>

          <div>
            <label className="pro-label">Month of purchase</label>
            <input type="month" className="pro-input"
                   value={form.purchaseMonth}
                   onChange={(e) => setForm({ ...form, purchaseMonth: e.target.value })} />
          </div>
        </div>

        <div style={{ padding: '12px 20px', background: 'var(--p-accent-soft)', borderTop: '1px solid var(--p-border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--p-fg-2)' }}>
            Total cost {form.qty && `(${form.qty} ${form.unit} × ₹${(Number(form.costPerUnit)||0) + (Number(form.shipPerUnit)||0)})`}
          </span>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--p-accent)' }}>
            <Money v={totalCost} color="var(--p-accent)" />
          </span>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--p-border)',
                      display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="pro-btn pro-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={submit} disabled={!valid}
                  style={{ opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>
            <Icons.CheckCircle size={14} sw={2} />Save to inventory
          </button>
        </div>
      </div>
    </div>
  );
};

window.ProInventory = ProInventory;
