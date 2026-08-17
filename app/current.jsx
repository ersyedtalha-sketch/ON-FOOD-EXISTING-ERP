// ============== CURRENT — faithful reproduction of the v0 build ==============

const CurrentSidebar = ({ active }) => {
  const items = [
    { label: 'Dashboard Overview', icon: 'Dashboard', href: '/dashboard' },
    { label: 'Batch Tracker',       icon: 'Package',   href: '/dashboard/batches' },
    { label: 'Credit Ledger',       icon: 'Card',      href: '/dashboard/credit-ledger' },
    { label: 'Sales History Logs',  icon: 'History',   href: '/dashboard/sales' },
    { label: 'Partners Directory',  icon: 'Users',     href: '/dashboard/partners' },
  ];
  return (
    <aside className="cur-sidebar">
      <div className="cur-sidebar-brand">
        <div className="logo"><Icons.Leaf size={22} sw={2} /></div>
        <div>
          <h1>Organic</h1>
          <p>Nutritious Food</p>
        </div>
      </div>
      <nav className="cur-sidebar-nav">
        {items.map((it) => {
          const I = Icons[it.icon];
          return (
            <a key={it.href} className={`cur-sidebar-link ${active === it.href ? 'active' : ''}`}>
              <I size={20} sw={2} />{it.label}
            </a>
          );
        })}
      </nav>
      <div className="cur-sidebar-foot">
        <button><Icons.Logout size={20} sw={2} />Sign Out</button>
      </div>
    </aside>
  );
};

const CurStat = ({ label, value, meta, color = 'primary', icon: IconKey, valueColor }) => {
  const I = Icons[IconKey];
  const colorMap = {
    primary: { border: 'var(--c-primary)', tileBg: 'var(--c-primary-10)', tileFg: 'var(--c-primary)' },
    emerald: { border: 'var(--c-emerald)', tileBg: 'var(--c-emerald-10)', tileFg: 'var(--c-emerald)' },
    amber:   { border: 'var(--c-amber)',   tileBg: 'var(--c-amber-10)',   tileFg: 'var(--c-amber)' },
    blue:    { border: 'var(--c-blue)',    tileBg: 'var(--c-blue-10)',    tileFg: 'var(--c-blue)' },
    red:     { border: 'var(--c-red)',     tileBg: 'var(--c-red-10)',     tileFg: 'var(--c-red)' },
  }[color];
  return (
    <div className="cur-stat" style={{ borderLeftColor: colorMap.border }}>
      <div className="tile" style={{ background: colorMap.tileBg, color: colorMap.tileFg }}>
        <I size={22} sw={2} />
      </div>
      <div style={{ flex: 1 }}>
        <p className="label">{label}</p>
        <p className="value" style={{ color: valueColor || 'inherit' }}>{value}</p>
        <p className="meta">{meta}</p>
      </div>
    </div>
  );
};

const CurBadge = ({ variant = 'default', children, icon: IconKey }) => {
  const I = IconKey ? Icons[IconKey] : null;
  return (
    <span className={`cur-badge cur-badge-${variant}`}>
      {I && <I size={12} sw={2} />}{children}
    </span>
  );
};

