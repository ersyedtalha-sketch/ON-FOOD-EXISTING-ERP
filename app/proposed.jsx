// ============== PROPOSED — neutral admin redesign ==============

const ProSidebar = ({ active }) => {
  // Pull live counts from the shared store (falls back to defaults outside a provider)
  let store = { state: { inventory: [], batches: [] } };
  try { store = useAppState(); } catch (e) { /* no provider */ }
  const invCount = store.state.inventory.length;
  const batchCount = store.state.batches.length;

  const sec1All = [
    { label: 'Overview',      icon: 'Dashboard', href: '/dashboard',           count: null,                                   roles: ['admin','supervisor'] },
    { label: 'Inventory',     icon: 'Box',       href: '/dashboard/inventory', count: invCount ? String(invCount) : null,     roles: ['admin','supervisor'] },
    { label: 'Products',      icon: 'Rupee',     href: '/dashboard/costs',     count: null,                                   roles: ['admin','supervisor'] },
    { label: 'Batches',       icon: 'Package',   href: '/dashboard/batches',   count: batchCount ? String(batchCount) : null, roles: ['admin','supervisor'] },
    { label: 'Sales',         icon: 'Receipt',   href: '/dashboard/sales',     count: null,                                   roles: ['admin'] },
  ];
  const sec2All = [
    { label: 'Partners',      icon: 'Users',     href: '/dashboard/partners',  count: null, roles: ['admin'] },
    { label: 'Credit Ledger', icon: 'Card',      href: '/dashboard/credit',    count: null, roles: ['admin'] },
  ];
  const role = (typeof window !== 'undefined' && window.__erpRole) || 'admin';
  const sec1 = sec1All.filter((it) => it.roles.includes(role));
  const sec2 = sec2All.filter((it) => it.roles.includes(role));

  const user = (typeof window !== 'undefined' && window.__erpUser) || { name: 'Account', role: role, inits: '··' };

  const link = (it) => {
    const I = Icons[it.icon];
    return (
      <a key={it.href} className={`pro-sidebar-link ${active === it.href ? 'active' : ''}`}>
        <I size={15} sw={2} />{it.label}
        {it.count && <span className="count">{it.count}</span>}
      </a>
    );
  };
  return (
    <aside className="pro-sidebar">
      <div className="pro-sidebar-brand">
        <div className="mark">ON</div>
        <div>
          <div className="name">ON Food</div>
          <div className="org">Kalaburagi · ERP</div>
        </div>
      </div>
      <div className="pro-sidebar-section">Operate</div>
      <nav className="pro-sidebar-nav">{sec1.map(link)}</nav>
      {sec2.length > 0 && <div className="pro-sidebar-section">Accounts</div>}
      {sec2.length > 0 && <nav className="pro-sidebar-nav">{sec2.map(link)}</nav>}
      <div className="pro-sidebar-foot">
        <div className="avatar">{user.inits}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="who" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
          <div className="role" style={{ textTransform: 'capitalize' }}>{user.role}</div>
        </div>
        {typeof window !== 'undefined' && window.__erpSignOut && (
          <button onClick={() => window.__erpSignOut()} title="Sign out" aria-label="Sign out"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted-soft)', padding: 4 }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--p-danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--p-muted-soft)'}>
            <Icons.Logout size={16} sw={2} />
          </button>
        )}
      </div>
    </aside>
  );
};

const ProPageHeader = ({ crumb, title, sub, actions }) => (
  <header className="pro-pageheader">
    <div>
      <div className="pro-crumb">{crumb}</div>
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>
  </header>
);

const ProStat = ({ label, value, prefix, delta, deltaLabel, spark, accent }) => (
  <div className="pro-stat">
    <div className="label">{label}</div>
    <div className="value">
      {prefix && <span className="rupee">{prefix}</span>}{value}
    </div>
    {delta != null && (
      <div className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        {deltaLabel && <span className="baseline">{deltaLabel}</span>}
      </div>
    )}
    {spark && (
      <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none">
        <polyline points={spark} fill="none" stroke={accent || 'var(--p-accent)'} strokeWidth="1.5" />
      </svg>
    )}
  </div>
);

const ProPill = ({ kind, children }) => <span className={`pro-pill ${kind}`}>{children}</span>;

const Money = ({ v, color, decimals = false }) => (
  <span className="tnum" style={{ color }}>
    <span style={{ color: 'var(--p-muted-soft)', marginRight: 2 }}>₹</span>
    {v.toLocaleString('en-IN', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 })}
  </span>
);

