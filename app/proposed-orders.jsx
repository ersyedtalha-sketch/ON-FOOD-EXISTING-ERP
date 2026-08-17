// ============== ORDERS — the step between an enquiry and an invoice ==============
//
// Orders arrive three ways and all land in the same table, differing only
// in `source`: taken by a salesperson, sent over WhatsApp, or paid through
// the payment gateway. See backend/02-orders-and-sales.sql.
//
// Marking one delivered is what raises the invoice and consumes stock —
// the database does both, so this screen only has to make the request and
// report what came back. If stock is short the delivery is refused and the
// message from allocate_fefo() is shown as-is; it names the shortfall.

const SLOTS = ['6-8 AM', '8-10 AM', '11 AM-1 PM', '2-4 PM', '4-6 PM', '6-8 PM'];

// The run is worked in time order. Sorted as plain text "4-6 PM" comes
// before "6-8 AM" and the route reads backwards, so position in SLOTS is
// the sort key. The dropdown is built from the same array.
const slotRank = (s) => { const i = SLOTS.indexOf(s); return i === -1 ? SLOTS.length : i; };

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Mirrors invoice_for_order(): round each line, then split CGST/SGST so
// the two halves still add up to the tax after rounding.
const orderTotals = (items, buyerState, homeState) => {
  let taxable = 0, tax = 0;
  (items || []).forEach((i) => {
    taxable += r2(i.pcs * i.qty * i.rate);
    tax     += r2(i.pcs * i.qty * i.rate * i.gst / 100);
  });
  taxable = r2(taxable); tax = r2(tax);
  const intra = (buyerState || homeState) === homeState;
  const cgst = intra ? r2(tax / 2) : 0;
  const sgst = intra ? r2(tax - cgst) : 0;
  const igst = intra ? 0 : tax;
  return { taxable, cgst, sgst, igst, grand: r2(taxable + cgst + sgst + igst), intra };
};

const ORDER_HOME_STATE = 'Karnataka';

