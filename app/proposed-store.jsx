// ============== Shared app store (inventory + batches + recipes) ==============
// Lives in a React context so every screen sees the same data.
// Edits in Products flow to Batches (recipe lookup); batch creation deducts inventory.

const initialRecipes = {
  juwar_chapati: {
    id: 'juwar_chapati',
    name: 'Juwar Chapati',
    sku: 'JC-30',
    packSize: { qty: 30, unit: 'chapatis' },
    inputUnit: 'kg',
    inputName: 'Juwar Grain',
    yieldPerInput: 25,
    salePrice: 180,
    inputSteps: [
      { id: 'raw',  label: 'Raw juwar grain',          vendor: 'Bhalki Mandi',         cost: 25.00, kind: 'raw' },
      { id: 't1',   label: 'Transport — to grinder',   vendor: 'Local tempo',          cost:  2.00, kind: 'transport' },
      { id: 'grd',  label: 'Grinding (outsourced)',    vendor: 'Sangam Flour Mill',    cost:  6.00, kind: 'process' },
      { id: 't2',   label: 'Transport — grinder to WH',vendor: 'Local tempo',          cost:  0.50, kind: 'transport' },
    ],
    packCosts: [
      { id: 'lab', label: 'Labour (rolling, pressing)', cost: 4.00 },
      { id: 'pkg', label: 'Packaging (cloth, label)',   cost: 3.50 },
      { id: 'mch', label: 'Machinery + electricity',    cost: 1.50 },
    ],
  },
  wheat_chapati: {
    id: 'wheat_chapati',
    name: 'Wheat Chapati',
    sku: 'WC-30',
    packSize: { qty: 30, unit: 'chapatis' },
    inputUnit: 'kg',
    inputName: 'Wheat Grain',
    yieldPerInput: 25,
    salePrice: 170,
    inputSteps: [
      { id: 'raw',  label: 'Raw wheat grain',          vendor: 'Local mandi',          cost: 28.00, kind: 'raw' },
      { id: 't1',   label: 'Transport — to grinder',   vendor: 'Local tempo',          cost:  2.00, kind: 'transport' },
      { id: 'grd',  label: 'Grinding (outsourced)',    vendor: 'Sangam Flour Mill',    cost:  6.00, kind: 'process' },
      { id: 't2',   label: 'Transport — grinder to WH',vendor: 'Local tempo',          cost:  0.50, kind: 'transport' },
    ],
    packCosts: [
      { id: 'lab', label: 'Labour (rolling, pressing)', cost: 4.00 },
      { id: 'pkg', label: 'Packaging (cloth, label)',   cost: 3.50 },
      { id: 'mch', label: 'Machinery + electricity',    cost: 1.50 },
    ],
  },
  bajra_chapati: {
    id: 'bajra_chapati',
    name: 'Bajra Chapati',
    sku: 'BC-30',
    packSize: { qty: 30, unit: 'chapatis' },
    inputUnit: 'kg',
    inputName: 'Bajra Grain',
    yieldPerInput: 24,
    salePrice: 190,
    inputSteps: [
      { id: 'raw',  label: 'Raw bajra grain',          vendor: 'Local mandi',          cost: 30.00, kind: 'raw' },
      { id: 't1',   label: 'Transport — to grinder',   vendor: 'Local tempo',          cost:  2.00, kind: 'transport' },
      { id: 'grd',  label: 'Grinding (outsourced)',    vendor: 'Sangam Flour Mill',    cost:  6.00, kind: 'process' },
      { id: 't2',   label: 'Transport — grinder to WH',vendor: 'Local tempo',          cost:  0.50, kind: 'transport' },
    ],
    packCosts: [
      { id: 'lab', label: 'Labour (rolling, pressing)', cost: 4.00 },
      { id: 'pkg', label: 'Packaging (cloth, label)',   cost: 3.50 },
      { id: 'mch', label: 'Machinery + electricity',    cost: 1.50 },
    ],
  },
  roasted_makhana: {
    id: 'roasted_makhana',
    name: 'Roasted Makhana',
    sku: 'RM-500',
    packSize: { qty: 1, unit: 'pack (500 g)' },
    inputUnit: 'kg',
    inputName: 'Makhana',
    yieldPerInput: 2,        // 1 kg raw makhana → 2 packs of 500 g
    salePrice: 380,
    inputSteps: [
      { id: 'raw', label: 'Raw makhana', vendor: 'Bihar Makhana Co.', cost: 600.00, kind: 'raw' },
      { id: 'oil', label: 'Ghee + salt',  vendor: 'Pantry',           cost:  40.00, kind: 'raw' },
    ],
    packCosts: [
      { id: 'rst', label: 'Roasting (gas + labour)', cost: 20.00 },
      { id: 'pkg', label: 'Foil pouch + label',      cost:  8.00 },
    ],
  },
  mango_pickle: {
    id: 'mango_pickle',
    name: 'Mango Pickle',
    sku: 'MP-250',
    packSize: { qty: 1, unit: 'jar (250 g)' },
    inputUnit: 'kg',
    inputName: 'Raw Mango',
    yieldPerInput: 5,
    salePrice: 220,
    inputSteps: [
      { id: 'raw', label: 'Raw mango',          vendor: 'Local Mango Orchard', cost: 60.00, kind: 'raw' },
      { id: 'oil', label: 'Mustard oil + spices', vendor: 'Pantry',             cost: 40.00, kind: 'raw' },
    ],
    packCosts: [
      { id: 'lab', label: 'Cutting, salting, cloth-tying', cost: 15.00 },
      { id: 'jar', label: 'Glass jar + lid',               cost: 22.00 },
    ],
  },
  red_chilli: {
    id: 'red_chilli',
    name: 'Red Chilli Powder',
    sku: 'RC-1',
    packSize: { qty: 1, unit: 'kg' },
    inputUnit: 'kg',
    inputName: 'Dried Red Chilli',
    yieldPerInput: 0.85,
    salePrice: 420,
    inputSteps: [
      { id: 'raw', label: 'Dried red chilli (Byadgi)', vendor: 'Byadgi Spice Market', cost: 280.00, kind: 'raw' },
      { id: 't1',  label: 'Transport — to stone mill', vendor: 'Local tempo',         cost:   5.00, kind: 'transport' },
      { id: 'grd', label: 'Stone grinding',             vendor: 'Byadgi Stone Mill',   cost:  20.00, kind: 'process' },
    ],
    packCosts: [
      { id: 'lab', label: 'Sieving + packing',  cost: 12.00 },
      { id: 'pkg', label: 'Pouch + label',      cost:  8.00 },
    ],
  },
};

