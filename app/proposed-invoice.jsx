// ============== PROPOSED — New Invoice page (GST engine + markdown + JSON) ==============

const { useState: useStateInv, useMemo: useMemoInv } = React;

/* ---------- Sample data (in the real app these come from Supabase) ---------- */

const samplePartners = [
  { id: 'p1', name: "Anand's General Store",  state: 'Karnataka', address: 'Super Market Rd, Kalaburagi',  phone: '+91 98452 11034', gstin: '29ABCDE1234F1Z5' },
  { id: 'p2', name: 'Brindavan Provisions',   state: 'Karnataka', address: 'Court Rd, Kalaburagi',           phone: '+91 90875 23311', gstin: null },
  { id: 'p3', name: 'Kalaburagi Fresh',       state: 'Karnataka', address: 'Aiwan Mart, Kalaburagi',         phone: '+91 84315 51234', gstin: '29XYZAB5678G2H7' },
  { id: 'p4', name: 'Modi Kirana',            state: 'Karnataka', address: 'Yadulla Colony, Kalaburagi',     phone: null,              gstin: null },
  { id: 'p5', name: 'Sangameshwar Mart',      state: 'Karnataka', address: 'Jewargi Rd, Kalaburagi',         phone: '+91 95904 12200', gstin: null },
  { id: 'p6', name: 'Yadulla Kirana',         state: 'Karnataka', address: 'Yadulla Colony',                 phone: '+91 84315 51169', gstin: null },
  { id: 'p7', name: 'Spice Route Mumbai',     state: 'Maharashtra', address: 'Crawford Market, Mumbai',      phone: '+91 98201 44556', gstin: '27MHARS1234P1Z2' },
  { id: 'p8', name: 'Hyderabad Bazaar',       state: 'Telangana',   address: 'Begum Bazaar, Hyderabad',      phone: '+91 99490 88112', gstin: '36TGABC4567R1Z9' },
];

const sampleProducts = [
  { id: 'wc', name: 'Wheat Chapati',     unit: 'pack of 30', rate: 180, hsn: '1905', gst: 5 },
  { id: 'mp', name: 'Mango Pickle',      unit: 'jar (250 g)', rate: 220, hsn: '2001', gst: 5 },
  { id: 'rm', name: 'Roasted Makhana',   unit: 'pack (100 g)', rate: 150, hsn: '2008', gst: 5 },
  { id: 'rc', name: 'Red Chilli Powder', unit: 'kg',           rate: 420, hsn: '0904', gst: 5 },
];

const SELLER = {
  legal_name: 'Organic Nutritious Food',
  trade_name: 'ON Food',
  address: 'H. No. 5-992/27A/1, Yadulla Colony, Near Anjuman-E-Islam School, Kalaburagi 585104',
  state: 'Karnataka',
  gstin: '29AHRPT2032P1ZI',
  fssai: '21226203000589',
};

/* ---------- Helpers ---------- */

// Was pinned to 28 May 2026 so the screen lined up with the mock data.
// Every invoice raised took that date, which on a real tax invoice is
// wrong and hard to correct after the fact — the issue date drives the
// GST return period and the due date drives the credit terms.
const today = () => new Date();
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isoDate = (d) => d.toISOString().slice(0, 10);
const dispDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Sequential ID — in the real app you'd grab MAX(invoice_number) + 1 from Supabase
const nextInvoiceId = () => 'INV-2026-007';

const round2 = (n) => Math.round(n * 100) / 100;
const fmtN = (n) => round2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- number to words (Indian system: lakh / crore) ----
const onesW = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tensW = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function twoDigits(n) {
  if (n < 20) return onesW[n];
  const t = Math.floor(n / 10), u = n % 10;
  return tensW[t] + (u ? ' ' + onesW[u] : '');
}
function threeDigits(n) {
  const h = Math.floor(n / 100), rest = n % 100;
  return (h ? onesW[h] + ' Hundred' + (rest ? ' ' : '') : '') + (rest ? twoDigits(rest) : '');
}
function numberInWords(num) {
  num = Math.round(num);
  if (num === 0) return 'Zero rupees only';
  const crore = Math.floor(num / 10000000);
  num = num % 10000000;
  const lakh = Math.floor(num / 100000);
  num = num % 100000;
  const thousand = Math.floor(num / 1000);
  num = num % 1000;
  const rest = num;
  let s = '';
  if (crore)    s += threeDigits(crore)    + ' Crore '   ;
  if (lakh)     s += threeDigits(lakh)     + ' Lakh '    ;
  if (thousand) s += threeDigits(thousand) + ' Thousand ';
  if (rest)     s += threeDigits(rest);
  return s.trim() + ' rupees only';
}

/* ---------- Computation ---------- */

