// ============== Critique notes — small markdown-ish summaries per screen ==============

const CritiqueCard = ({ title, kind = 'changes', items }) => (
  <div style={{
    width: 280, padding: 18,
    background: 'white',
    border: '1px solid #e7e5e4',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  }}>
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      background: kind === 'changes' ? '#fef3c7' : '#dbeafe',
      color: kind === 'changes' ? '#92400e' : '#1e40af',
      marginBottom: 10,
    }}>
      {kind === 'changes' ? 'What changed' : 'Notes'}
    </div>
    <h4 style={{
      margin: '0 0 12px', font: '600 14px/1.2 Inter, sans-serif',
      letterSpacing: '-0.01em', color: '#1c1917',
    }}>{title}</h4>
    <ul style={{
      margin: 0, padding: 0, listStyle: 'none',
      font: '400 12.5px/1.5 Inter, sans-serif', color: '#44403c',
    }}>
      {items.map((it, i) => (
        <li key={i} style={{
          padding: '8px 0',
          borderTop: i === 0 ? 'none' : '1px solid #f1f0ee',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{
            flex: '0 0 auto', width: 4, height: 4, borderRadius: '50%',
            background: '#1f6f4a', marginTop: 7,
          }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);

const critiques = {
  shell: {
    title: 'Shell · sidebar & header',
    items: [
      'Sidebar dropped from dark forest-green to a neutral white panel — the original looks like a consumer-app theme bleeding into an internal tool.',
      'Leaf logo + "Organic / NUTRITIOUS FOOD" replaced with a compact brand mark + "Kalaburagi · ERP" so the chrome reads as a back-office, not a storefront.',
      'Nav grouped into Operate / Accounts; counts pulled into the rail so the sidebar earns its width.',
      'Page header standardised: small crumb · title · subtitle · right-aligned actions. Every screen now follows it.',
    ],
  },
  dashboard: {
    title: 'Dashboard',
    items: [
      'Stat cards stripped of icon tiles and coloured left-borders — the number is the point. One row, four equal cells, all in tabular figures.',
      'Selects with shouty "YEAR / QUARTER / MONTH" labels collapsed to a single FY · Q1 filter pill. Quarter implies its months.',
      'Pie chart with overlapping labels swapped for a horizontal bar list — same data, readable in a glance, no legend hunt.',
      'Profit margin keeps a delta vs last quarter; the original number sits alone with no comparison.',
      '"Baking Ledger" button on the chart card removed — it links to nothing in the codebase.',
    ],
  },
  batches: {
    title: 'Batches',
    items: [
      'Four icon-tile status cards replaced with a tab bar over the table — same counts, a fraction of the height, and clicking actually filters.',
      'Two primary buttons in the header ("Add Product" + "Add Batch") split into one secondary ("Products") and one primary ("New batch"). Pick the action, don\'t list them.',
      'Batch numbers set in mono and abbreviated (B-018 vs BATCH-018) so the column is scannable.',
      'Products section turned into a real table with price, stock and last-batch — the original card grid only showed name + price.',
    ],
  },
  sales: {
    title: 'Sales',
    items: [
      'Two of the four current stats ("Total Invoices: 6", "Paid Invoices: 3") replaced with Overdue and Avg DSO — what a founder actually checks first.',
      'Currency formatting unified: ₹ symbol, no decimals on whole rupees, tabular figures so columns line up.',
      'Each invoice row gets an inline % collected bar — paid / partial / overdue is visible without reading the status pill.',
      'Header gains tabs (All · Open · Overdue · Paid) and a footer totals strip. The current screen has neither.',
    ],
  },
  partners: {
    title: 'Partners',
    items: [
      'Three "How many have a phone / email" stat cards removed — they\'re directory metadata, not metrics. Moved into the subtitle.',
      'Table gains the two columns a partners directory actually needs: Sales this quarter and Outstanding balance. Otherwise this is just a CSV view.',
      'Each row gets an avatar bubble + partner type chip (Retail / Wholesale) so the eye groups customers quickly.',
      'Search and Export pulled into the header so the page works at 60+ partners, not just 6.',
    ],
  },
  credit: {
    title: 'Credit ledger',
    items: [
      'TrendUp icon coloured red for "credits / dues" in the original is genuinely confusing — up-arrow reads as good. Removed all directional icons from this screen.',
      'Amount column split into Sale / Payment so positives and negatives sit in their own lanes — no +/- prefix gymnastics.',
      'Outstanding panel turned actionable: each row has a Record-payment button and a one-tap call. Currently it\'s read-only.',
      '"Oldest open" stat added — the number a credit-collector chases. The original surfaces totals only.',
    ],
  },
};

window.CritiqueCard = CritiqueCard;
window.critiques = critiques;