const ProOrders = () => {
  const { state, actions } = useAppState();
  const [showNew, setShowNew] = React.useState(false);
  const [busy, setBusy] = React.useState(null);

  const orders = state.orders || [];
  const partnerOf = (id) => (state.partners || []).find((p) => p.id === id) || null;

  const open = orders
    .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
    .sort((a, b) => (slotRank(a.slot) - slotRank(b.slot)) || String(a.orderNo).localeCompare(String(b.orderNo)));
  const done = orders.filter((o) => o.status === 'delivered');

  const deliver = async (o) => {
    setBusy(o.id);
    try { await actions.markDelivered(o.id); }
    finally { setBusy(null); }
  };

  return (
    <div className="pro frame" data-screen-label="Proposed · Orders">
      <ProSidebar active="/dashboard/orders" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Orders"
          title="Orders"
          sub="Deliveries in the order the customer asked for"
          actions={<button className="pro-btn pro-btn-primary" onClick={() => setShowNew(true)}><Icons.Plus size={14} sw={2} />New order</button>}
        />

        <div className="pro-section" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="pro-card">
            <div className="pro-card-head">
              <div>
                <h3>To deliver</h3>
                <div className="sub">
                  {open.length ? open.length + (open.length === 1 ? ' order' : ' orders') + ' outstanding'
                               : 'Nothing outstanding'}
                </div>
              </div>
            </div>

            {open.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--p-fg)' }}>No orders waiting</p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--p-muted)' }}>Everything for today has gone out.</p>
              </div>
            ) : (
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>Order</th><th>Customer</th><th>When</th><th>Items</th>
                    <th style={{ textAlign: 'right' }}>Value</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((o) => {
                    const p = partnerOf(o.partnerId);
                    const t = orderTotals(o.items, p && p.state, ORDER_HOME_STATE);
                    return (
                      <tr key={o.id}>
                        <td className="mono">{o.orderNo}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p ? p.name : 'Unknown customer'}</div>
                          {p && p.loc ? <div className="sub">{p.loc}</div> : null}
                        </td>
                        <td>
                          <div>{o.slot || 'Any time'}</div>
                          {o.requestedFor ? <div className="sub">{o.requestedFor}</div> : null}
                        </td>
                        <td>
                          {(o.items || []).map((i, n) => (
                            <div key={n} className="sub">{i.qty} × {i.name}</div>
                          ))}
                          {o.notes ? <div className="sub">Note: {o.notes}</div> : null}
                        </td>
                        <td style={{ textAlign: 'right' }}><Money v={t.grand} decimals /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="pro-btn pro-btn-primary"
                            disabled={busy === o.id}
                            onClick={() => deliver(o)}
                          >
                            {busy === o.id ? 'Delivering…' : 'Mark delivered'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {done.length > 0 && (
            <div className="pro-card">
              <div className="pro-card-head">
                <div><h3>Delivered</h3><div className="sub">Invoice raised on delivery</div></div>
              </div>
              <table className="pro-table">
                <thead>
                  <tr><th>Order</th><th>Customer</th><th>Delivered</th><th>Invoice</th></tr>
                </thead>
                <tbody>
                  {done.map((o) => {
                    const p = partnerOf(o.partnerId);
                    return (
                      <tr key={o.id}>
                        <td className="mono">{o.orderNo}</td>
                        <td>{p ? p.name : '—'}</td>
                        <td className="sub">
                          {o.deliveredAt ? new Date(o.deliveredAt).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td>
                          {o.invoiceId
                            ? <ProPill kind="paid">Invoiced</ProPill>
                            : <ProPill kind="pending">No invoice</ProPill>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNew && <NewOrderDialog onClose={() => setShowNew(false)} />}
    </div>
  );
};

const NewOrderDialog = ({ onClose }) => {
  const { state, actions } = useAppState();
  const customers = (state.partners || []).filter(
    (p) => p.role === 'Customer' || p.role === 'Wholesaler'
  );
  // Produced products first; fall back to the catalogue so an order can be
  // taken before that product has ever been made.
  const produced = Object.values(state.recipes || {});
  const products = produced.length ? produced : Object.values(window.ERPCatalogue || {});

  const [partnerId, setPartnerId] = React.useState('');
  const [lines, setLines] = React.useState([]);
  const [slot, setSlot] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const buyer = customers.find((c) => c.id === partnerId) || null;
  const totals = orderTotals(lines, buyer && buyer.state, ORDER_HOME_STATE);

  const addProduct = (id) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLines((ls) => {
      const found = ls.find((l) => l.name === p.name);
      if (found) return ls.map((l) => (l.name === p.name ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, {
        name: p.name,
        hsn: p.hsn || null,
        pcs: (p.packSize && Number(p.packSize.qty)) || 1,
        qty: 1,
        // salePrice is per pack; the invoice works per piece. The division
        // is deliberately NOT rounded: ₹170 over 30 chapatis is ₹5.6667,
        // and rounding that to ₹5.67 before multiplying back gives ₹170.10
        // a pack — ₹10 too much on an order of 100. Only the line total is
        // rounded, which recovers the pack price exactly.
        rate: (Number(p.salePrice) || 0) / ((p.packSize && Number(p.packSize.qty)) || 1),
        gst: 5,
      }];
    });
  };

  const save = async () => {
    if (!partnerId || !lines.length) return;
    setSaving(true);
    try {
      await actions.createOrder({
        partnerId, items: lines, slot, requestedFor: date, notes,
        source: 'salesperson',
        address: buyer && buyer.loc ? buyer.loc : null,
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="pro-modal-backdrop" onClick={onClose}>
      <div className="pro-modal" onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: '86vh', overflow: 'auto' }}>
        <div className="pro-modal-head">
          <h2 style={{ margin: 0, font: '600 16px/1.2 Inter, sans-serif', letterSpacing: '-0.01em' }}>New order</h2>
          <button onClick={onClose} aria-label="Close"><Icons.X size={16} sw={2} /></button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div>
          <label className="pro-label" htmlFor="ord-cust">Customer</label>
          <select id="ord-cust" className="pro-select-native" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
            <option value="">Choose a customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {buyer && !totals.intra && (
          <div style={{ background: 'var(--p-info-soft, #dbeafe)', color: 'var(--p-info)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            {buyer.state || 'Outside Karnataka'} — this invoice will carry IGST, not CGST and SGST.
          </div>
        )}

        <div>
          <label className="pro-label" htmlFor="ord-prod">Add a product</label>
          <select id="ord-prod" className="pro-select-native" value="" onChange={(e) => { addProduct(e.target.value); e.target.value = ''; }}>
            <option value="">Choose a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{p.salePrice} per {(p.packSize && p.packSize.unit) || 'pack'}
              </option>
            ))}
          </select>
        </div>

        {lines.length > 0 && (
          <table className="pro-table" style={{ marginTop: 8 }}>
            <thead><tr><th>Product</th><th style={{ width: 90 }}>Packs</th><th></th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.name}</div>
                    {/* The stored rate keeps full precision so the pack price
                        comes back exactly; only the display is rounded. */}
                    <div className="sub">{l.pcs} per pack · ₹{r2(l.rate).toFixed(2)} each</div>
                  </td>
                  <td>
                    <input
                      className="pro-input compact" type="number" min="1" value={l.qty}
                      onChange={(e) => {
                        const q = parseInt(e.target.value, 10);
                        setLines((ls) => ls.map((x, n) => (n === i ? { ...x, qty: (!q || q < 1) ? 1 : q } : x)));
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="pro-btn pro-btn-ghost" onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {lines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--p-border)', paddingTop: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Taxable value</span><Money v={totals.taxable} decimals /></div>
            {totals.intra ? (
              <React.Fragment>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CGST</span><Money v={totals.cgst} decimals /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SGST</span><Money v={totals.sgst} decimals /></div>
              </React.Fragment>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>IGST</span><Money v={totals.igst} decimals /></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}><span>Total</span><Money v={totals.grand} decimals /></div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="pro-label" htmlFor="ord-date">Wanted on</label>
            <input id="ord-date" className="pro-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="pro-label" htmlFor="ord-slot">Time</label>
            <select id="ord-slot" className="pro-select-native" value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="">Any time</option>
              {SLOTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="pro-label" htmlFor="ord-note">Note for the kitchen</label>
          <input id="ord-note" className="pro-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Back gate, ask for Suresh" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button className="pro-btn pro-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="pro-btn pro-btn-primary"
            disabled={!partnerId || !lines.length || saving}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Place order'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
