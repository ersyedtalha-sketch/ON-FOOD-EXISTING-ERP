// ============== Excel export (per-section + full report) ==============
// Uses SheetJS (loaded in ERP Preview.html). Reads the live store state.

const _money = (n) => Number(n || 0);

function _inventoryRows(state) {
  const rows = [['Name', 'Vendor', 'Purchased', 'Qty', 'Unit', 'Cost/unit (Rs)', 'Ship/unit (Rs)', 'Total cost (Rs)', 'Stock left']];
  state.inventory.forEach((i) => {
    rows.push([
      i.name, i.vendor || '', i.purchaseMonth || '', _money(i.qty), i.unit || '',
      _money(i.costPerUnit), _money(i.shipPerUnit),
      _money(i.qty) * (_money(i.costPerUnit) + _money(i.shipPerUnit)),
      _money(i.stockRemaining),
    ]);
  });
  return rows;
}

function _batchRows(state) {
  const rows = [['Batch', 'Product', 'Output', 'Unit', 'Raw used', 'Raw qty', 'Produced on', 'Status', 'Cost/unit (Rs)', 'Batch cost (Rs)', 'Notes']];
  state.batches.forEach((b) => {
    rows.push([
      b.n, b.p, _money(b.outputUnits || b.q), b.u || '', b.consumedName || '',
      _money(b.consumedQty), b.d || '', b.l || b.s || '',
      _money(b.costPerUnit), _money(b.cost), b.notes || '',
    ]);
  });
  return rows;
}

function _productRows(state) {
  const rows = [['Product', 'Made from', 'In stock', 'Unit', 'Cost/unit (Rs)']];
  Object.values(state.recipes || {}).forEach((p) => {
    rows.push([p.name, p.inputName || '', _money(p.producedUnits), p.outputUnit || '', _money(p.lastCostPerUnit)]);
  });
  return rows;
}

function _partnerRows(state) {
  const rows = [['Role', 'Name', 'Label', 'Phone', 'Location']];
  state.partners.forEach((p) => {
    rows.push([p.role || '', p.name || '', p.sub || '', p.phone || '', p.loc || '']);
  });
  return rows;
}

function _summaryRows(state) {
  const investment = state.inventory.reduce((s, i) => s + _money(i.qty) * (_money(i.costPerUnit) + _money(i.shipPerUnit)), 0);
  const stockValueAtCost = Object.values(state.recipes || {}).reduce((s, p) => s + _money(p.producedUnits) * _money(p.lastCostPerUnit), 0);
  const producedUnits = Object.values(state.recipes || {}).reduce((s, p) => s + _money(p.producedUnits), 0);
  const batchSpend = state.batches.reduce((s, b) => s + _money(b.cost), 0);
  const today = new Date().toLocaleString('en-GB');
  return [
    ['ON Food ERP — Summary', ''],
    ['Generated', today],
    ['', ''],
    ['Raw materials (SKUs)', state.inventory.length],
    ['Inventory investment (Rs)', Math.round(investment)],
    ['', ''],
    ['Batches produced', state.batches.length],
    ['Total spent on batches (Rs)', Math.round(batchSpend)],
    ['Finished products', Object.keys(state.recipes || {}).length],
    ['Total units produced', producedUnits],
    ['Stock value at cost (Rs)', Math.round(stockValueAtCost)],
    ['', ''],
    ['Partners', state.partners.length],
    ['', ''],
    ['Note', 'Sales / profit totals appear here once invoices are saved to the database (next step).'],
  ];
}

function _autoWidth(rows) {
  const widths = [];
  rows.forEach((r) => r.forEach((c, idx) => {
    const len = String(c == null ? '' : c).length;
    widths[idx] = Math.max(widths[idx] || 10, Math.min(len + 2, 48));
  }));
  return widths.map((w) => ({ wch: w }));
}

function _sheet(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = _autoWidth(rows);
  return ws;
}

window.ERPExport = {
  full(state) {
    if (typeof XLSX === 'undefined') { alert('Export library still loading — try again in a second.'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, _sheet(_summaryRows(state)), 'Summary');
    XLSX.utils.book_append_sheet(wb, _sheet(_inventoryRows(state)), 'Inventory');
    XLSX.utils.book_append_sheet(wb, _sheet(_batchRows(state)), 'Batches');
    XLSX.utils.book_append_sheet(wb, _sheet(_productRows(state)), 'Products');
    XLSX.utils.book_append_sheet(wb, _sheet(_partnerRows(state)), 'Partners');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ONFood-ERP-${stamp}.xlsx`);
  },
  section(state, which) {
    if (typeof XLSX === 'undefined') { alert('Export library still loading — try again in a second.'); return; }
    const map = {
      inventory: ['Inventory', _inventoryRows(state)],
      batches:   ['Batches', _batchRows(state)],
      products:  ['Products', _productRows(state)],
      partners:  ['Partners', _partnerRows(state)],
    };
    const entry = map[which];
    if (!entry) return this.full(state);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, _sheet(entry[1]), entry[0]);
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ONFood-${entry[0]}-${stamp}.xlsx`);
  },
};