/* ---------- Dashboard ---------- */
const CurDashboard = () => (
  <div className="cur frame" data-screen-label="Current · Dashboard">
    <CurrentSidebar active="/dashboard" />
    <div className="cur-main">
      <header className="cur-pageheader">
        <h1>Production &amp; Sales Overview</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-muted)' }}>YEAR</span>
            <div className="cur-select">2026 <Icons.Chevron size={14} sw={2} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-muted)' }}>QUARTER</span>
            <div className="cur-select">Q1 (Jan-Mar) <Icons.Chevron size={14} sw={2} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-muted)' }}>MONTH</span>
            <div className="cur-select">March <Icons.Chevron size={14} sw={2} /></div>
          </div>
          <button className="cur-btn cur-btn-outline"><Icons.Banknote size={16} sw={2} />Collect Payment</button>
          <button className="cur-btn cur-btn-primary"><Icons.Plus size={16} sw={2} />Record Sale</button>
        </div>
      </header>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <CurStat icon="Rupee"       color="primary" label="Total Billings (Revenue)" value="Rs 17,075.00" meta="6 invoice billings logged" valueColor="var(--c-primary)" />
          <CurStat icon="CheckCircle" color="emerald" label="Total Paid Amount"        value="Rs 12,000.00" meta="0 separate cash log entries" valueColor="#059669" />
          <CurStat icon="Alert"       color="red"     label="Outstanding Balance Due"  value="Rs 5,075.00"  meta="2 partners have pending due credits" valueColor="#dc2626" />
          <CurStat icon="TrendUp"     color="primary" label="Net Profit Margin"        value="71.9%"        meta="Est. Profit: Rs 12,280.93" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, flex: 1 }}>
          {/* Revenue chart */}
          <div className="cur-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="cur-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }}>
              <h3 className="cur-card-title">Revenue vs Cash Collection Performance</h3>
              <button className="cur-btn cur-btn-outline" style={{ fontSize: 13, padding: '6px 12px' }}>Baking Ledger</button>
            </div>
            <div className="cur-card-body" style={{ flex: 1, paddingTop: 8 }}>
              {/* Bar chart mock */}
              <svg viewBox="0 0 600 300" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                <g stroke="oklch(0.9 0.02 145)" strokeDasharray="3 3">
                  <line x1="50" y1="20" x2="580" y2="20" />
                  <line x1="50" y1="80" x2="580" y2="80" />
                  <line x1="50" y1="140" x2="580" y2="140" />
                  <line x1="50" y1="200" x2="580" y2="200" />
                  <line x1="50" y1="260" x2="580" y2="260" />
                </g>
                <g fontSize="11" fill="oklch(0.45 0.02 145)" fontFamily="Geist, Inter">
                  <text x="40" y="24" textAnchor="end">Rs 8k</text>
                  <text x="40" y="84" textAnchor="end">Rs 6k</text>
                  <text x="40" y="144" textAnchor="end">Rs 4k</text>
                  <text x="40" y="204" textAnchor="end">Rs 2k</text>
                  <text x="40" y="264" textAnchor="end">Rs 0</text>
                </g>
                {/* Bars: Jan, Feb, Mar  — revenue + collected */}
                {[
                  { x: 110, rev: 5200, col: 4800 },
                  { x: 280, rev: 4800, col: 4200 },
                  { x: 450, rev: 7075, col: 3000 },
                ].map((m, i) => {
                  const max = 8000;
                  const baseY = 260;
                  const revH = (m.rev / max) * 240;
                  const colH = (m.col / max) * 240;
                  return (
                    <g key={i}>
                      <rect x={m.x} y={baseY - revH} width="56" height={revH} fill="oklch(0.55 0.15 145)" rx="4" />
                      <rect x={m.x + 64} y={baseY - colH} width="56" height={colH} fill="oklch(0.75 0.15 85)" rx="4" />
                    </g>
                  );
                })}
                {/* x axis labels */}
                <g fontSize="11" fill="oklch(0.45 0.02 145)" fontFamily="Geist, Inter" textAnchor="middle">
                  <text x="170" y="282">Jan</text>
                  <text x="340" y="282">Feb</text>
                  <text x="510" y="282">Mar</text>
                </g>
                {/* legend */}
                <g fontSize="11" fontFamily="Geist, Inter">
                  <rect x="220" y="295" width="10" height="10" fill="oklch(0.55 0.15 145)" rx="2" />
                  <text x="236" y="304" fill="oklch(0.2 0.02 145)">Revenue</text>
                  <rect x="310" y="295" width="10" height="10" fill="oklch(0.75 0.15 85)" rx="2" />
                  <text x="326" y="304" fill="oklch(0.2 0.02 145)">Collected</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Pie chart */}
          <div className="cur-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="cur-card-header" style={{ paddingBottom: 16 }}>
              <h3 className="cur-card-title">Product Shares (Revenues)</h3>
            </div>
            <div className="cur-card-body" style={{ flex: 1, paddingTop: 8, display: 'grid', placeItems: 'center' }}>
              <svg viewBox="0 0 240 240" style={{ width: '100%', maxHeight: '100%' }}>
                {/* donut with labels */}
                {(() => {
                  const segs = [
                    { name: 'Cookies', value: 8500, color: 'oklch(0.55 0.15 145)' },
                    { name: 'Bread',   value: 4200, color: 'oklch(0.65 0.12 160)' },
                    { name: 'Cakes',   value: 2800, color: 'oklch(0.75 0.15 85)' },
                    { name: 'Pastries',value: 1575, color: 'oklch(0.6 0.18 30)' },
                  ];
                  const total = segs.reduce((s, x) => s + x.value, 0);
                  let acc = 0;
                  return segs.map((s) => {
                    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
                    acc += s.value;
                    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
                    const large = end - start > Math.PI ? 1 : 0;
                    const r1 = 90, r2 = 56, cx = 120, cy = 120;
                    const x1 = cx + r1 * Math.cos(start), y1 = cy + r1 * Math.sin(start);
                    const x2 = cx + r1 * Math.cos(end),   y2 = cy + r1 * Math.sin(end);
                    const x3 = cx + r2 * Math.cos(end),   y3 = cy + r2 * Math.sin(end);
                    const x4 = cx + r2 * Math.cos(start), y4 = cy + r2 * Math.sin(start);
                    const d = `M${x1},${y1} A${r1},${r1} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 ${large} 0 ${x4},${y4} Z`;
                    // label placement at midpoint
                    const mid = (start + end) / 2;
                    const lx = cx + 110 * Math.cos(mid);
                    const ly = cy + 110 * Math.sin(mid);
                    const pct = ((s.value / total) * 100).toFixed(0);
                    return (
                      <g key={s.name}>
                        <path d={d} fill={s.color} />
                        <text x={lx} y={ly} fontSize="9" fontFamily="Geist, Inter" fill="oklch(0.2 0.02 145)"
                              textAnchor={Math.cos(mid) > 0 ? 'start' : 'end'}>
                          {s.name} {pct}%
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', fontSize: 11, marginTop: 4 }}>
                {[
                  ['Cookies', 'oklch(0.55 0.15 145)'],
                  ['Bread', 'oklch(0.65 0.12 160)'],
                  ['Cakes', 'oklch(0.75 0.15 85)'],
                  ['Pastries', 'oklch(0.6 0.18 30)'],
                ].map(([n, c]) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, background: c, borderRadius: 2 }}></span>{n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ---------- Batches ---------- */
const CurBatches = () => {
  const rows = [
    { n: 'BATCH-018', p: 'Wheat Chapati',     q: '120 packs', d: 'May 27, 2026', s: 'completed', notes: 'Pressed Tuesday morning' },
    { n: 'BATCH-017', p: 'Mango Pickle',      q: '40 jars',   d: 'May 26, 2026', s: 'in_progress', notes: 'Awaiting cloth tying' },
    { n: 'BATCH-016', p: 'Red Chilli Powder', q: '25 kg',     d: 'May 25, 2026', s: 'pending', notes: '-' },
    { n: 'BATCH-015', p: 'Roasted Makhana',   q: '60 packs',  d: 'May 24, 2026', s: 'completed', notes: '-' },
    { n: 'BATCH-014', p: 'Wheat Chapati',     q: '90 packs',  d: 'May 21, 2026', s: 'cancelled', notes: 'Tava cracked, retry' },
  ];
  const statusCfg = {
    pending:     { v: 'secondary',   i: 'Clock',       l: 'Pending' },
    in_progress: { v: 'default',     i: 'Loader',      l: 'In Progress' },
    completed:   { v: 'outline',     i: 'CheckCircle', l: 'Completed' },
    cancelled:   { v: 'destructive', i: 'X',           l: 'Cancelled' },
  };
  return (
    <div className="cur frame" data-screen-label="Current · Batches">
      <CurrentSidebar active="/dashboard/batches" />
      <div className="cur-main">
        <header className="cur-pageheader">
          <div>
            <h1>Batch Tracker</h1>
            <div className="sub">Manage production batches and products</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="cur-btn cur-btn-primary"><Icons.Plus size={16} />Add Product</button>
            <button className="cur-btn cur-btn-primary"><Icons.Plus size={16} />Add Batch</button>
          </div>
        </header>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <CurStat icon="Package"     color="primary" label="Total Batches" value="5" meta="" />
            <CurStat icon="Clock"       color="amber"   label="Pending"       value="1" meta="" />
            <CurStat icon="Loader"      color="blue"    label="In Progress"   value="1" meta="" />
            <CurStat icon="CheckCircle" color="emerald" label="Completed"     value="2" meta="" />
          </div>

          <div className="cur-card">
            <div className="cur-card-header"><h3 className="cur-card-title">Production Batches</h3></div>
            <table className="cur-table">
              <thead><tr>
                <th>Batch Number</th><th>Product</th><th>Quantity</th><th>Production Date</th><th>Status</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const c = statusCfg[r.s];
                  return (
                    <tr key={r.n}>
                      <td style={{ fontWeight: 500 }}>{r.n}</td>
                      <td>{r.p}</td>
                      <td>{r.q}</td>
                      <td>{r.d}</td>
                      <td><CurBadge variant={c.v} icon={c.i}>{c.l}</CurBadge></td>
                      <td style={{ color: 'var(--c-muted)' }}>{r.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Sales ---------- */
const CurSales = () => {
  const rows = [
    { n: 'INV-2026-006', p: 'Modi Kirana',         d: 'May 26, 2026', due: 'Jun 5, 2026',  tot: 4500, paid: 0,    s: 'pending' },
    { n: 'INV-2026-005', p: "Anand's General",     d: 'May 22, 2026', due: 'Jun 1, 2026',  tot: 3200, paid: 1500, s: 'partial' },
    { n: 'INV-2026-004', p: 'Sangameshwar Mart',   d: 'May 18, 2026', due: 'May 28, 2026', tot: 2575, paid: 2575, s: 'paid' },
    { n: 'INV-2026-003', p: 'Brindavan Provisions',d: 'May 14, 2026', due: 'May 24, 2026', tot: 1800, paid: 0,    s: 'overdue' },
    { n: 'INV-2026-002', p: 'Kalaburagi Fresh',    d: 'May 09, 2026', due: 'May 19, 2026', tot: 3000, paid: 3000, s: 'paid' },
    { n: 'INV-2026-001', p: 'Yadulla Kirana',      d: 'May 02, 2026', due: 'May 12, 2026', tot: 2000, paid: 2000, s: 'paid' },
  ];
  const cfg = {
    pending: { v: 'secondary',   i: 'Clock',       l: 'Pending' },
    partial: { v: 'outline',     i: 'Alert',       l: 'Partial' },
    paid:    { v: 'default',     i: 'CheckCircle', l: 'Paid' },
    overdue: { v: 'destructive', i: 'Alert',       l: 'Overdue' },
  };
  const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="cur frame" data-screen-label="Current · Sales">
      <CurrentSidebar active="/dashboard/sales" />
      <div className="cur-main">
        <header className="cur-pageheader">
          <div>
            <h1>Sales History Logs</h1>
            <div className="sub">View all invoices and sales records</div>
          </div>
        </header>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <CurStat icon="Receipt"     color="primary" label="Total Invoices"  value="6" meta="" />
            <CurStat icon="Receipt"     color="blue"    label="Total Revenue"   value="Rs 17,075.00" meta="" />
            <CurStat icon="CheckCircle" color="emerald" label="Total Collected" value="Rs 12,000.00" meta="" valueColor="#059669" />
            <CurStat icon="CheckCircle" color="amber"   label="Paid Invoices"   value="3" meta="" />
          </div>
          <div className="cur-card">
            <div className="cur-card-header"><h3 className="cur-card-title">Invoice History</h3></div>
            <table className="cur-table">
              <thead><tr>
                <th>Invoice #</th><th>Partner</th><th>Date</th><th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const c = cfg[r.s];
                  const bal = r.tot - r.paid;
                  return (
                    <tr key={r.n}>
                      <td style={{ fontWeight: 500 }}>{r.n}</td>
                      <td>{r.p}</td>
                      <td>{r.d}</td>
                      <td>{r.due}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>Rs {fmt(r.tot)}</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>Rs {fmt(r.paid)}</td>
                      <td style={{ textAlign: 'right', color: bal > 0 ? '#dc2626' : 'inherit' }}>Rs {fmt(bal)}</td>
                      <td><CurBadge variant={c.v} icon={c.i}>{c.l}</CurBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Partners ---------- */
const CurPartners = () => {
  const rows = [
    { name: "Anand's General Store", phone: '+91 98452 11034', email: 'anand@store.in',     addr: 'Super Market Rd, Kalaburagi', added: 'Jan 12, 2026' },
    { name: 'Brindavan Provisions',  phone: '+91 90875 23311', email: '-',                  addr: 'Court Rd, Kalaburagi',         added: 'Feb 04, 2026' },
    { name: 'Kalaburagi Fresh',      phone: '+91 84315 51234', email: 'fresh@kalbg.in',     addr: 'Aiwan Mart, Kalaburagi',       added: 'Feb 20, 2026' },
    { name: 'Modi Kirana',           phone: '-',               email: '-',                  addr: 'Yadulla Colony',               added: 'Mar 08, 2026' },
    { name: 'Sangameshwar Mart',     phone: '+91 95904 12200', email: 'sm.mart@gmail.com',  addr: 'Jewargi Rd, Kalaburagi',       added: 'Mar 22, 2026' },
    { name: 'Yadulla Kirana',        phone: '+91 84315 51169', email: '-',                  addr: 'Yadulla Colony',               added: 'Apr 02, 2026' },
  ];
  return (
    <div className="cur frame" data-screen-label="Current · Partners">
      <CurrentSidebar active="/dashboard/partners" />
      <div className="cur-main">
        <header className="cur-pageheader">
          <div>
            <h1>Partners Directory</h1>
            <div className="sub">Manage your business partners and customers</div>
          </div>
          <button className="cur-btn cur-btn-primary"><Icons.Plus size={16} />Add Partner</button>
        </header>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <CurStat icon="Users" color="primary" label="Total Partners" value="6" />
            <CurStat icon="Phone" color="blue"    label="With Contact"   value="5" />
            <CurStat icon="Mail"  color="emerald" label="With Email"     value="3" />
          </div>
          <div className="cur-card">
            <div className="cur-card-header"><h3 className="cur-card-title">All Partners</h3></div>
            <table className="cur-table">
              <thead><tr><th>Name</th><th>Contact Number</th><th>Email</th><th>Address</th><th>Added On</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>{r.phone === '-' ? <span style={{ color: 'var(--c-muted)' }}>-</span> : <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Icons.Phone size={14} sw={2} />{r.phone}</span>}</td>
                    <td>{r.email === '-' ? <span style={{ color: 'var(--c-muted)' }}>-</span> : <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Icons.Mail size={14} sw={2} />{r.email}</span>}</td>
                    <td><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: 'var(--c-muted)' }}><Icons.Pin size={14} sw={2} />{r.addr}</span></td>
                    <td style={{ color: 'var(--c-muted)' }}>{r.added}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Credit Ledger ---------- */
const CurCredit = () => {
  const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const entries = [
    { d: 'May 26, 2026', p: 'Modi Kirana',          desc: 'INV-2026-006',         t: 'credit', amt: 4500, bal: 4500 },
    { d: 'May 24, 2026', p: "Anand's General",      desc: 'Cash · Rcpt-0034',     t: 'debit',  amt: 1500, bal: 1700 },
    { d: 'May 22, 2026', p: "Anand's General",      desc: 'INV-2026-005',         t: 'credit', amt: 3200, bal: 3200 },
    { d: 'May 18, 2026', p: 'Sangameshwar Mart',    desc: 'UPI · Rcpt-0033',      t: 'debit',  amt: 2575, bal: 0    },
    { d: 'May 14, 2026', p: 'Brindavan Provisions', desc: 'INV-2026-003',         t: 'credit', amt: 1800, bal: 1800 },
    { d: 'May 09, 2026', p: 'Kalaburagi Fresh',     desc: 'Bank · Rcpt-0032',     t: 'debit',  amt: 3000, bal: 0    },
  ];
  const balances = [
    { name: 'Modi Kirana',          contact: '-',               bal: 4500 },
    { name: "Anand's General",      contact: '+91 98452 11034', bal: 1700 },
    { name: 'Brindavan Provisions', contact: '+91 90875 23311', bal: 1800 },
  ];
  return (
    <div className="cur frame" data-screen-label="Current · Credit Ledger">
      <CurrentSidebar active="/dashboard/credit-ledger" />
      <div className="cur-main">
        <header className="cur-pageheader">
          <div>
            <h1>Credit Ledger</h1>
            <div className="sub">Track credits and debits for all partners</div>
          </div>
          <div className="cur-select" style={{ width: 192 }}>All Partners <Icons.Chevron size={14} sw={2} /></div>
        </header>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <CurStat icon="TrendUp"   color="red"     label="Total Credits (Dues)"      value="Rs 9,500.00"  valueColor="#dc2626" />
            <CurStat icon="TrendDown" color="emerald" label="Total Debits (Payments)"   value="Rs 7,075.00"  valueColor="#059669" />
            <CurStat icon="Wallet"    color="primary" label="Outstanding Balance"        value="Rs 2,425.00" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, flex: 1, overflow: 'hidden' }}>
            <div className="cur-card">
              <div className="cur-card-header"><h3 className="cur-card-title">Ledger Entries</h3></div>
              <table className="cur-table">
                <thead><tr><th>Date</th><th>Partner</th><th>Description</th><th>Type</th><th style={{ textAlign:'right' }}>Amount</th><th style={{ textAlign:'right' }}>Balance</th></tr></thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i}>
                      <td>{e.d}</td>
                      <td style={{ fontWeight: 500 }}>{e.p}</td>
                      <td style={{ color: 'var(--c-muted)' }}>{e.desc}</td>
                      <td>
                        <CurBadge variant={e.t === 'credit' ? 'destructive' : 'default'}>{e.t === 'credit' ? 'Credit' : 'Debit'}</CurBadge>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500, color: e.t === 'credit' ? '#dc2626' : '#059669' }}>
                        {e.t === 'credit' ? '+' : '-'} Rs {fmt(e.amt)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>Rs {fmt(e.bal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cur-card">
              <div className="cur-card-header"><h3 className="cur-card-title">Partner Balances</h3></div>
              <div className="cur-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {balances.map(b => (
                  <div key={b.name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: '1px solid var(--c-border)', borderRadius: 8, padding: '12px 16px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>{b.contact}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#dc2626' }}>Rs {fmt(b.bal)}</div>
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

Object.assign(window, { CurDashboard, CurBatches, CurSales, CurPartners, CurCredit });