const initialInventory = [
  {
    id: 'inv-001',
    name: 'Juwar Grain',
    vendor: 'Bhalki Mandi',
    vendorId: 's1',
    qty: 100,
    unit: 'kg',
    costPerUnit: 25,
    shipPerUnit: 2,
    stockRemaining: 100,
    addedDate: '20 May 2026',
    purchaseMonth: '2026-05',
  },
];

const initialPartners = [
  // Suppliers — provide raw materials
  { id: 's1', role: 'Supplier',   name: 'Bhalki Mandi',         sub: 'Juwar grain',        phone: '+91 99452 88110', loc: 'Bhalki, Bidar',          volume: 15000, bal:    0, inits: 'BM' },
  { id: 's2', role: 'Supplier',   name: 'Byadgi Spice Market',  sub: 'Red chilli',         phone: '+91 99012 33445', loc: 'Byadgi, Haveri',         volume:  8400, bal: 2000, inits: 'BS' },
  { id: 's3', role: 'Supplier',   name: 'Local Mango Orchard',  sub: 'Raw mango',          phone: '+91 98441 22311', loc: 'Kalaburagi outskirts',   volume:  4200, bal:    0, inits: 'LM' },
  { id: 's4', role: 'Supplier',   name: 'Bihar Makhana Co.',    sub: 'Raw makhana',        phone: '+91 90415 67788', loc: 'Darbhanga, Bihar',       volume: 12000, bal: 5000, inits: 'MK' },
  // Grinders — outsourced processing
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

const initialAppState = {
  inventory: initialInventory,
  partners: initialPartners,
  batches: [],          // empty — user adds batches
  recipes: {},          // empty — products are created when batches are produced
  // counter for auto-generated batch numbers if user wants
  batchSeq: 14,
};

const AppStateContext = React.createContext(null);

// Rebuild the finished-products catalog from the batch list.
// Preserves any user-set salePrice on existing product entries.
function recomputeProducts(batches, prevRecipes) {
  const byName = {};
  // keep prior sale prices keyed by product name
  const priorPrice = {};
  Object.values(prevRecipes || {}).forEach((r) => { priorPrice[r.name] = r.salePrice || 0; });

  // iterate oldest→newest so ids are stable-ish and costs reflect latest batch
  [...batches].reverse().forEach((b) => {
    const name = b.p;
    if (!byName[name]) {
      byName[name] = {
        id: 'product_' + name.replace(/\W+/g, '_').toLowerCase(),
        name,
        sku: 'RTS',
        inputName: b.consumedName,
        outputUnit: b.u || 'products',
        producedUnits: 0,
        lastCostPerUnit: 0,
        salePrice: priorPrice[name] || 0,
      };
    }
    const p = byName[name];
    p.outputUnit = b.u || p.outputUnit;
    p.inputName = b.consumedName || p.inputName;
    if (b.s !== 'cancelled') p.producedUnits += (b.outputUnits || 0);
    if (b.costPerUnit) p.lastCostPerUnit = b.costPerUnit;
  });

  const out = {};
  Object.values(byName).forEach((p) => { out[p.id] = p; });
  return out;
}

// ============================================================
// Supabase persistence layer
// When window.supabaseClient exists (set in ERP Preview.html), the store
// loads from and saves to the real database. Otherwise it stays in-memory
// (used by the static design-review canvas).
// ============================================================
const SB = () => (typeof window !== 'undefined' ? window.supabaseClient : null);

const _inits = (name) => (name || '?').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const _statusLabel = { pending: 'Pending', progress: 'In progress', paid: 'Completed', cancelled: 'Cancelled' };

const rowToPartner = (r) => ({
  id: r.id, role: r.role, name: r.name, sub: r.sub || '', phone: r.phone || null,
  loc: r.location || '', gstin: r.gstin || null, state: r.state || 'Karnataka',
  volume: 0, bal: 0, inits: _inits(r.name),
});
const partnerToRow = (p) => ({ role: p.role, name: p.name, sub: p.sub || null, phone: p.phone || null, location: p.loc || null, gstin: p.gstin || null, state: p.state || 'Karnataka' });

const rowToInv = (r) => ({
  id: r.id, name: r.name, vendor: r.vendor || '', vendorId: r.vendor_id || null,
  qty: Number(r.qty), unit: r.unit || 'kg', costPerUnit: Number(r.cost_per_unit), shipPerUnit: Number(r.ship_per_unit),
  stockRemaining: Number(r.stock_remaining), purchaseMonth: r.purchase_month || '',
  addedDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
});
const invToRow = (i) => ({
  name: i.name, vendor: i.vendor || null, qty: Number(i.qty) || 0, unit: i.unit || 'kg',
  cost_per_unit: Number(i.costPerUnit) || 0, ship_per_unit: Number(i.shipPerUnit) || 0,
  stock_remaining: Number(i.qty) || 0, purchase_month: i.purchaseMonth || null,
});

const rowToBatch = (r) => ({
  n: r.batch_no, p: r.product_name, q: Number(r.output_units), u: r.output_unit || 'products',
  d: r.produced_on ? new Date(r.produced_on).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '',
  s: r.status, l: _statusLabel[r.status] || r.status, notes: r.notes || '',
  consumedName: r.consumed_name || '', consumedQty: Number(r.consumed_qty), consumedUnit: r.consumed_unit || 'kg',
  _invId: r.inventory_id || null, yieldPerKg: Number(r.yield_per_unit), outputUnits: Number(r.output_units),
  flourPerKg: Number(r.flour_per_unit), misc: Number(r.misc_cost), costPerUnit: Number(r.cost_per_unit), cost: Number(r.batch_cost),
});
const batchToRow = (b) => ({
  batch_no: b.n, product_name: b.p, output_units: Number(b.outputUnits) || 0, output_unit: b.u || 'products',
  consumed_name: b.consumedName || null, consumed_qty: Number(b.consumedQty) || 0, consumed_unit: b.consumedUnit || 'kg',
  inventory_id: b._invId || null, yield_per_unit: Number(b.yieldPerKg) || 0, flour_per_unit: Number(b.flourPerKg) || 0,
  misc_cost: Number(b.misc) || 0, cost_per_unit: Number(b.costPerUnit) || 0, batch_cost: Number(b.cost) || 0,
  status: b.s || 'progress', notes: b.notes || null,
});

// Pull everything from the DB and rebuild state (stock + products are derived).
async function loadAll(setState) {
  const sb = SB();
  if (!sb) return;
  const [pRes, iRes, bRes] = await Promise.all([
    sb.from('partners').select('*').order('created_at', { ascending: true }),
    sb.from('inventory').select('*').order('created_at', { ascending: false }),
    sb.from('batches').select('*').order('created_at', { ascending: false }),
  ]);
  [pRes, iRes, bRes].forEach((r) => { if (r.error) console.error('Supabase load error:', r.error.message); });
  const partners = (pRes.data || []).map(rowToPartner);
  const batches = (bRes.data || []).map(rowToBatch);
  let inventory = (iRes.data || []).map(rowToInv);
  // Derive remaining stock from batches so it's always consistent.
  inventory = inventory.map((inv) => {
    const consumed = batches.filter((b) => b._invId === inv.id && b.s !== 'cancelled').reduce((s, b) => s + b.consumedQty, 0);
    return { ...inv, stockRemaining: inv.qty - consumed };
  });
  setState((s) => ({ ...s, partners, inventory, batches, recipes: recomputeProducts(batches, s.recipes) }));
}

const reportError = (error, what) => { if (error) { console.error('Supabase ' + what + ':', error.message); alert('Could not save (' + what + '): ' + error.message); } };

const AppStateProvider = ({ children }) => {
  const hasDB = !!SB();
  const [state, setState] = React.useState(
    hasDB ? { inventory: [], partners: [], batches: [], recipes: {}, batchSeq: 14, loading: true } : initialAppState
  );

  React.useEffect(() => {
    if (hasDB) loadAll(setState).then(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  // Expose current state for the Excel exporter.
  React.useEffect(() => { if (typeof window !== 'undefined') window.__erpState = state; }, [state]);

  const actions = React.useMemo(() => {
    // ----- In-memory actions (no database — used by the review canvas) -----
    const memActions = {
    addInventory: (item) => setState((s) => ({
      ...s,
      inventory: [
        {
          ...item,
          id: 'inv-' + String(s.inventory.length + 1).padStart(3, '0'),
          stockRemaining: Number(item.qty) || 0,
          addedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        },
        ...s.inventory,
      ],
    })),
    deleteInventory: (id) => setState((s) => ({
      ...s,
      inventory: s.inventory.filter((i) => i.id !== id),
    })),
    updateRecipe: (id, patch) => setState((s) => ({
      ...s,
      recipes: { ...s.recipes, [id]: { ...s.recipes[id], ...patch } },
    })),
    addRecipe: () => {
      const id = 'product_' + Date.now();
      setState((s) => ({
        ...s,
        recipes: {
          ...s.recipes,
          [id]: {
            id, name: 'New Product', sku: 'NEW', packSize: { qty: 1, unit: 'pack' },
            inputUnit: 'kg', inputName: 'Raw Material', yieldPerInput: 1, salePrice: 0,
            inputSteps: [{ id: 'raw', label: 'Raw material', vendor: '', cost: 0, kind: 'raw' }],
            packCosts: [{ id: 'lab', label: 'Labour', cost: 0 }],
          },
        },
      }));
      return id;
    },
    createProduct: (name, inputName, costPerUnit, opts = {}) => {
      const id = 'product_' + Date.now();
      setState((s) => ({
        ...s,
        recipes: {
          ...s.recipes,
          [id]: {
            id, name: name || 'New Product', sku: 'NEW', packSize: { qty: 1, unit: opts.unit || 'kg' },
            inputUnit: 'kg', inputName: inputName || 'Raw Material', yieldPerInput: opts.yieldPerInput || 1, salePrice: opts.salePrice || 0,
            inputSteps: [
              { id: 'raw', label: 'Raw ' + (inputName || 'material'), vendor: '', cost: Number(costPerUnit) || 0, kind: 'raw' },
              ...(opts.flourPerKg ? [{ id: 'flour', label: 'Flour / grinding', vendor: '', cost: Number(opts.flourPerKg) || 0, kind: 'process' }] : []),
            ],
            packCosts: opts.misc ? [{ id: 'misc', label: 'Miscellaneous', cost: Number(opts.misc) || 0 }] : [],
          },
        },
      }));
      return id;
    },
    deleteRecipe: (id) => setState((s) => { const { [id]: _, ...rest } = s.recipes; return { ...s, recipes: rest }; }),
    addPartner: (p) => setState((s) => ({
      ...s,
      partners: [
        { id: 'pt-' + Date.now(), role: p.role, name: p.name, sub: p.sub || '', phone: p.phone || null, loc: p.loc || '', volume: 0, bal: 0, inits: _inits(p.name) },
        ...s.partners,
      ],
    })),
    deletePartner: (id) => setState((s) => ({ ...s, partners: s.partners.filter((p) => p.id !== id) })),
    addBatch: (batch, consumed) => setState((s) => {
      const stamped = { ...batch, _invId: consumed.inventoryId };
      const inventory = s.inventory.map((inv) => consumed.inventoryId === inv.id ? { ...inv, stockRemaining: inv.stockRemaining - consumed.qty } : inv);
      const batches = [stamped, ...s.batches];
      return { ...s, batches, inventory, recipes: recomputeProducts(batches, s.recipes) };
    }),
    updateBatch: (batchNo, newBatch, consumed) => setState((s) => {
      const old = s.batches.find((b) => b.n === batchNo);
      if (!old) return s;
      let inventory = s.inventory.map((inv) => inv.id === old._invId ? { ...inv, stockRemaining: inv.stockRemaining + old.consumedQty } : inv);
      inventory = inventory.map((inv) => inv.id === consumed.inventoryId ? { ...inv, stockRemaining: inv.stockRemaining - consumed.qty } : inv);
      const batches = s.batches.map((b) => (b.n === batchNo ? { ...newBatch, _invId: consumed.inventoryId } : b));
      return { ...s, batches, inventory, recipes: recomputeProducts(batches, s.recipes) };
    }),
    deleteBatch: (batchNo) => setState((s) => {
      const old = s.batches.find((b) => b.n === batchNo);
      if (!old) return s;
      const inventory = s.inventory.map((inv) => inv.id === old._invId ? { ...inv, stockRemaining: inv.stockRemaining + old.consumedQty } : inv);
      const batches = s.batches.filter((b) => b.n !== batchNo);
      return { ...s, batches, inventory, recipes: recomputeProducts(batches, s.recipes) };
    }),
    updateProduct: (id, patch) => setState((s) => ({ ...s, recipes: { ...s.recipes, [id]: { ...s.recipes[id], ...patch } } })),
    };

    if (!hasDB) return memActions;

    // ----- Database-backed actions (write to Supabase, then reload) -----
    return {
      addInventory: async (item) => { const { error } = await SB().from('inventory').insert(invToRow(item)); reportError(error, 'add inventory'); await loadAll(setState); },
      deleteInventory: async (id) => { const { error } = await SB().from('inventory').delete().eq('id', id); reportError(error, 'delete inventory'); await loadAll(setState); },
      addPartner: async (p) => { const { error } = await SB().from('partners').insert(partnerToRow(p)); reportError(error, 'add partner'); await loadAll(setState); },
      deletePartner: async (id) => { const { error } = await SB().from('partners').delete().eq('id', id); reportError(error, 'delete partner'); await loadAll(setState); },
      addBatch: async (batch, consumed) => { const { error } = await SB().from('batches').insert(batchToRow({ ...batch, _invId: consumed.inventoryId })); reportError(error, 'add batch'); await loadAll(setState); },
      updateBatch: async (batchNo, newBatch, consumed) => { const { error } = await SB().from('batches').update(batchToRow({ ...newBatch, _invId: consumed.inventoryId })).eq('batch_no', batchNo); reportError(error, 'update batch'); await loadAll(setState); },
      deleteBatch: async (batchNo) => { const { error } = await SB().from('batches').delete().eq('batch_no', batchNo); reportError(error, 'delete batch'); await loadAll(setState); },
      // Products are derived from batches in DB mode — these stay no-ops.
      updateProduct: () => {}, updateRecipe: () => {}, addRecipe: () => {}, createProduct: () => {}, deleteRecipe: () => {},
    };
  }, [hasDB]);

  return (
    <AppStateContext.Provider value={{ state, actions }}>
      {children}
    </AppStateContext.Provider>
  );
};

const useAppState = () => {
  const ctx = React.useContext(AppStateContext);
  // Fallback for contexts rendered outside a provider (e.g. the static review canvas):
  // return a read-only snapshot of the initial state with no-op actions.
  if (!ctx) {
    return {
      state: initialAppState,
      actions: {
        addInventory: () => {}, deleteInventory: () => {},
        updateRecipe: () => {}, addRecipe: () => {}, createProduct: () => {}, deleteRecipe: () => {},
        addPartner: () => {}, deletePartner: () => {}, addBatch: () => {},
        updateBatch: () => {}, deleteBatch: () => {}, updateProduct: () => {},
      },
    };
  }
  return ctx;
};

// Find inventory items that could supply a recipe's raw input (case-insensitive match on name)
const findInventoryForInput = (inventory, inputName) => {
  const needle = inputName.toLowerCase().trim();
  return inventory.filter((i) =>
    i.name.toLowerCase().includes(needle) || needle.includes(i.name.toLowerCase())
  );
};

window.AppStateProvider = AppStateProvider;
window.useAppState = useAppState;
window.findInventoryForInput = findInventoryForInput;