function computeInvoice(buyer, lineItems, issueDate, dueDate) {
  const intra = buyer.state === SELLER.state;
  const items = lineItems.map((li, idx) => {
    const pcs     = li.pcsPerPack || 1;            // pieces per pack (1 if not packaged)
    const pieces  = li.quantity * pcs;             // total pieces sold
    const taxable = round2(pieces * li.rate);      // rate is per piece
    const gstAmt  = round2(taxable * li.gst / 100);
    const cgst    = intra ? round2(gstAmt / 2) : 0;
    const sgst    = intra ? round2(gstAmt / 2) : 0;
    const igst    = intra ? 0 : gstAmt;
    return {
      sno: idx + 1,
      product_id: li.product_id,
      product_name: li.product_name,
      description: li.description,
      hsn: li.hsn,
      quantity: li.quantity,
      unit: li.unit,
      pcs_per_pack: li.pcsPerPack || null,
      total_pieces: li.pcsPerPack ? pieces : null,
      rate: li.rate,
      taxable_value: taxable,
      gst_rate: li.gst,
      cgst: intra ? { rate: li.gst / 2, amount: cgst } : null,
      sgst: intra ? { rate: li.gst / 2, amount: sgst } : null,
      igst: intra ? null : { rate: li.gst, amount: igst },
      line_total: round2(taxable + gstAmt),
    };
  });
  const taxable = round2(items.reduce((s, it) => s + it.taxable_value, 0));
  const cgst    = round2(items.reduce((s, it) => s + (it.cgst?.amount ?? 0), 0));
  const sgst    = round2(items.reduce((s, it) => s + (it.sgst?.amount ?? 0), 0));
  const igst    = round2(items.reduce((s, it) => s + (it.igst?.amount ?? 0), 0));
  const grand   = round2(taxable + cgst + sgst + igst);
  return {
    items, taxable, cgst, sgst, igst, grand,
    tax_type: intra ? 'intra-state' : 'inter-state',
    in_words: numberInWords(grand),
  };
}

function buildJson(invoiceId, buyer, items, totals, issueDate, dueDate) {
  const whatsappMsg = encodeURIComponent(
    `Hi ${buyer.name.split(' ')[0]}, your invoice ${invoiceId} for ₹${fmtN(totals.grand)} is ready. Due ${dispDate(dueDate)}.`
  );
  const phoneDigits = buyer.phone ? buyer.phone.replace(/\D/g, '') : null;
  return {
    invoice_id: invoiceId,
    issue_date: isoDate(issueDate),
    due_date: isoDate(dueDate),
    seller: {
      legal_name: SELLER.legal_name,
      trade_name: SELLER.trade_name,
      address: SELLER.address,
      state: SELLER.state,
      gstin: SELLER.gstin,
      fssai: SELLER.fssai,
    },
    buyer: {
      partner_id: buyer.id,
      name: buyer.name,
      address: buyer.address,
      state: buyer.state,
      gstin: buyer.gstin,
      phone: buyer.phone,
    },
    tax_type: totals.tax_type,
    line_items: items,
    totals: {
      taxable_value: totals.taxable,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      round_off: 0,
      grand_total: totals.grand,
      in_words: totals.in_words,
    },
    payment_terms: 'Net 7 days',
    messaging: {
      phone: buyer.phone,
      whatsapp_link: phoneDigits ? `https://wa.me/${phoneDigits}?text=${whatsappMsg}` : null,
    },
    db_ingest: {
      sales: { invoice_number: invoiceId, partner_id: buyer.id, invoice_date: isoDate(issueDate),
               due_date: isoDate(dueDate), total_amount: totals.grand, paid_amount: 0, status: 'pending' },
      credit_ledger: { partner_id: buyer.id, entry_date: isoDate(issueDate), entry_type: 'credit',
                       amount: totals.grand, description: `Sale · ${invoiceId}` },
    },
  };
}

/* ---------- The component ---------- */