/* ---------- Dashboard (real data) ---------- */
const ProDashboard = () => {
  const { state } = useAppState();
  const [inv, setInv] = React.useState([]);

  React.useEffect(() => {
    const sb = window.supabaseClient;
    if (!sb) return;
    (async () => {
      const { data } = await sb.from('invoices').select('grand_total, paid_amount, status');
      setInv(data || []);
    })();
  }, []);

  const billed = inv.reduce((s, r) => s + Number(r.grand_total || 0), 0);
  const collected = inv.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
  const outstanding = billed - collected;
  const overdue = inv.filter((r) => r.status === 'overdue').reduce((s, r) => s + (Number(r.grand_total || 0) - Number(r.paid_amount || 0)), 0);

  const products = Object.values(state.recipes || {});
  const maxUnits = Math.max(1, ...products.map((p) => p.producedUnits || 0));
  const invInvestment = state.inventory.reduce((s, i) => s + Number(i.qty) * (Number(i.costPerUnit) + Number(i.shipPerUnit)), 0);
  const unitsProduced = products.reduce((s, p) => s + (p.producedUnits || 0), 0);

  return (
    <div className="pro frame" data-screen-label="Proposed · Dashboard">
      <ProSidebar active="/dashboard" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Overview"
          title="Overview"
          sub="Your live numbers, from the database"
          actions={
            <>
              <button className="pro-btn pro-btn-secondary"><Icons.Download size={14} sw={2} />Download report</button>
              <button className="pro-btn pro-btn-primary"><Icons.Plus size={14} sw={2} />New sale</button>
            </>
          }
        />

        <div className="pro-section" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sales numbers — real */}
          <div className="pro-statgrid">
            <ProStat label="Billed" value={billed.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel={inv.length + ' invoice' + (inv.length === 1 ? '' : 's')} />
            <ProStat label="Collected" value={collected.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel="received" />
            <ProStat label="Outstanding" value={outstanding.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel="to collect" />
            <ProStat label="Overdue" value={overdue.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel="past due date" />
          </div>

          <div className="grid-2">
            {/* Production snapshot */}
            <div className="pro-card">
              <div className="pro-card-head">
                <div><h3>Production</h3><div className="sub">From inventory &amp; batches</div></div>
              </div>
              <div className="pro-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <DashTile label="Raw materials" value={String(state.inventory.length)} sub="in inventory" />
                <DashTile label="Inventory value" value={'₹' + Math.round(invInvestment).toLocaleString('en-IN')} sub="cost + transport" />
                <DashTile label="Batches" value={String(state.batches.length)} sub="produced" />
                <DashTile label="Units produced" value={unitsProduced.toLocaleString('en-IN')} sub="across products" />
              </div>
            </div>

            {/* Products by units produced — real */}
            <div className="pro-card">
              <div className="pro-card-head">
                <div><h3>Products by units produced</h3><div className="sub">Ready to sell</div></div>
              </div>
              <div className="pro-card-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 140 }}>
                {products.length === 0 && <div style={{ color: 'var(--p-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No products yet — produce a batch to see them here.</div>}
                {products.map((p, i) => {
                  const pct = ((p.producedUnits || 0) / maxUnits) * 100;
                  return (
                    <div key={p.id} style={{ marginBottom: i === products.length - 1 ? 0 : 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                        <span style={{ color: 'var(--p-fg-2)', fontWeight: 500 }}>{p.name}</span>
                        <span className="tnum" style={{ color: 'var(--p-fg)', fontWeight: 500 }}>{(p.producedUnits || 0).toLocaleString('en-IN')} <span style={{ color: 'var(--p-muted)', fontWeight: 400 }}>{p.outputUnit}</span></span>
                      </div>
                      <div style={{ height: 6, background: 'var(--p-border-soft)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', background: ['#1f6f4a', '#3f8e63', '#6caa86', '#9ec6b1'][i % 4], borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashTile = ({ label, value, sub }) => (
  <div style={{ border: '1px solid var(--p-border-soft)', borderRadius: 8, padding: '14px 16px' }}>
    <div style={{ fontSize: 11, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
    <div className="tnum" style={{ fontSize: 22, fontWeight: 600, marginTop: 6, letterSpacing: '-.02em' }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--p-muted-soft)', marginTop: 3 }}>{sub}</div>
  </div>
);

/* ---------- Batches (store-driven; created from products + inventory) ---------- */
const ProBatches = () => {
  const { state, actions } = useAppState();
  const { batches } = state;
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [filter, setFilter] = React.useState('All');

  const counts = {
    All:          batches.length,
    Pending:      batches.filter(b => b.s === 'pending').length,
    'In progress':batches.filter(b => b.s === 'progress').length,
    Completed:    batches.filter(b => b.s === 'paid').length,
    Cancelled:    batches.filter(b => b.s === 'cancelled').length,
  };
  const rows = batches.filter(b => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return b.s === 'pending';
    if (filter === 'In progress') return b.s === 'progress';
    if (filter === 'Completed') return b.s === 'paid';
    if (filter === 'Cancelled') return b.s === 'cancelled';
  });

  return (
    <div className="pro frame" data-screen-label="Proposed · Batches">
      <ProSidebar active="/dashboard/batches" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Operate"
          title="Batches"
          sub="Each batch turns raw inventory into finished product"
          actions={
            <>
              <div className="pro-search"><Icons.Search size={14} sw={2} />Search batches…</div>
              <button className="pro-btn pro-btn-primary" onClick={() => setCreating(true)}>
                <Icons.Plus size={14} sw={2} />New batch
              </button>
            </>
          }
        />
        <div className="pro-section" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pro-card">
            <div className="pro-card-head" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
                {Object.entries(counts).map(([l, c]) => {
                  const on = filter === l;
                  return (
                    <button key={l} onClick={() => setFilter(l)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      paddingBottom: 12, marginBottom: -1,
                      borderBottom: on ? '2px solid var(--p-fg)' : '2px solid transparent',
                      color: on ? 'var(--p-fg)' : 'var(--p-muted)',
                      fontWeight: 500, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      {l}
                      <span className="tnum" style={{
                        fontSize: 11, padding: '1px 6px', borderRadius: 999,
                        background: on ? 'var(--p-fg)' : 'var(--p-border-soft)',
                        color: on ? 'white' : 'var(--p-muted)', fontWeight: 500,
                      }}>{c}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 12 }}>
                <button className="pro-btn pro-btn-ghost"><Icons.Download size={13} sw={2} />Export</button>
              </div>
            </div>
            <table className="pro-table" style={{ borderTop: '1px solid var(--p-border)' }}>
              <thead><tr>
                <th>Batch</th><th>Product</th><th className="r">Output</th>
                <th>Raw consumed</th><th>Produced</th><th>Status</th><th>Notes</th>
                <th style={{ width: 64 }}></th>
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.n}>
                    <td className="id">{r.n}</td>
                    <td className="strong">{r.p}</td>
                    <td className="r"><span className="tnum">{r.q.toLocaleString('en-IN')}</span> <span className="muted">{r.u}</span></td>
                    <td><span className="muted tnum">{r.consumedQty} {r.consumedUnit}</span> <span className="muted">{r.consumedName}</span></td>
                    <td>{r.d}</td>
                    <td><ProPill kind={r.s}>{r.l}</ProPill></td>
                    <td><span className="muted">{r.notes || '—'}</span></td>
                    <td className="r">
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditing(r)} aria-label="Edit batch" title="Edit batch"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted-soft)', padding: 4 }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--p-info)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--p-muted-soft)'}>
                          <Icons.Pencil size={14} sw={2} />
                        </button>
                        <button onClick={() => { if (window.confirm(`Delete batch ${r.n}? Raw material is returned to inventory.`)) actions.deleteBatch(r.n); }}
                                aria-label="Delete batch" title="Delete batch"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted-soft)', padding: 4 }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--p-danger)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--p-muted-soft)'}>
                          <Icons.X size={14} sw={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--p-muted)' }}>
                    {batches.length === 0
                      ? <>No batches yet. Click <span style={{ color: 'var(--p-fg)', fontWeight: 500 }}>New batch</span> to turn inventory into product.</>
                      : 'No batches in this status.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {creating && <NewBatchDialog onClose={() => setCreating(false)} />}
      {editing && <NewBatchDialog editBatch={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

/* ---------- New / Edit Batch dialog (the core flow: material + product → batch) ---------- */
const NewBatchDialog = ({ onClose, editBatch = null }) => {
  const { state, actions } = useAppState();
  const NEW = '__new__';
  const isEdit = !!editBatch;
  const namesMatch = (a, b) => {
    a = (a || '').toLowerCase().trim(); b = (b || '').toLowerCase().trim();
    return a && b && (a.includes(b) || b.includes(a));
  };

  // ----- 1) pick raw material from inventory -----
  const inventory = state.inventory;
  const [inventoryId, setInventoryId] = React.useState(
    isEdit ? (editBatch._invId ?? inventory[0]?.id ?? '') : (inventory[0]?.id ?? '')
  );
  const chosen = inventory.find(i => i.id === inventoryId);

  // ----- 2) pick (or name) the product made from this material -----
  const matchingRecipes = chosen
    ? Object.values(state.recipes).filter(r => namesMatch(r.inputName, chosen.name))
    : [];
  const editMatch = isEdit ? Object.values(state.recipes).find(r => r.name === editBatch.p) : null;
  const [recipeId, setRecipeId] = React.useState(
    isEdit ? (editMatch ? editMatch.id : NEW) : (matchingRecipes[0]?.id ?? NEW)
  );
  const [newName, setNewName]   = React.useState(isEdit && !editMatch ? editBatch.p : '');

  const [inputQty, setInputQty] = React.useState(isEdit ? String(editBatch.consumedQty) : '');
  const [batchNo, setBatchNo]   = React.useState(isEdit ? editBatch.n : '');
  const [status, setStatus]     = React.useState(isEdit ? editBatch.s : 'progress');
  const [notes, setNotes]       = React.useState(isEdit ? (editBatch.notes || '') : '');
  const [outUnit, setOutUnit]   = React.useState(isEdit ? editBatch.u : 'chapatis');
  const [yieldPerKg, setYieldPerKg] = React.useState(isEdit ? String(editBatch.yieldPerKg) : '');
  const [flourPerKg, setFlourPerKg] = React.useState(isEdit ? String(editBatch.flourPerKg) : '');
  const [misc, setMisc]             = React.useState(isEdit ? String(editBatch.misc) : '');

  const isNew  = recipeId === NEW;
  const recipe = isNew ? null : state.recipes[recipeId];

  // When the chosen material changes, reset the product selection to a matching one
  React.useEffect(() => {
    if (!chosen || isEdit) return;
    const m = Object.values(state.recipes).filter(r => namesMatch(r.inputName, chosen.name));
    setRecipeId(m[0]?.id ?? NEW);
    setNewName('');
  }, [inventoryId]);

  // Seed editable production fields from the selected product (or sensible defaults)
  React.useEffect(() => {
    if (isEdit) return;
    const rec = recipeId === NEW ? null : state.recipes[recipeId];
    if (rec) {
      setOutUnit(rec.outputUnit || 'products');
      setFlourPerKg(rec.lastFlourPerKg != null ? String(rec.lastFlourPerKg) : '0');
    } else {
      setOutUnit('products');
      setFlourPerKg('0');
    }
    setMisc('0');
  }, [recipeId, inventoryId]);

  // ---- Empty state: nothing in inventory ----
  if (inventory.length === 0) {
    return (
      <div className="pro-modal-backdrop" onClick={onClose}>
        <div className="pro-modal" onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--p-border)' }}>
            <h2 style={{ margin: 0, font: '600 16px/1.2 Inter, sans-serif', letterSpacing: '-0.01em' }}>New batch</h2>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted)', padding: 4 }}>
              <Icons.X size={16} sw={2} />
            </button>
          </div>
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ color: 'var(--p-muted-soft)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <Icons.Box size={32} sw={1.5} />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--p-fg)' }}>No raw material in stock</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--p-muted)' }}>
              Add raw material in the <strong>Inventory</strong> tab first, then come back to make a batch from it.
            </p>
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--p-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="pro-btn pro-btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const qty = Number(inputQty) || 0;
  const available = chosen ? chosen.stockRemaining : 0;
  // When editing, the batch's own previously-consumed qty is available again
  const editBack = isEdit && editBatch._invId === inventoryId ? editBatch.consumedQty : 0;
  const effectiveAvail = available + editBack;
  const overLimit = qty > effectiveAvail;

  // ----- production maths (all editable in the form) -----
  const yld         = Number(yieldPerKg) || 0;       // products made per 1 unit of raw
  const flourCost   = Number(flourPerKg) || 0;       // ₹ to turn 1 unit raw into flour
  const miscCost    = Number(misc) || 0;             // flat ₹ added to this batch
  const rawPerKg    = chosen ? Number(chosen.costPerUnit) + Number(chosen.shipPerUnit) : 0;

  const outputUnits = Math.floor(qty * yld);         // TOTAL products, e.g. 50kg × 25 = 1250 chapatis
  const batchCost   = qty * rawPerKg + qty * flourCost + miscCost;
  const costPerUnit = outputUnits > 0 ? batchCost / outputUnits : 0;
  const productName = recipe ? recipe.name : newName.trim();

  const batchNoExists = state.batches.some(b => b.n.toLowerCase() === batchNo.trim().toLowerCase() && (!isEdit || b.n !== editBatch.n));
  const valid = chosen && qty > 0 && !overLimit && batchNo.trim() && !batchNoExists && (recipe || newName.trim());

  const submit = () => {
    if (!valid) return;
    const today = isEdit ? editBatch.d : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const batchObj = {
        n: batchNo.trim(),
        p: productName,
        q: outputUnits,
        u: outUnit,
        d: today,
        s: status,
        l: { pending: 'Pending', progress: 'In progress', paid: 'Completed', cancelled: 'Cancelled' }[status],
        notes: notes.trim(),
        consumedName: chosen.name,
        consumedQty: qty,
        consumedUnit: chosen.unit,
        yieldPerKg: yld,
        outputUnits,
        flourPerKg: flourCost,
        misc: miscCost,
        costPerUnit,
        cost: batchCost,
    };
    if (isEdit) {
      actions.updateBatch(editBatch.n, batchObj, { inventoryId: chosen.id, qty });
    } else {
      actions.addBatch(batchObj, { inventoryId: chosen.id, qty });
    }
    onClose();
  };

  return (
    <div className="pro-modal-backdrop" onClick={onClose}>
      <div className="pro-modal" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--p-border)' }}>
          <div>
            <h2 style={{ margin: 0, font: '600 16px/1.2 Inter, sans-serif', letterSpacing: '-0.01em' }}>{isEdit ? 'Edit batch' : 'New batch'}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--p-muted)' }}>{isEdit ? 'Fix any detail — stock and products recalculate.' : 'Pick raw material, choose what to make from it.'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted)', padding: 4 }}>
            <Icons.X size={16} sw={2} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* 1) Inventory (raw material) — chosen FIRST */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="pro-label">Inventory — raw material to use</label>
            <select className="pro-select-native" value={inventoryId} onChange={(e) => setInventoryId(e.target.value)}>
              {inventory.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.stockRemaining} {i.unit} in stock (from {i.vendor})
                </option>
              ))}
            </select>
          </div>

          {/* 2) Product to make from this material */}
          <div>
            <label className="pro-label">Make product</label>
            <select className="pro-select-native" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              {matchingRecipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              <option value={NEW}>+ New product…</option>
            </select>
            {isNew && (
              <input className="pro-input" placeholder="Name this product, e.g. Plain Makhana"
                     value={newName} onChange={(e) => setNewName(e.target.value)}
                     style={{ marginTop: 8 }} autoFocus />
            )}
          </div>

          {/* Batch number — manual */}
          <div>
            <label className="pro-label">Batch number (manual)</label>
            <input className="pro-input" placeholder="e.g. B-019"
                   value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            {batchNoExists && <p style={{ fontSize: 11, color: 'var(--p-danger)', marginTop: 4 }}>That batch number already exists.</p>}
          </div>

          {/* Consume */}
          <div>
            <label className="pro-label">Consume ({chosen?.unit ?? 'kg'})</label>
            <input className="pro-input tnum" placeholder="e.g. 100"
                   value={inputQty} onChange={(e) => setInputQty(e.target.value)}
                   style={overLimit ? { borderColor: 'var(--p-danger)', boxShadow: '0 0 0 3px rgba(185,28,28,0.12)' } : {}} />
            {chosen && (
              <p style={{ fontSize: 11, marginTop: 4, color: overLimit ? 'var(--p-danger)' : 'var(--p-muted)' }}>
                {overLimit
                  ? `You have only ${effectiveAvail} ${chosen.unit} of ${chosen.name}.`
                  : `${effectiveAvail} ${chosen.unit} available`}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="pro-label">Status</label>
            <select className="pro-select-native" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="progress">In progress</option>
              <option value="pending">Pending</option>
              <option value="paid">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Production economics — editable */}
          <div>
            <label className="pro-label">Total products per {chosen?.unit ?? 'kg'}</label>
            <input className="pro-input tnum" placeholder="e.g. 25"
                   value={yieldPerKg} onChange={(e) => setYieldPerKg(e.target.value)} />
            <p style={{ fontSize: 11, marginTop: 4, color: 'var(--p-muted)' }}>
              {qty > 0 && yld > 0 ? `${qty} ${chosen?.unit ?? 'kg'} → ${outputUnits.toLocaleString('en-IN')} ${outUnit}` : `How many ${outUnit} per ${chosen?.unit ?? 'kg'}`}
            </p>
          </div>
          <div>
            <label className="pro-label">Output unit</label>
            <input className="pro-input" placeholder="e.g. chapatis / packs / pcs"
                   value={outUnit} onChange={(e) => setOutUnit(e.target.value)} />
            <p style={{ fontSize: 11, marginTop: 4, color: 'var(--p-muted)' }}>What you count the output in</p>
          </div>
          <div>
            <label className="pro-label">Flour cost / {chosen?.unit ?? 'kg'} (₹)</label>
            <input className="pro-input tnum" placeholder="e.g. 8.50"
                   value={flourPerKg} onChange={(e) => setFlourPerKg(e.target.value)} />
            <p style={{ fontSize: 11, marginTop: 4, color: 'var(--p-muted)' }}>Transport + grinding</p>
          </div>
          <div>
            <label className="pro-label">Miscellaneous cost (₹)</label>
            <input className="pro-input tnum" placeholder="e.g. 200"
                   value={misc} onChange={(e) => setMisc(e.target.value)} />
            <p style={{ fontSize: 11, marginTop: 4, color: 'var(--p-muted)' }}>Labour, packaging, etc — for this batch</p>
          </div>

          {/* Notes */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="pro-label">Notes (optional)</label>
            <input className="pro-input" placeholder="e.g. Pressed Tuesday morning"
                   value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Computed output preview */}
        <div style={{ margin: '0 20px 16px', padding: '14px 16px', background: 'var(--p-accent-soft)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--p-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            This batch will produce
          </div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <PreviewStat label={`Output (${outUnit})`} value={qty > 0 ? outputUnits.toLocaleString('en-IN') : '—'} />
            <PreviewStat label="Raw consumed" value={qty > 0 ? `${qty} ${chosen?.unit ?? ''}` : '—'} />
            <PreviewStat label="Cost / unit" value={qty > 0 && outputUnits > 0 ? `₹${costPerUnit.toFixed(2)}` : '—'} />
            <PreviewStat label="Batch cost" value={qty > 0 ? `₹${Math.round(batchCost).toLocaleString('en-IN')}` : '—'} />
          </div>
          {qty > 0 && chosen && !overLimit && (
            <div style={{ fontSize: 11, color: 'var(--p-fg-2)', marginTop: 10 }}>
              Making <strong>{productName || '(unnamed product)'}</strong>. After saving, {chosen.name} stock is <strong>{effectiveAvail - qty} {chosen.unit}</strong>.
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--p-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="pro-btn pro-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={submit} disabled={!valid}
                  style={{ opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>
            <Icons.CheckCircle size={14} sw={2} />{isEdit ? 'Save changes' : 'Save batch'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PreviewStat = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, color: 'var(--p-muted)' }}>{label}</div>
    <div className="tnum" style={{ fontSize: 18, fontWeight: 600, marginTop: 3, color: 'var(--p-fg)' }}>{value}</div>
  </div>
);

/* ---------- Sales ---------- */
const ProSales = () => {
  const labels = { pending: 'Pending', partial: 'Partial', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' };
  const [allRows, setAllRows] = React.useState([]);
  const [payFor, setPayFor] = React.useState(null);   // invoice row being paid

  const isOverdue = (r) => r.status !== 'paid' && r.status !== 'cancelled' && r.rawDue && new Date(r.rawDue) < new Date(new Date().toDateString());

  // Load issued invoices from the database
  const loadInvoices = React.useCallback(async () => {
    const sb = window.supabaseClient;
    if (!sb) return;
    const { data } = await sb.from('invoices').select('*, partner:partners(name)').order('issue_date', { ascending: false });
    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
    setAllRows((data || []).map((r) => {
      let status = r.status;
      // derive overdue on the fly (don't need a cron)
      if (status !== 'paid' && status !== 'cancelled' && r.due_date && new Date(r.due_date) < new Date(new Date().toDateString())) {
        status = Number(r.paid_amount) > 0 ? 'partial' : 'overdue';
      }
      return {
        id: r.id,
        n: r.invoice_no,
        p: (r.partner && r.partner.name) || '—',
        partnerId: r.partner_id,
        d: fmt(r.issue_date),
        due: fmt(r.due_date),
        rawDue: r.due_date,
        tot: Number(r.grand_total),
        paid: Number(r.paid_amount),
        s: status,
      };
    }));
  }, []);

  React.useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const [tab, setTab] = React.useState('all');
  const tabs = [
    { k: 'all',     l: 'All',     count: allRows.length },
    { k: 'open',    l: 'Open',    count: allRows.filter(r => r.s !== 'paid' && r.s !== 'cancelled').length },
    { k: 'overdue', l: 'Overdue', count: allRows.filter(r => r.s === 'overdue').length },
    { k: 'paid',    l: 'Paid',    count: allRows.filter(r => r.s === 'paid').length },
  ];
  const rows = allRows.filter(r => {
    if (tab === 'all')     return true;
    if (tab === 'open')    return r.s !== 'paid' && r.s !== 'cancelled';
    if (tab === 'overdue') return r.s === 'overdue';
    if (tab === 'paid')    return r.s === 'paid';
  });
  const totalBilled    = allRows.reduce((s, r) => s + r.tot,  0);
  const totalCollected = allRows.reduce((s, r) => s + r.paid, 0);
  const totalOverdue   = allRows.filter(r => r.s === 'overdue').reduce((s, r) => s + (r.tot - r.paid), 0);
  const paidCount      = allRows.filter(r => r.s === 'paid').length;
  const overdueCount   = allRows.filter(r => r.s === 'overdue').length;
  return (
    <div className="pro frame" data-screen-label="Proposed · Sales">
      <ProSidebar active="/dashboard/sales" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Operate"
          title="Sales"
          sub="Invoices and collection status"
          actions={
            <>
              <div className="pro-search"><Icons.Search size={14} sw={2} />Invoice #, partner…</div>
              <button className="pro-btn pro-btn-secondary"><Icons.Download size={13} sw={2} />Export</button>
              <button className="pro-btn pro-btn-primary"><Icons.Plus size={14} sw={2} />New sale</button>
            </>
          }
        />
        <div className="pro-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stat strip — computed from real invoices */}
          <div className="pro-statgrid">
            <ProStat label="Billed" value={totalBilled.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel="this period" />
            <ProStat label="Collected" value={totalCollected.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel="received" />
            <ProStat label="Overdue" value={totalOverdue.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel={overdueCount + ' invoice' + (overdueCount === 1 ? '' : 's')} />
            <ProStat label="Paid invoices" value={String(paidCount)} delta={null} deltaLabel={'of ' + allRows.length} />
          </div>

          <div className="pro-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="pro-card-head">
              <div>
                <h3>Invoices</h3>
                <div className="sub">{allRows.length} invoice{allRows.length === 1 ? '' : 's'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div className="pro-seg">
                  {tabs.map(t => (
                    <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>
                      {t.l}
                    </button>
                  ))}
                </div>
                <button className="pro-btn pro-btn-ghost"><Icons.Filter size={13} sw={2} />Date</button>
              </div>
            </div>
            <table className="pro-table">
              <thead><tr>
                <th>Invoice</th><th>Partner</th><th>Issued</th><th>Due</th>
                <th className="r">Total</th>
                <th>Collected</th>
                <th>Status</th>
                <th></th>
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const pct = r.tot > 0 ? (r.paid / r.tot) * 100 : 0;
                  const balance = r.tot - r.paid;
                  const overdueDays = r.s === 'overdue' && r.rawDue
                    ? Math.max(0, Math.round((new Date(new Date().toDateString()) - new Date(r.rawDue)) / 86400000))
                    : 0;
                  return (
                    <tr key={r.n}>
                      <td className="id">{r.n}</td>
                      <td className="strong">{r.p}</td>
                      <td>{r.d}</td>
                      <td>
                        {r.due}
                        {overdueDays > 0 && <span style={{ marginLeft: 6, color: 'var(--p-danger)', fontSize: 11 }}>+{overdueDays}d</span>}
                      </td>
                      <td className="r"><Money v={r.tot} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="pro-mini-bar"><i style={{
                            width: `${pct}%`,
                            background: r.s === 'overdue' ? 'var(--p-danger)' : 'var(--p-accent)',
                          }}/></span>
                          <span className="tnum" style={{ fontSize: 12, color: 'var(--p-muted)', minWidth: 32 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td><ProPill kind={r.s}>{labels[r.s]}</ProPill></td>
                      <td className="r">
                        {balance > 0 && r.s !== 'cancelled' ? (
                          <button className="pro-btn pro-btn-secondary" style={{ height: 28, fontSize: 12, padding: '0 10px' }}
                                  onClick={() => setPayFor(r)}>
                            <Icons.Banknote size={13} sw={2} />Record payment
                          </button>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>{r.s === 'paid' ? 'Settled' : '—'}</span>
                        )}
                        <button onClick={async () => {
                                  if (!window.confirm(`Delete invoice ${r.n}? This removes it and any payments recorded against it. Stock sold on it is returned.`)) return;
                                  const sb = window.supabaseClient;
                                  await sb.from('invoices').delete().eq('id', r.id);
                                  loadInvoices();
                                }}
                                aria-label="Delete invoice" title="Delete invoice"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted-soft)', padding: 4, marginLeft: 4 }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--p-danger)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--p-muted-soft)'}>
                          <Icons.X size={14} sw={2} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--p-muted)' }}>
                    No invoices yet. Click <span style={{ color: 'var(--p-fg)', fontWeight: 500 }}>New sale</span> to create one.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {payFor && <RecordPaymentDialog invoice={payFor} onClose={() => setPayFor(null)} onSaved={() => { setPayFor(null); loadInvoices(); }} />}
    </div>
  );
};

/* ---------- Record Payment dialog ---------- */
const RecordPaymentDialog = ({ invoice, onClose, onSaved }) => {
  const balance = invoice.tot - invoice.paid;
  const [amount, setAmount] = React.useState(String(balance));
  const [method, setMethod] = React.useState('Cash');
  const [date, setDate]     = React.useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef]       = React.useState('');
  const [busy, setBusy]     = React.useState(false);

  const amt = Number(amount) || 0;
  const over = amt > balance + 0.5;
  const valid = amt > 0 && !over && !busy;
  const newPaid = invoice.paid + amt;
  const newStatus = newPaid >= invoice.tot - 0.5 ? 'paid' : 'partial';

  const submit = async () => {
    const sb = window.supabaseClient;
    if (!sb) { alert('Not connected to the database.'); return; }
    setBusy(true);
    const { error: pe } = await sb.from('payments').insert({
      invoice_id: invoice.id, partner_id: invoice.partnerId, amount: amt,
      method, receipt_no: ref || null, paid_on: date,
    });
    if (pe) { setBusy(false); alert('Could not save payment: ' + pe.message); return; }
    const { error: ue } = await sb.from('invoices').update({
      paid_amount: newPaid, status: newStatus,
    }).eq('id', invoice.id);
    setBusy(false);
    if (ue) { alert('Payment saved, but status update failed: ' + ue.message); return; }
    onSaved();
  };

  return (
    <div className="pro-modal-backdrop" onClick={onClose}>
      <div className="pro-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="pro-modal-head">
          <div>
            <h2 style={{ margin: 0, font: '600 16px/1.2 Inter, sans-serif', letterSpacing: '-0.01em' }}>Record payment</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--p-muted)' }}>{invoice.n} · {invoice.p}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted)' }}><Icons.X size={18} sw={2} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* balance summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--p-bg)', border: '1px solid var(--p-border)', borderRadius: 8, padding: '12px 14px' }}>
            <div><div style={{ fontSize: 11, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Invoice total</div><div className="tnum" style={{ fontWeight: 600, marginTop: 3 }}>₹{invoice.tot.toLocaleString('en-IN')}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Already paid</div><div className="tnum" style={{ fontWeight: 600, marginTop: 3, color: 'var(--p-accent)' }}>₹{invoice.paid.toLocaleString('en-IN')}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Balance due</div><div className="tnum" style={{ fontWeight: 600, marginTop: 3, color: 'var(--p-danger)' }}>₹{balance.toLocaleString('en-IN')}</div></div>
          </div>

          <div>
            <label className="pro-label">Amount received (₹)</label>
            <input className="pro-input tnum" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="pro-btn pro-btn-ghost" style={{ height: 26, fontSize: 12 }} onClick={() => setAmount(String(balance))}>Full balance ₹{balance.toLocaleString('en-IN')}</button>
              <button className="pro-btn pro-btn-ghost" style={{ height: 26, fontSize: 12 }} onClick={() => setAmount(String(Math.round(balance / 2)))}>Half</button>
            </div>
            {over && <p style={{ fontSize: 11, color: 'var(--p-danger)', marginTop: 4 }}>More than the balance due (₹{balance.toLocaleString('en-IN')}).</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="pro-label">Method</label>
              <select className="pro-select-native" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Cheque</option>
              </select>
            </div>
            <div>
              <label className="pro-label">Date received</label>
              <input type="date" className="pro-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="pro-label">Reference / note (optional)</label>
            <input className="pro-input" placeholder="UPI ref, cheque no, etc." value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>

          {amt > 0 && !over && (
            <div style={{ fontSize: 12, color: 'var(--p-fg-2)', background: 'var(--p-accent-soft)', borderRadius: 6, padding: '8px 12px' }}>
              After saving: <strong>₹{newPaid.toLocaleString('en-IN')}</strong> of ₹{invoice.tot.toLocaleString('en-IN')} collected — invoice becomes <strong>{newStatus === 'paid' ? 'Paid' : 'Partial'}</strong>.
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--p-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="pro-btn pro-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={submit} disabled={!valid} style={{ opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>
            <Icons.CheckCircle size={14} sw={2} />{busy ? 'Saving…' : 'Save payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Partners (now role-based: Suppliers · Grinders · Customers · Wholesalers) ---------- */

// Shared partner directory — also consumed by Costs (vendor pickers) and Invoice (buyer pickers)
window.partnersAll = [
  // Suppliers — provide raw materials
  { id: 's1', role: 'Supplier',   name: 'Bhalki Mandi',         sub: 'Juwar grain',        phone: '+91 99452 88110', loc: 'Bhalki, Bidar',          volume: 15000, bal:    0, inits: 'BM' },
  { id: 's2', role: 'Supplier',   name: 'Byadgi Spice Market',  sub: 'Red chilli',         phone: '+91 99012 33445', loc: 'Byadgi, Haveri',         volume:  8400, bal: 2000, inits: 'BS' },
  { id: 's3', role: 'Supplier',   name: 'Local Mango Orchard',  sub: 'Raw mango',          phone: '+91 98441 22311', loc: 'Kalaburagi outskirts',   volume:  4200, bal:    0, inits: 'LM' },
  { id: 's4', role: 'Supplier',   name: 'Bihar Makhana Co.',    sub: 'Raw makhana',        phone: '+91 90415 67788', loc: 'Darbhanga, Bihar',       volume: 12000, bal: 5000, inits: 'MK' },

  // Grinders — outsourced processing (you have multiple, can swap)
  { id: 'g1', role: 'Grinder',    name: 'Sangam Flour Mill',    sub: 'Primary · juwar',    phone: '+91 84315 90021', loc: 'Sedam Rd, Kalaburagi',   volume:  2400, bal:    0, inits: 'SF' },
  { id: 'g2', role: 'Grinder',    name: 'Sri Lakshmi Mill',     sub: 'Backup · juwar',     phone: '+91 84315 22119', loc: 'Jewargi Rd, Kalaburagi', volume:   600, bal:    0, inits: 'SL' },
  { id: 'g3', role: 'Grinder',    name: 'Byadgi Stone Mill',    sub: 'Chilli powder',      phone: '+91 99012 33990', loc: 'Byadgi, Haveri',         volume:  1800, bal:  400, inits: 'BY' },

  // Customers — small retail / kirana
  { id: 'c1', role: 'Customer',   name: "Anand's General Store",sub: 'Kirana',             phone: '+91 98452 11034', loc: 'Super Market Rd',        volume:  8200, bal: 1700, inits: 'AG' },
  { id: 'c2', role: 'Customer',   name: 'Modi Kirana',          sub: 'Kirana',             phone: null,              loc: 'Yadulla Colony',         volume:  4500, bal: 4500, inits: 'MK' },
  { id: 'c3', role: 'Customer',   name: 'Kalaburagi Fresh',     sub: 'Retail outlet',      phone: '+91 84315 51234', loc: 'Aiwan Mart',             volume: 12300, bal:    0, inits: 'KF' },
  { id: 'c4', role: 'Customer',   name: 'Yadulla Kirana',       sub: 'Kirana',             phone: '+91 84315 51169', loc: 'Yadulla Colony',         volume:  3200, bal:    0, inits: 'YK' },

  // Wholesalers — bulk
  { id: 'w1', role: 'Wholesaler', name: 'Brindavan Provisions', sub: 'Bulk distributor',   phone: '+91 90875 23311', loc: 'Court Rd',               volume:  5400, bal: 1800, inits: 'BP' },
  { id: 'w2', role: 'Wholesaler', name: 'Sangameshwar Mart',    sub: 'Multi-city',         phone: '+91 95904 12200', loc: 'Jewargi Rd',             volume:  9600, bal:    0, inits: 'SM' },
];

const ProPartners = () => {
  const { state, actions } = useAppState();
  const all = state.partners;
  const [role, setRole] = React.useState('All');
  const [adding, setAdding] = React.useState(false);

  const tabs = [
    { k: 'All',          count: all.length },
    { k: 'Supplier',     count: all.filter(p => p.role === 'Supplier').length },
    { k: 'Grinder',      count: all.filter(p => p.role === 'Grinder').length },
    { k: 'Customer',     count: all.filter(p => p.role === 'Customer').length },
    { k: 'Wholesaler',   count: all.filter(p => p.role === 'Wholesaler').length },
    { k: 'With balance', count: all.filter(p => p.bal > 0).length },
  ];

  const rows = all.filter(p => {
    if (role === 'All')          return true;
    if (role === 'With balance') return p.bal > 0;
    return p.role === role;
  });

  const isIncoming = (r) => r === 'Customer' || r === 'Wholesaler';   // they owe us
  const roleColors = {
    Supplier:   { bg: '#fef3c7', fg: '#92400e' },
    Grinder:    { bg: '#dbeafe', fg: '#1e40af' },
    Customer:   { bg: 'var(--p-accent-soft)', fg: 'var(--p-accent)' },
    Wholesaler: { bg: '#ede9fe', fg: '#5b21b6' },
  };

  const totalSupplier   = all.filter(p => p.role === 'Supplier'  ).length;
  const totalGrinder    = all.filter(p => p.role === 'Grinder'   ).length;
  const totalCustomer   = all.filter(p => p.role === 'Customer'  ).length;
  const totalWholesaler = all.filter(p => p.role === 'Wholesaler').length;

  return (
    <div className="pro frame" data-screen-label="Proposed · Partners">
      <ProSidebar active="/dashboard/partners" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Accounts"
          title="Partners"
          sub={`${totalSupplier} suppliers · ${totalGrinder} grinders · ${totalCustomer} customers · ${totalWholesaler} wholesalers`}
          actions={
            <>
              <div className="pro-search"><Icons.Search size={14} sw={2} />Name, phone…</div>
              <button className="pro-btn pro-btn-secondary"><Icons.Download size={13} sw={2} />Export</button>
              <button className="pro-btn pro-btn-primary" onClick={() => setAdding(true)}><Icons.Plus size={14} sw={2} />New partner</button>
            </>
          }
        />
        <div className="pro-section" style={{ flex: 1, overflow: 'auto' }}>
          <div className="pro-card">
            <div className="pro-card-head" style={{ paddingBottom: 0, borderBottom: 'none' }}>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
                {tabs.map((t) => {
                  const on = role === t.k;
                  return (
                    <button key={t.k} onClick={() => setRole(t.k)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '0 0 12px', marginBottom: -1,
                              borderBottom: on ? '2px solid var(--p-fg)' : '2px solid transparent',
                              color: on ? 'var(--p-fg)' : 'var(--p-muted)',
                              fontWeight: 500, fontSize: 13,
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}>
                      {t.k}
                      <span className="tnum" style={{
                        fontSize: 11, padding: '1px 6px', borderRadius: 999,
                        background: on ? 'var(--p-fg)' : 'var(--p-border-soft)',
                        color: on ? 'white' : 'var(--p-muted)', fontWeight: 500,
                      }}>{t.count}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, paddingBottom: 12, fontSize: 12, color: 'var(--p-muted)' }}>
                <span>Sort:</span>
                <span style={{ color: 'var(--p-fg-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Volume <Icons.Chevron size={11} sw={2} />
                </span>
              </div>
            </div>
            <table className="pro-table" style={{ borderTop: '1px solid var(--p-border)' }}>
              <thead><tr>
                <th>Partner</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Location</th>
                <th className="r">Volume (qtr)</th>
                <th className="r">Outstanding</th>
                <th style={{ width: 32 }}></th>
              </tr></thead>
              <tbody>
                {rows.map((p) => {
                  const rc = roleColors[p.role];
                  const incoming = isIncoming(p.role);
                  const volumeLabel = incoming ? 'sold' : 'purchased';
                  return (
                    <tr key={p.id}>
                      <td className="strong">
                        <span className="pro-avatar" style={{ background: rc.bg, color: rc.fg }}>{p.inits}</span>
                        {p.name}
                        <div className="muted" style={{ fontSize: 11, marginLeft: 36, marginTop: 2 }}>{p.sub}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          background: rc.bg, color: rc.fg, fontWeight: 500,
                        }}>{p.role}</span>
                      </td>
                      <td>
                        {p.phone ? <span>{p.phone}</span> : <span className="muted">No phone</span>}
                      </td>
                      <td><span className="muted">{p.loc}</span></td>
                      <td className="r">
                        <Money v={p.volume} />
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{volumeLabel}</div>
                      </td>
                      <td className="r">
                        {p.bal > 0 ? (
                          <>
                            <Money v={p.bal} color={incoming ? 'var(--p-danger)' : 'var(--p-warn)'} />
                            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                              {incoming ? 'owed to us' : 'we owe'}
                            </div>
                          </>
                        ) : (
                          <span className="muted tnum">—</span>
                        )}
                      </td>
                      <td className="r">
                        <button onClick={() => { if (window.confirm(`Delete partner "${p.name}"?`)) actions.deletePartner(p.id); }}
                                aria-label="Delete partner" title="Delete partner"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted-soft)', padding: 4 }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--p-danger)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--p-muted-soft)'}>
                          <Icons.X size={15} sw={2} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--p-muted)' }}>
                    No partners in this category yet. Click "New partner" above.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {adding && <AddPartnerDialog onClose={() => setAdding(false)} onSave={actions.addPartner} />}
    </div>
  );
};

/* ---------- Add Partner dialog ---------- */
const AddPartnerDialog = ({ onClose, onSave }) => {
  const [form, setForm] = React.useState({ role: 'Customer', name: '', sub: '', phone: '', loc: '', gstin: '' });
  const valid = form.name.trim();
  const roles = ['Supplier', 'Grinder', 'Customer', 'Wholesaler'];
  const subPlaceholder = {
    Supplier: 'What they supply, e.g. Juwar grain',
    Grinder: 'e.g. Primary · juwar',
    Customer: 'e.g. Kirana',
    Wholesaler: 'e.g. Bulk distributor',
  }[form.role];

  const submit = () => {
    if (!valid) return;
    onSave({ ...form, name: form.name.trim() });
    onClose();
  };

  return (
    <div className="pro-modal-backdrop" onClick={onClose}>
      <div className="pro-modal" onClick={(e) => e.stopPropagation()} style={{ width: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--p-border)' }}>
          <div>
            <h2 style={{ margin: 0, font: '600 16px/1.2 Inter, sans-serif', letterSpacing: '-0.01em' }}>New partner</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--p-muted)' }}>Supplier, grinder, customer or wholesaler.</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--p-muted)', padding: 4 }}>
            <Icons.X size={16} sw={2} />
          </button>
        </div>

        {/* Role picker */}
        <div style={{ padding: '16px 20px 0' }}>
          <label className="pro-label">Role</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {roles.map((rr) => (
              <button key={rr} onClick={() => setForm({ ...form, role: rr })}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 6, cursor: 'pointer',
                        border: '1px solid ' + (form.role === rr ? 'var(--p-accent)' : 'var(--p-border)'),
                        background: form.role === rr ? 'var(--p-accent-soft)' : 'var(--p-card)',
                        color: form.role === rr ? 'var(--p-accent)' : 'var(--p-fg-2)',
                        font: '500 12px/1 Inter, sans-serif',
                      }}>
                {rr}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="pro-label">Name</label>
            <input className="pro-input" placeholder="e.g. Bhalki Mandi"
                   value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="pro-label">Label / note</label>
            <input className="pro-input" placeholder={subPlaceholder}
                   value={form.sub} onChange={(e) => setForm({ ...form, sub: e.target.value })} />
          </div>
          <div>
            <label className="pro-label">Phone</label>
            <input className="pro-input" placeholder="+91 …"
                   value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="pro-label">Location</label>
            <input className="pro-input" placeholder="e.g. Kalaburagi"
                   value={form.loc} onChange={(e) => setForm({ ...form, loc: e.target.value })} />
          </div>
          {(form.role === 'Customer' || form.role === 'Wholesaler') && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="pro-label">GSTIN (optional)</label>
              <input className="pro-input" placeholder="e.g. 29ABCDE1234F1Z5 — leave blank if unregistered"
                     value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                     style={{ fontFamily: 'JetBrains Mono, monospace' }} />
              <p style={{ fontSize: 11, color: 'var(--p-muted)', marginTop: 4 }}>If entered, it prints on this customer's invoices. If blank, no GSTIN line appears.</p>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--p-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="pro-btn pro-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="pro-btn pro-btn-primary" onClick={submit} disabled={!valid}
                  style={{ opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>
            <Icons.CheckCircle size={14} sw={2} />Add partner
          </button>
        </div>
      </div>
    </div>
  );
};
const ProCredit = () => {
  const [entries, setEntries] = React.useState([]);
  const [balances, setBalances] = React.useState([]);
  const [stats, setStats] = React.useState({ credit: 0, paid: 0, outstanding: 0, oldest: null });
  const [seg, setSeg] = React.useState('All');

  React.useEffect(() => {
    const sb = window.supabaseClient;
    if (!sb) return;
    (async () => {
      const [invRes, payRes] = await Promise.all([
        sb.from('invoices').select('*, partner:partners(name, phone)').order('issue_date', { ascending: false }),
        sb.from('payments').select('invoice_id, amount, method, paid_on').order('paid_on', { ascending: true }),
      ]);
      const invoices = invRes.data || [];
      const payments = payRes.data || [];
      const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';

      // Group payments by invoice — so each invoice line shows what's collected against it.
      const payByInv = {};
      payments.forEach((p) => {
        if (!payByInv[p.invoice_id]) payByInv[p.invoice_id] = { total: 0, last: null, method: null };
        payByInv[p.invoice_id].total += Number(p.amount);
        payByInv[p.invoice_id].last = p.paid_on;
        payByInv[p.invoice_id].method = p.method;
      });

      // One clubbed row per invoice: Sale, Payment (collected), Balance.
      const rows = invoices.map((i) => {
        const pay = payByInv[i.id] || { total: 0, last: null, method: null };
        const sale = Number(i.grand_total);
        const paid = Number(i.paid_amount) || pay.total;
        const balance = sale - paid;
        let status = balance <= 0.5 ? 'paid' : (paid > 0 ? 'partial' : 'open');
        const note = paid > 0
          ? (status === 'paid' ? `Paid in full · ${pay.method || ''} · ${fmt(pay.last)}` : `Part-paid · ${pay.method || ''} · ${fmt(pay.last)}`)
          : 'Unpaid';
        return {
          id: i.id,
          d: fmt(i.issue_date),
          p: (i.partner && i.partner.name) || '—',
          phone: (i.partner && i.partner.phone) || null,
          invNo: i.invoice_no,
          note,
          sale, paid, balance, status,
          issueDate: i.issue_date,
        };
      });
      setEntries(rows);

      // Outstanding balances per partner (sum of unpaid invoice balances)
      const perPartner = {};
      rows.forEach((r) => {
        if (!perPartner[r.p]) perPartner[r.p] = { name: r.p, phone: r.phone, bal: 0, oldest: null };
        perPartner[r.p].bal += r.balance;
        if (r.balance > 0.5 && (!perPartner[r.p].oldest || new Date(r.issueDate) < new Date(perPartner[r.p].oldest))) {
          perPartner[r.p].oldest = r.issueDate;
        }
      });
      const balList = Object.values(perPartner)
        .filter((x) => x.bal > 0.5)
        .map((x) => ({
          name: x.name,
          contact: x.phone || 'No phone',
          bal: x.bal,
          days: x.oldest ? Math.max(0, Math.round((new Date(new Date().toDateString()) - new Date(x.oldest)) / 86400000)) : 0,
          inits: x.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(),
        }))
        .sort((a, b) => b.days - a.days);

      const totalCredit = rows.reduce((s, r) => s + r.sale, 0);
      const totalPaid   = rows.reduce((s, r) => s + r.paid, 0);
      setBalances(balList);
      setStats({ credit: totalCredit, paid: totalPaid, outstanding: totalCredit - totalPaid, oldest: balList[0] || null });
    })();
  }, []);

  const shown = entries.filter((e) => seg === 'All' || (seg === 'Open' && e.balance > 0.5) || (seg === 'Paid' && e.balance <= 0.5));

  return (
    <div className="pro frame" data-screen-label="Proposed · Credit Ledger">
      <ProSidebar active="/dashboard/credit" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Accounts"
          title="Credit ledger"
          sub="Money owed by partners — and how it moves"
          actions={
            <button className="pro-btn pro-btn-secondary"><Icons.Download size={13} sw={2} />Export</button>
          }
        />
        <div className="pro-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pro-statgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <ProStat label="Sales on credit" value={stats.credit.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel="billed" />
            <ProStat label="Collected" value={stats.paid.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel="received" />
            <ProStat label="Outstanding" value={stats.outstanding.toLocaleString('en-IN')} prefix="₹" delta={null} deltaLabel={balances.length + ' partner' + (balances.length === 1 ? '' : 's')} />
            <ProStat label="Oldest open" value={stats.oldest ? stats.oldest.days + 'd' : '—'} delta={null} deltaLabel={stats.oldest ? stats.oldest.name : 'All clear'} />
          </div>

          <div className="grid-3" style={{ flex: 1, minHeight: 0 }}>
            <div className="pro-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="pro-card-head">
                <div>
                  <h3>Invoices &amp; payments</h3>
                  <div className="sub">{entries.length} invoice{entries.length === 1 ? '' : 's'} · one line each</div>
                </div>
                <div className="pro-seg">
                  {['All', 'Open', 'Paid'].map((s) => (
                    <button key={s} className={seg === s ? 'on' : ''} onClick={() => setSeg(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <table className="pro-table">
                <thead><tr>
                  <th>Date</th><th>Partner</th><th>Invoice</th>
                  <th className="r">Sale</th><th className="r">Paid</th><th className="r">Balance</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {shown.map((e) => (
                    <tr key={e.id}>
                      <td>{e.d}</td>
                      <td className="strong">{e.p}</td>
                      <td>
                        <span className="id">{e.invNo}</span>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{e.note}</div>
                      </td>
                      <td className="r"><Money v={e.sale} color="var(--p-fg)" /></td>
                      <td className="r">
                        {e.paid > 0 ? <Money v={e.paid} color="var(--p-accent)" /> : <span className="muted tnum">—</span>}
                      </td>
                      <td className="r">
                        {e.balance > 0.5
                          ? <Money v={e.balance} color="var(--p-danger)" />
                          : <span className="tnum" style={{ color: 'var(--p-muted-soft)' }}>₹0</span>}
                      </td>
                      <td><ProPill kind={e.status === 'paid' ? 'paid' : (e.status === 'partial' ? 'partial' : 'pending')}>
                        {e.status === 'paid' ? 'Paid' : (e.status === 'partial' ? 'Partial' : 'Open')}
                      </ProPill></td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--p-muted)' }}>
                      No invoices yet. Issue an invoice to see it here.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pro-card">
              <div className="pro-card-head">
                <div>
                  <h3>Outstanding</h3>
                  <div className="sub">Oldest first · {balances.length} partner{balances.length === 1 ? '' : 's'}</div>
                </div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {balances.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--p-muted)', fontSize: 13 }}>
                    Everyone's settled up. No outstanding balances.
                  </div>
                )}
                {balances.map((b, i) => (
                  <div key={b.name} style={{
                    padding: '14px 20px',
                    borderBottom: i === balances.length - 1 ? 'none' : '1px solid var(--p-border-soft)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="pro-avatar" style={{ margin: 0 }}>{b.inits}</span>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--p-fg)' }}>{b.name}</div>
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{b.contact}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Money v={b.bal} color="var(--p-fg)" />
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{b.days}d open</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ProDashboard, ProBatches, ProSales, ProPartners, ProCredit });
