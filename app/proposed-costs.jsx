// ============== PROPOSED — Products page (ready to sell) ==============
// Products are created automatically when you produce a batch.
// This page shows finished goods ready to sell: how many made, cost/unit,
// and an editable sale price that flows into invoices.

const fmt2 = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const ProCosts = () => {
  const { state, actions } = useAppState();
  const products = Object.values(state.recipes);
  const [soldByProduct, setSoldByProduct] = React.useState({});

  // How many units have been SOLD per product (from issued invoices).
  React.useEffect(() => {
    const sb = window.supabaseClient;
    if (!sb) return;
    (async () => {
      const { data } = await sb.from('invoice_items').select('product_name, quantity, pcs_per_pack');
      const sold = {};
      // Invoice line names are saved as "Product (unit)" — strip the trailing
      // parenthetical so they match the clean product name.
      const clean = (s) => (s || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
      (data || []).forEach((it) => {
        const pieces = Number(it.quantity) * (Number(it.pcs_per_pack) || 1);
        const key = clean(it.product_name);
        sold[key] = (sold[key] || 0) + pieces;
      });
      setSoldByProduct(sold);
    })();
  }, [state.batches]);

  const stockOf = (p) => Math.max(0, (p.producedUnits || 0) - (soldByProduct[p.name] || 0));

  // "Ready to sell" = produced − sold.
  const totalReady = products.reduce((s, p) => s + stockOf(p), 0);
  const totalCostValue = products.reduce((s, p) => s + stockOf(p) * (p.lastCostPerUnit || 0), 0);

  return (
    <div className="pro frame" data-screen-label="Proposed · Products">
      <ProSidebar active="/dashboard/costs" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Operate"
          title="Products"
          sub="Finished goods ready to sell — built from your batches"
          actions={
            <button className="pro-btn pro-btn-secondary"><Icons.Download size={13} sw={2} />Export</button>
          }
        />

        <div className="pro-section" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary */}
          <div className="pro-statgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <ProStat label="Products" value={String(products.length)} delta={null} deltaLabel="ready to sell" />
            <ProStat label="Units in stock" value={fmt0(totalReady)} delta={null} deltaLabel="produced − sold" />
            <ProStat label="Stock value at cost" value={fmt0(totalCostValue)} prefix="₹" delta={null} deltaLabel="unsold cost" />
          </div>

          {/* Ready-to-sell table */}
          <div className="pro-card">
            <div className="pro-card-head">
              <div>
                <h3>Ready to sell</h3>
                <div className="sub">Produced in batches, minus what's been sold · price is set per customer on the invoice</div>
              </div>
            </div>
            <table className="pro-table">
              <thead><tr>
                <th>Product</th>
                <th>Made from</th>
                <th className="r">Produced</th>
                <th className="r">Sold</th>
                <th className="r">In stock</th>
                <th className="r">Cost / unit</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                {products.map((p) => {
                  const cost = p.lastCostPerUnit || 0;
                  const produced = p.producedUnits || 0;
                  const sold = soldByProduct[p.name] || 0;
                  const ready = stockOf(p);
                  return (
                    <tr key={p.id}>
                      <td className="strong">{p.name}</td>
                      <td><span className="muted">{p.inputName || '—'}</span></td>
                      <td className="r"><span className="tnum muted">{fmt0(produced)}</span></td>
                      <td className="r"><span className="tnum" style={{ color: sold > 0 ? 'var(--p-fg-2)' : 'var(--p-muted-soft)' }}>{sold > 0 ? '−' + fmt0(sold) : '—'}</span></td>
                      <td className="r">
                        <span className="tnum" style={{ fontWeight: 600, color: ready > 0 ? 'var(--p-fg)' : 'var(--p-muted-soft)' }}>
                          {fmt0(ready)}
                        </span> <span className="muted">{p.outputUnit}</span>
                      </td>
                      <td className="r"><Money v={cost} decimals color="var(--p-fg-2)" /></td>
                      <td>
                        {ready > 0
                          ? <ProPill kind="paid">Ready</ProPill>
                          : <ProPill kind="pending">Out of stock</ProPill>}
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--p-muted)' }}>
                    No products yet. Produce a batch in <span style={{ color: 'var(--p-fg)', fontWeight: 500 }}>Batches</span> and it appears here ready to sell.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

window.ProCosts = ProCosts;