const ProNewInvoice = () => {
  const { state } = useAppState();

  // Products available to invoice = distinct products actually produced in Batches
  const producedProducts = useMemoInv(() => {
    const seen = {};
    state.batches.forEach((b) => {
      if (seen[b.p]) return;
      const recipe = Object.values(state.recipes).find((r) => r.name === b.p);
      seen[b.p] = {
        id: b.p,
        name: b.p,
        unit: (recipe && recipe.outputUnit) || b.u || 'pack',
        rate: recipe ? (recipe.salePrice || 0) : 0,
        hsn: '1905',
        gst: 5,
        pcsPerPack: 10,
      };
    });
    return Object.values(seen);
  }, [state.batches, state.recipes]);

  // Customers to bill = real partners (Customer / Wholesaler) from your database.
  const customers = useMemoInv(() => (state.partners || [])
    .filter((p) => p.role === 'Customer' || p.role === 'Wholesaler')
    .map((p) => ({ id: p.id, name: p.name, state: p.state || 'Karnataka', address: p.loc || '', phone: p.phone || null, gstin: p.gstin || null })),
    [state.partners]);

  const [partnerId, setPartnerId] = useStateInv('');
  const [issueDate, setIssueDate] = useStateInv(isoDate(today()));
  const [dueDate,   setDueDate]   = useStateInv(isoDate(addDays(today(), 7)));
  const [items,     setItems]     = useStateInv([]);
  const [tab, setTab] = useStateInv('preview');
  const [copied, setCopied] = useStateInv(null);
  const [invoiceId, setInvoiceId] = useStateInv('INV-' + new Date().getFullYear() + '-001');
  const [busy, setBusy] = useStateInv(false);
  const [soldByProduct, setSoldByProduct] = useStateInv({});

  // Load already-sold pieces per product so we can cap new sales at available stock.
  const loadSold = React.useCallback(async () => {
    const sb = window.supabaseClient;
    if (!sb) return;
    const { data } = await sb.from('invoice_items').select('product_name, quantity, pcs_per_pack');
    const clean = (s) => (s || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const sold = {};
    (data || []).forEach((it) => {
      const pieces = Number(it.quantity) * (Number(it.pcs_per_pack) || 1);
      const key = clean(it.product_name);
      sold[key] = (sold[key] || 0) + pieces;
    });
    setSoldByProduct(sold);
  }, []);
  React.useEffect(() => { loadSold(); }, [loadSold]);

  // Available stock (pieces) for a product name = produced − already sold.
  const availableOf = (name) => {
    const recipe = Object.values(state.recipes).find((r) => r.name === name);
    const produced = recipe ? (recipe.producedUnits || 0) : 0;
    return Math.max(0, produced - (soldByProduct[name] || 0));
  };

  // Pick the first customer once they load
  React.useEffect(() => {
    if (!partnerId && customers.length > 0) setPartnerId(customers[0].id);
  }, [customers.length]);

  // Compute the next invoice number from the database
  React.useEffect(() => {
    const sb = window.supabaseClient;
    if (!sb) return;
    (async () => {
      const { data } = await sb.from('invoices').select('invoice_no');
      let max = 0;
      (data || []).forEach((r) => { const m = /(\d+)\s*$/.exec(r.invoice_no || ''); if (m) max = Math.max(max, parseInt(m[1], 10)); });
      setInvoiceId('INV-' + new Date().getFullYear() + '-' + String(max + 1).padStart(3, '0'));
    })();
  }, []);

  // Seed one line once products become available (and none added yet)
  React.useEffect(() => {
    if (items.length === 0 && producedProducts.length > 0) {
      const p = producedProducts[0];
      setItems([{ id: 'l1', product_id: p.id, quantity: 10, rate: p.rate, pcsPerPack: p.pcsPerPack }]);
    }
  }, [producedProducts.length]);

  const buyer = customers.find((p) => p.id === partnerId)
    || { id: null, name: '', state: 'Karnataka', address: '', phone: null, gstin: null };

  const lineItems = useMemoInv(() => items.map((it) => {
    const p = producedProducts.find((sp) => sp.id === it.product_id)
              ?? producedProducts[0]
              ?? { id: '', name: '', unit: 'pack', hsn: '', gst: 5 };
    return {
      product_id: p.id,
      product_name: p.name,
      description: `${p.name} (${p.unit})`,
      hsn: p.hsn,
      quantity: Number(it.quantity) || 0,
      unit: (p.unit || 'pack').split(' ')[0],
      rate: it.rate != null ? (Number(it.rate) || 0) : p.rate,
      gst: p.gst,
      pcsPerPack: Number(it.pcsPerPack) || 0,
    };
  }), [items, producedProducts]);

  const totals = useMemoInv(
    () => computeInvoice(buyer, lineItems, new Date(issueDate), new Date(dueDate)),
    [buyer, lineItems, issueDate, dueDate]
  );

  // Does any line exceed available stock? (used to block Issue)
  const stockError = useMemoInv(() => {
    const perProduct = {};
    items.forEach((it) => {
      const p = producedProducts.find((sp) => sp.id === it.product_id);
      if (!p) return;
      const pieces = (Number(it.quantity) || 0) * (Number(it.pcsPerPack) || 1);
      perProduct[p.name] = (perProduct[p.name] || 0) + pieces;
    });
    return Object.keys(perProduct).some((name) => perProduct[name] > availableOf(name));
  }, [items, producedProducts, soldByProduct, state.recipes]);

  // Any line missing a price, or zero total → can't issue
  const priceError = useMemoInv(
    () => items.length > 0 && (items.some((it) => !(Number(it.rate) > 0)) || !(totals.grand > 0)),
    [items, totals.grand]
  );

  const addItem = () => {
    if (producedProducts.length === 0) return;
    const used = new Set(items.map((it) => it.product_id));
    const next = producedProducts.find((p) => !used.has(p.id)) ?? producedProducts[0];
    setItems([...items, { id: 'l' + (items.length + 1), product_id: next.id, quantity: 1, rate: next.rate, pcsPerPack: next.pcsPerPack }]);
  };
  const updateItem = (id, patch) =>
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) =>
    setItems(items.filter((it) => it.id !== id));

  const markdown = renderMarkdown(invoiceId, buyer, totals, issueDate, dueDate);
  const json = JSON.stringify(
    buildJson(invoiceId, buyer, totals.items, totals, new Date(issueDate), new Date(dueDate)),
    null, 2
  );
  const phoneDigits = buyer.phone ? buyer.phone.replace(/\D/g, '') : null;
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hi ${buyer.name.split(' ')[0]}, your invoice ${invoiceId} for ₹${fmtN(totals.grand)} is ready. Due ${dispDate(new Date(dueDate))}.`)}`
    : null;

  const copy = (kind, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  // ---- Build a clean, printable invoice and open the browser's Save-as-PDF ----
  const printInvoice = () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups for this site, then click Download PDF again.'); return; }
    w.document.write(invoicePrintHtml(invoiceId, buyer, totals, issueDate, dueDate));
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 500);
  };

  // ---- Issue: save permanently to the database, then open the PDF ----
  const issueInvoice = async () => {
    const sb = window.supabaseClient;
    if (!sb) { alert('Not connected to the database.'); return; }
    if (!buyer.id) { alert('Pick a customer first. If the list is empty, add a Customer or Wholesaler in Partners.'); return; }
    if (totals.items.length === 0) { alert('Add at least one line item before issuing.'); return; }
    // Price guard — every line needs a rate, and the invoice total must be > 0.
    const zeroLine = items.find((it) => !(Number(it.rate) > 0));
    if (zeroLine) {
      alert('Set a price (rate per piece) on every line before issuing. A line currently has ₹0.');
      return;
    }
    if (!(totals.grand > 0)) {
      alert('Invoice total is ₹0. Enter the selling price before issuing.');
      return;
    }
    // Stock guard — total pieces sold per product on this invoice can't exceed available stock.
    const perProduct = {};
    items.forEach((it) => {
      const p = producedProducts.find((sp) => sp.id === it.product_id);
      if (!p) return;
      const pieces = (Number(it.quantity) || 0) * (Number(it.pcsPerPack) || 1);
      perProduct[p.name] = (perProduct[p.name] || 0) + pieces;
    });
    for (const name of Object.keys(perProduct)) {
      const avail = availableOf(name);
      if (perProduct[name] > avail) {
        alert(`Not enough stock of ${name}. You're trying to sell ${perProduct[name].toLocaleString('en-IN')} but only ${avail.toLocaleString('en-IN')} are in stock. Reduce the quantity or produce another batch.`);
        return;
      }
    }
    setBusy(true);
    const { data: inv, error } = await sb.from('invoices').insert({
      invoice_no: invoiceId, partner_id: buyer.id, issue_date: issueDate, due_date: dueDate,
      tax_type: totals.tax_type, taxable_value: totals.taxable, cgst: totals.cgst, sgst: totals.sgst,
      igst: totals.igst, grand_total: totals.grand, paid_amount: 0, status: 'pending',
    }).select().single();
    if (error) { setBusy(false); alert('Could not issue invoice: ' + error.message); return; }
    const itemRows = totals.items.map((it) => ({
      invoice_id: inv.id, product_name: it.product_name || it.description, hsn: it.hsn,
      pcs_per_pack: it.pcs_per_pack || 1, quantity: it.quantity, rate_per_piece: it.rate,
      taxable_value: it.taxable_value, gst_rate: it.gst_rate,
    }));
    const { error: e2 } = await sb.from('invoice_items').insert(itemRows);
    setBusy(false);
    if (e2) { alert('Invoice saved, but line items failed: ' + e2.message); return; }
    printInvoice(); // open PDF for GST filing
    const issued = invoiceId;
    // advance to the next number and clear the form
    const m = /(\d+)\s*$/.exec(invoiceId);
    setInvoiceId('INV-' + new Date().getFullYear() + '-' + String((m ? parseInt(m[1], 10) : 0) + 1).padStart(3, '0'));
    setItems([]);
    loadSold();   // refresh available stock for the next invoice
    localStorage.removeItem('erp_invoice_draft');
    setTimeout(() => alert('Invoice ' + issued + ' issued and saved to your database. In the print window, choose "Save as PDF" — it is named by the bill number for your GST records.'), 600);
  };

  const saveDraft = () => {
    localStorage.setItem('erp_invoice_draft', JSON.stringify({ partnerId, issueDate, dueDate, items }));
    alert('Draft saved on this device. It will reload next time you open New invoice.');
  };

  // Reload a saved draft on first open
  React.useEffect(() => {
    const raw = localStorage.getItem('erp_invoice_draft');
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.partnerId) setPartnerId(d.partnerId);
        if (d.issueDate) setIssueDate(d.issueDate);
        if (d.dueDate) setDueDate(d.dueDate);
        if (Array.isArray(d.items) && d.items.length) setItems(d.items);
      } catch (e) {}
    }
  }, []);

  return (
    <div className="pro frame" data-screen-label="Proposed · New Invoice">
      <ProSidebar active="/dashboard/sales/new" />
      <div className="pro-main">
        <ProPageHeader
          crumb="Sales · New invoice"
          title={invoiceId}
          sub={`Issued ${dispDate(new Date(issueDate))} · Due ${dispDate(new Date(dueDate))}`}
          actions={
            <>
              <span className={`pro-taxchip ${totals.tax_type === 'inter-state' ? 'inter' : ''}`}>
                {totals.tax_type === 'intra-state' ? 'Intra-state · CGST + SGST' : 'Inter-state · IGST'}
              </span>
              <button className="pro-btn pro-btn-secondary" onClick={saveDraft}>Save draft</button>
              <button className="pro-btn pro-btn-primary" onClick={issueInvoice} disabled={busy || stockError || priceError}
                      style={{ opacity: (busy || stockError || priceError) ? 0.5 : 1, cursor: (busy || stockError || priceError) ? 'not-allowed' : 'pointer' }}
                      title={stockError ? 'A line exceeds available stock' : (priceError ? 'Set a price on every line' : '')}>
                <Icons.CheckCircle size={14} sw={2} />{busy ? 'Issuing…' : 'Issue invoice'}
              </button>
            </>
          }
        />

        <div className="pro-section" style={{ flex: 1, overflow: 'auto',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'flex-start' }}>
          {/* ============ LEFT: form ============ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Buyer */}
            <div className="pro-card">
              <div className="pro-card-head">
                <div>
                  <h3>Bill to</h3>
                  <div className="sub">State determines CGST/SGST vs IGST</div>
                </div>
              </div>
              <div className="pro-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="pro-label">Partner</label>
                    <select className="pro-select-native" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                      {customers.length === 0 && <option value="">No customers — add one in Partners</option>}
                      {customers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {p.state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="pro-label">State</label>
                    <div className="pro-input" style={{ background: 'var(--p-border-soft)', color: 'var(--p-fg-2)' }}>
                      {buyer.state}
                    </div>
                  </div>
                  <div>
                    <label className="pro-label">Phone</label>
                    <div className="pro-input" style={{ background: 'var(--p-border-soft)', color: buyer.phone ? 'var(--p-fg-2)' : 'var(--p-muted-soft)' }}>
                      {buyer.phone ?? 'Not on file'}
                    </div>
                  </div>
                  <div>
                    <label className="pro-label">GSTIN</label>
                    <div className="pro-input" style={{ background: 'var(--p-border-soft)', color: buyer.gstin ? 'var(--p-fg-2)' : 'var(--p-muted-soft)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {buyer.gstin ?? 'Unregistered'}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--p-border-soft)',
                              borderRadius: 6, fontSize: 12, color: 'var(--p-fg-2)' }}>
                  {buyer.address}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="pro-card">
              <div className="pro-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="pro-label">Issue date</label>
                  <input type="date" className="pro-input" value={issueDate}
                         onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className="pro-label">Due date (Net 7)</label>
                  <input type="date" className="pro-input" value={dueDate}
                         onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="pro-card">
              <div className="pro-card-head">
                <div>
                  <h3>Line items</h3>
                  <div className="sub">All items taxed at 5% GST</div>
                </div>
                <button className="pro-btn pro-btn-secondary" onClick={addItem}>
                  <Icons.Plus size={13} sw={2} />Add item
                </button>
              </div>
              <table className="pro-table">
                <thead><tr>
                  <th>Product</th>
                  <th className="r" style={{ width: 76 }}>Pcs/pack</th>
                  <th className="r" style={{ width: 64 }}>Qty</th>
                  <th className="r" style={{ width: 90 }}>Rate / pc</th>
                  <th className="r" style={{ width: 96 }}>Taxable</th>
                  <th style={{ width: 28 }}></th>
                </tr></thead>
                <tbody>
                  {items.map((it) => {
                    const p = producedProducts.find((sp) => sp.id === it.product_id) ?? producedProducts[0];
                    if (!p) return null;
                    const rate = it.rate != null ? (Number(it.rate) || 0) : p.rate;
                    const qty = Number(it.quantity) || 0;
                    const pcs = Number(it.pcsPerPack) || 0;
                    const pieces = qty * (pcs || 1);
                    const taxable = pieces * rate;
                    const avail = availableOf(p.name);
                    const over = pieces > avail;
                    return (
                      <tr key={it.id}>
                        <td>
                          <select className="pro-select-native compact" value={it.product_id} style={{ height: 28, fontSize: 12 }}
                                  onChange={(e) => {
                                    const np = producedProducts.find((x) => x.id === e.target.value);
                                    updateItem(it.id, { product_id: e.target.value, rate: np ? np.rate : rate });
                                  }}>
                            {producedProducts.map((sp) => (
                              <option key={sp.id} value={sp.id}>{sp.name} — {sp.unit}</option>
                            ))}
                          </select>
                          <div className="muted" style={{ fontSize: 11, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                            HSN {p.hsn}{pcs > 0 && qty > 0 ? ` · ${pieces.toLocaleString('en-IN')} pcs total` : ''}
                          </div>
                          <div style={{ fontSize: 11, marginTop: 3, color: over ? 'var(--p-danger)' : 'var(--p-muted)' }}>
                            {over
                              ? `Only ${avail.toLocaleString('en-IN')} in stock — reduce quantity`
                              : `${avail.toLocaleString('en-IN')} ${p.unit} in stock`}
                          </div>
                        </td>
                        <td className="r">
                          <input className="pro-input compact tnum" style={{ width: 56, marginLeft: 'auto' }}
                                 value={it.pcsPerPack ?? ''}
                                 onChange={(e) => updateItem(it.id, { pcsPerPack: e.target.value })} />
                        </td>
                        <td className="r">
                          <input className="pro-input compact tnum"
                                 style={{ width: 48, marginLeft: 'auto', borderColor: over ? 'var(--p-danger)' : undefined }}
                                 value={it.quantity}
                                 onChange={(e) => updateItem(it.id, { quantity: e.target.value })} />
                        </td>
                        <td className="r">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                            <span style={{ color: 'var(--p-muted-soft)', fontSize: 12 }}>₹</span>
                            <input className="pro-input compact tnum" style={{ width: 60 }}
                                   value={it.rate ?? p.rate}
                                   onChange={(e) => updateItem(it.id, { rate: e.target.value })} />
                          </div>
                        </td>
                        <td className="r"><Money v={taxable} /></td>
                        <td>
                          <button onClick={() => removeItem(it.id)}
                                  aria-label="Remove"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                                           color: 'var(--p-muted-soft)', padding: 4 }}>
                            <Icons.X size={14} sw={2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--p-muted)' }}>
                      {producedProducts.length === 0
                        ? 'No products produced yet — create a batch in Batches first.'
                        : 'No line items. Click "Add item".'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============ RIGHT: output ============ */}
          <div className="pro-card" style={{ position: 'sticky', top: 0 }}>
            <div className="pro-card-head" style={{ paddingBottom: 0, borderBottom: 'none' }}>
              <div style={{ display: 'flex', gap: 0, fontSize: 13 }}>
                {[
                  { k: 'preview', l: 'Invoice (markdown)' },
                  { k: 'json',    l: 'JSON payload' },
                  { k: 'send',    l: 'Send' },
                ].map(({ k, l }) => (
                  <button key={k} onClick={() => setTab(k)}
                          style={{
                            background: 'none', border: 'none',
                            paddingBottom: 12, marginRight: 18,
                            borderBottom: tab === k ? '2px solid var(--p-fg)' : '2px solid transparent',
                            color: tab === k ? 'var(--p-fg)' : 'var(--p-muted)',
                            fontWeight: 500, fontSize: 13, cursor: 'pointer',
                          }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ paddingBottom: 12 }}>
                {tab === 'preview' && (
                  <button className={`pro-copy ${copied === 'md' ? 'ok' : ''}`} onClick={() => copy('md', markdown)}>
                    {copied === 'md' ? '✓ Copied' : 'Copy'}
                  </button>
                )}
                {tab === 'json' && (
                  <button className={`pro-copy ${copied === 'json' ? 'ok' : ''}`} onClick={() => copy('json', json)}>
                    {copied === 'json' ? '✓ Copied' : 'Copy JSON'}
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: 20, borderTop: '1px solid var(--p-border)' }}>
              {tab === 'preview' && <InvoicePreview totals={totals} buyer={buyer} invoiceId={invoiceId} issueDate={issueDate} dueDate={dueDate} />}
              {tab === 'json'    && <pre className="pro-output" style={{ margin: 0 }}>{json}</pre>}
              {tab === 'send'    && <SendPanel buyer={buyer} invoiceId={invoiceId} totals={totals} dueDate={dueDate} whatsappUrl={whatsappUrl} onDownload={printInvoice} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Invoice rendered as a clean document ---------- */

const InvoicePreview = ({ totals, buyer, invoiceId, issueDate, dueDate }) => {
  const intra = totals.tax_type === 'intra-state';
  return (
    <div className="pro-md">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>TAX INVOICE</h1>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--p-fg-2)' }}>
          {invoiceId}
        </span>
      </div>
      <p style={{ margin: '4px 0 0', color: 'var(--p-muted)', fontSize: 12 }}>
        Issued {dispDate(new Date(issueDate))} · Due {dispDate(new Date(dueDate))}
      </p>

      <hr />
      <div className="meta-row">
        <div>
          <div className="lbl">Seller</div>
          <div style={{ fontWeight: 600 }}>{SELLER.trade_name}</div>
          <div style={{ color: 'var(--p-muted)' }}>{SELLER.legal_name}</div>
          <div style={{ color: 'var(--p-fg-2)', marginTop: 4, fontSize: 12 }}>{SELLER.address}</div>
          <div style={{ marginTop: 4, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
            GSTIN {SELLER.gstin} · FSSAI {SELLER.fssai}
          </div>
        </div>
        <div>
          <div className="lbl">Bill to</div>
          <div style={{ fontWeight: 600 }}>{buyer.name}</div>
          <div style={{ color: 'var(--p-fg-2)', marginTop: 4, fontSize: 12 }}>{buyer.address}</div>
          <div style={{ color: 'var(--p-muted)', marginTop: 4, fontSize: 12 }}>
            {buyer.state} · {buyer.phone ?? 'no phone'}
          </div>
          {buyer.gstin && (
            <div style={{ marginTop: 4, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
              GSTIN {buyer.gstin}
            </div>
          )}
        </div>
      </div>

      <table style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th style={{ width: 24 }}>#</th>
            <th>Description</th>
            <th style={{ width: 50 }}>HSN</th>
            <th className="r" style={{ width: 90 }}>Qty</th>
            <th className="r" style={{ width: 64 }}>Rate/pc</th>
            <th className="r" style={{ width: 90 }}>Taxable</th>
          </tr>
        </thead>
        <tbody>
          {totals.items.map((it) => (
            <tr key={it.sno}>
              <td>{it.sno}</td>
              <td>{it.description}</td>
              <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{it.hsn}</td>
              <td className="r">
                {it.total_pieces
                  ? <>{it.quantity} × {it.pcs_per_pack} = {it.total_pieces.toLocaleString('en-IN')} pcs</>
                  : <>{it.quantity} {it.unit}</>}
              </td>
              <td className="r">{fmtN(it.rate)}</td>
              <td className="r">{fmtN(it.taxable_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <span className="lbl">Subtotal</span>
        <span>₹{fmtN(totals.taxable)}</span>
        {intra ? (
          <>
            <span className="lbl">CGST @ 2.5%</span>
            <span>₹{fmtN(totals.cgst)}</span>
            <span className="lbl">SGST @ 2.5%</span>
            <span>₹{fmtN(totals.sgst)}</span>
          </>
        ) : (
          <>
            <span className="lbl">IGST @ 5%</span>
            <span>₹{fmtN(totals.igst)}</span>
          </>
        )}
        <span className="lbl grand">Grand total</span>
        <span className="grand">₹{fmtN(totals.grand)}</span>
      </div>

      <p style={{ marginTop: 14, fontSize: 12, color: 'var(--p-muted)' }}>
        <span style={{ fontWeight: 500, color: 'var(--p-fg-2)' }}>In words:</span> {totals.in_words}
      </p>
      <p style={{ marginTop: 4, fontSize: 12, color: 'var(--p-muted)' }}>
        Payment terms: Net 7 days
      </p>
    </div>
  );
};

const SendPanel = ({ buyer, invoiceId, totals, dueDate, whatsappUrl, onDownload }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div>
      <div className="pro-label">Send to</div>
      <div style={{ fontWeight: 500, marginTop: 4 }}>{buyer.name}</div>
      <div style={{ color: 'var(--p-muted)', fontSize: 12 }}>{buyer.phone ?? 'No phone on file'}</div>
    </div>
    <div>
      <div className="pro-label">Message</div>
      <div className="pro-output" style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif' }}>
        Hi {buyer.name.split(' ')[0]}, your invoice {invoiceId} for ₹{fmtN(totals.grand)} is ready. Due {dispDate(new Date(dueDate))}.
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      {whatsappUrl ? (
        <a href={whatsappUrl} target="_blank" rel="noopener"
           className="pro-btn pro-btn-primary" style={{ textDecoration: 'none' }}>
          <Icons.Phone size={14} sw={2} />Send via WhatsApp
        </a>
      ) : (
        <button className="pro-btn pro-btn-secondary" disabled style={{ opacity: 0.5 }}>
          No phone on file
        </button>
      )}
      <button className="pro-btn pro-btn-secondary" onClick={onDownload}><Icons.Download size={13} sw={2} />Download PDF</button>
    </div>
  </div>
);

/* ---------- Markdown serializer (the LLM-prompt-style summary) ---------- */

function renderMarkdown(invoiceId, buyer, totals, issueDate, dueDate) {
  const intra = totals.tax_type === 'intra-state';
  const lines = [];
  lines.push(`# TAX INVOICE`);
  lines.push(`**${invoiceId}** · Issued ${dispDate(new Date(issueDate))} · Due ${dispDate(new Date(dueDate))}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(`**Seller** — ${SELLER.trade_name} (${SELLER.legal_name})`);
  lines.push(`${SELLER.address}`);
  lines.push(`GSTIN: \`${SELLER.gstin}\` · FSSAI: \`${SELLER.fssai}\``);
  lines.push(``);
  lines.push(`**Bill to** — ${buyer.name}`);
  lines.push(`${buyer.address}, ${buyer.state}`);
  if (buyer.phone) lines.push(`Phone: ${buyer.phone}`);
  if (buyer.gstin) lines.push(`GSTIN: \`${buyer.gstin}\``);
  else             lines.push(`GSTIN: (unregistered)`);
  lines.push(``);
  lines.push(`**Tax type:** ${intra ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}`);
  lines.push(``);
  lines.push(`| # | Description | HSN | Qty | Rate/pc | Taxable |`);
  lines.push(`|---|---|---|---:|---:|---:|`);
  totals.items.forEach((it) => {
    const qtyText = it.total_pieces
      ? `${it.quantity} × ${it.pcs_per_pack} = ${it.total_pieces} pcs`
      : `${it.quantity} ${it.unit}`;
    lines.push(`| ${it.sno} | ${it.description} | ${it.hsn} | ${qtyText} | ₹${fmtN(it.rate)} | ₹${fmtN(it.taxable_value)} |`);
  });
  lines.push(``);
  lines.push(`Subtotal: **₹${fmtN(totals.taxable)}**`);
  if (intra) {
    lines.push(`CGST @ 2.5%: ₹${fmtN(totals.cgst)}`);
    lines.push(`SGST @ 2.5%: ₹${fmtN(totals.sgst)}`);
  } else {
    lines.push(`IGST @ 5%: ₹${fmtN(totals.igst)}`);
  }
  lines.push(``);
  lines.push(`### GRAND TOTAL: ₹${fmtN(totals.grand)}`);
  lines.push(`*${totals.in_words}*`);
  lines.push(``);
  lines.push(`Payment terms: Net 7 days`);
  return lines.join('\n');
}

window.ProNewInvoice = ProNewInvoice;

// ---------- Printable invoice (browser Save-as-PDF) ----------
function invoicePrintHtml(invoiceId, buyer, totals, issueDate, dueDate) {
  const intra = totals.tax_type === 'intra-state';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rows = totals.items.map((it) => `
    <tr>
      <td>${it.sno}</td>
      <td>${esc(it.description)}</td>
      <td class="mono">${esc(it.hsn)}</td>
      <td class="r">${it.total_pieces ? (it.quantity + ' × ' + it.pcs_per_pack + ' = ' + it.total_pieces.toLocaleString('en-IN') + ' pcs') : (it.quantity + ' ' + esc(it.unit))}</td>
      <td class="r">${fmtN(it.rate)}</td>
      <td class="r">${fmtN(it.taxable_value)}</td>
    </tr>`).join('');
  const taxLines = intra
    ? `<tr><td>CGST @ 2.5%</td><td class="r">₹${fmtN(totals.cgst)}</td></tr><tr><td>SGST @ 2.5%</td><td class="r">₹${fmtN(totals.sgst)}</td></tr>`
    : `<tr><td>IGST @ 5%</td><td class="r">₹${fmtN(totals.igst)}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(invoiceId)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1c1917;margin:0;padding:32px;font-size:13px;line-height:1.5}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1c1917;padding-bottom:14px;margin-bottom:18px}
    h1{font-size:22px;margin:0 0 2px} .muted{color:#666;font-size:12px}
    .mono{font-family:monospace} .num{font-variant-numeric:tabular-nums}
    .grid{display:flex;gap:40px;margin:18px 0}
    .grid h4{margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{padding:7px 8px;border-bottom:1px solid #e7e5e4;text-align:left;font-size:12px}
    th{background:#f5f5f4;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#666}
    td.r,th.r{text-align:right}
    .totals{margin-left:auto;width:280px;margin-top:14px}
    .totals td{border:none;padding:3px 8px}
    .grand td{border-top:2px solid #1c1917;font-weight:700;font-size:15px;padding-top:8px}
    .foot{margin-top:28px;border-top:1px solid #e7e5e4;padding-top:12px;color:#666;font-size:11px}
    @media print{body{padding:0}}
  </style></head><body>
    <div class="head">
      <div>
        <h1>${esc(SELLER.trade_name)}</h1>
        <div class="muted">${esc(SELLER.legal_name)}</div>
        <div class="muted">${esc(SELLER.address)}</div>
        <div class="muted mono">GSTIN ${esc(SELLER.gstin)} · FSSAI ${esc(SELLER.fssai)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">TAX INVOICE</div>
        <div class="mono">${esc(invoiceId)}</div>
        <div class="muted">Issued ${esc(dispDate(new Date(issueDate)))}</div>
        <div class="muted">Due ${esc(dispDate(new Date(dueDate)))}</div>
      </div>
    </div>
    <div class="grid">
      <div><h4>Bill to</h4>
        <div style="font-weight:600">${esc(buyer.name)}</div>
        <div class="muted">${esc(buyer.address)}</div>
        <div class="muted">${esc(buyer.state)}${buyer.phone ? ' · ' + esc(buyer.phone) : ''}</div>
        ${buyer.gstin ? '<div class="muted mono">GSTIN ' + esc(buyer.gstin) + '</div>' : ''}
      </div>
      <div><h4>Tax type</h4><div>${intra ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}</div></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Description</th><th>HSN</th><th class="r">Qty</th><th class="r">Rate/pc</th><th class="r">Taxable</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tr><td>Subtotal</td><td class="r">₹${fmtN(totals.taxable)}</td></tr>
      ${taxLines}
      <tr class="grand"><td>Grand total</td><td class="r">₹${fmtN(totals.grand)}</td></tr>
    </table>
    <div class="foot">
      <div><b>Amount in words:</b> ${esc(totals.in_words)}</div>
      <div>Payment terms: Net 7 days · This is a computer-generated tax invoice.</div>
    </div>
  </body></html>`;
}
