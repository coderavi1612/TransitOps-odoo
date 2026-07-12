const express = require('express');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

const INK       = rgb(0.153, 0.129, 0.118);
const INK_SOFT  = rgb(0.451, 0.408, 0.376);
const INK_FAINT = rgb(0.616, 0.573, 0.537);
const PAPER     = rgb(0.984, 0.976, 0.965);
const CARD      = rgb(1, 1, 1);
const BORDER    = rgb(0.878, 0.855, 0.820);
const LINE      = rgb(0.925, 0.906, 0.875);
const ORANGE    = rgb(0.788, 0.443, 0.204);
const ORANGE_LT = rgb(0.976, 0.929, 0.867);
const GREEN     = rgb(0.220, 0.494, 0.322);
const GREEN_LT  = rgb(0.914, 0.949, 0.918);
const WHITE     = rgb(1, 1, 1);

function escapePdfText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

async function generateStrategyPdf(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width: W, height: H } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  function textW(s, f, size) { return f.widthOfTextAtSize(s, size); }

  function t(s, x, y, { f = font, size = 10, color = INK, align = 'left', tracking = 0 } = {}) {
    if (tracking) {
      let total = 0;
      for (const ch of s) total += f.widthOfTextAtSize(ch, size) + tracking;
      total -= tracking;
      let cx = x;
      if (align === 'right') cx = x - total;
      if (align === 'center') cx = x - total / 2;
      for (const ch of s) {
        page.drawText(ch, { x: cx, y, size, font: f, color });
        cx += f.widthOfTextAtSize(ch, size) + tracking;
      }
      return total;
    }
    const w = textW(s, f, size);
    let dx = x;
    if (align === 'right') dx = x - w;
    if (align === 'center') dx = x - w / 2;
    page.drawText(s, { x: dx, y, size, font: f, color });
    return w;
  }

  function roundedRectPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return [
      `M ${x + r} ${y}`,
      `L ${x + w - r} ${y}`,
      `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
      `L ${x + w} ${y + h - r}`,
      `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
      `L ${x + r} ${y + h}`,
      `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
      `L ${x} ${y + r}`,
      `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
      'Z',
    ].join(' ');
  }

  function rrect(x, y, w, h, r, { fill, stroke, lw = 1 } = {}) {
    page.drawSvgPath(roundedRectPath(x, y, w, h, r), {
      x: 0,
      y: 0,
      color: fill,
      borderColor: stroke,
      borderWidth: stroke ? lw : 0,
    });
  }

  function line(x1, y1, x2, y2, { color = BORDER, thickness = 1, dash } = {}) {
    if (!dash) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
      return;
    }
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    let d = 0;
    while (d < len) {
      const seg = Math.min(dash, len - d);
      page.drawLine({ start: { x: x1 + ux * d, y: y1 + uy * d }, end: { x: x1 + ux * (d + seg), y: y1 + uy * (d + seg) }, thickness, color });
      d += dash * 2;
    }
  }

  function money(amount, x, y, { f = fontBold, size = 10, color = INK, align = 'left' } = {}) {
    const label = 'Rs ' + amount;
    return t(label, x, y, { f, size, color, align });
  }

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

  const headerH = 110;
  page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: ORANGE });
  page.drawRectangle({ x: 0, y: H - headerH - 3, width: W, height: 3, color: rgb(0.678, 0.376, 0.161) });

  t('TransitOps', 44, H - 48, { f: fontBold, size: 22, color: WHITE });
  t('SMART TRANSPORT PLATFORM', 44, H - 65, { f: fontBold, size: 7.5, color: WHITE, tracking: 1.6 });
  t('STRATEGY REPORT', W - 44, H - 46, { f: fontBold, size: 12.5, color: WHITE, align: 'right', tracking: 0.6 });
  t(`Generated: ${data.generatedAt}`, W - 44, H - 62, { f: font, size: 9.5, color: WHITE, align: 'right' });

  let y = H - headerH - 30;

  const routeH = 52;
  rrect(40, y - routeH, W - 80, routeH, 6, { fill: CARD, stroke: BORDER, lw: 1 });
  const midY = y - routeH / 2;

  page.drawCircle({ x: 66, y: midY, size: 4.5, color: GREEN });
  t('STRATEGIC DASHBOARD', 82, midY + 4, { f: fontBold, size: 11.5, color: INK });
  t('Live data snapshot', 82, midY - 10, { f: font, size: 7.5, color: INK_FAINT });

  line(215, midY, W - 215, midY, { color: BORDER, thickness: 1, dash: 3 });
  rrect(W / 2 - 34, midY - 8, 68, 16, 3, { fill: ORANGE_LT });
  t(`${data.fleetUtilization}%`, W / 2, midY - 3.5, { f: fontBold, size: 8.5, color: ORANGE, align: 'center' });

  t('PERFORMANCE METRIC', W - 82, midY + 4, { f: fontBold, size: 11.5, color: INK, align: 'right' });
  t('Aggregation', W - 82, midY - 10, { f: font, size: 7.5, color: INK_FAINT, align: 'right' });
  page.drawCircle({ x: W - 66, y: midY, size: 4.5, color: ORANGE });

  y -= routeH + 20;

  const kpiH = 68;
  const gap = 12;
  const kpiW = (W - 80 - gap * 3) / 4;
  const kpis = [
    { label: 'FUEL EFFICIENCY', val: data.fuelEfficiency, unit: 'km/L' },
    { label: 'ACTIVE VEHICLES', val: data.activeVehicles, unit: '' },
    { label: 'COMPLETED TRIPS', val: data.completedTrips, unit: '' },
    { label: 'OPERATIONAL COST', val: `₹${Number(data.operationalCost).toLocaleString('en-IN')}`, unit: '' },
  ];
  let x = 40;
  for (const k of kpis) {
    rrect(x, y - kpiH, kpiW, kpiH, 6, { fill: CARD, stroke: BORDER, lw: 1 });
    page.drawRectangle({ x, y: y - kpiH, width: 3, height: kpiH, color: ORANGE });
    t(k.label, x + 16, y - 24, { f: fontBold, size: 7, color: INK_SOFT, tracking: 0.3 });
    const vw = t(k.val.toString(), x + 16, y - 46, { f: fontBold, size: 16, color: INK });
    if (k.unit) t(k.unit, x + 16 + vw + 4, y - 43, { f: font, size: 8.5, color: INK_FAINT });
    x += kpiW + gap;
  }

  y -= kpiH + 20;

  const colGap = 14;
  const leftW = (W - 80 - colGap) * 0.58;
  const rightW = (W - 80 - colGap) * 0.42;
  const colTop = y;
  const rowH = 25;
  const detailRows = [
    ['Available Vehicles', data.availableVehicles],
    ['Vehicles In Maintenance', data.vehiclesInMaintenance],
    ['Drivers Available', data.driversAvailable],
    ['Active Trips', data.activeTrips],
    ['Maintenance Due', data.maintenanceDue],
    ['Licenses Expiring', data.expiringLicenses],
  ];
  const leftH = 40 + rowH * detailRows.length;
  rrect(40, colTop - leftH, leftW, leftH, 6, { fill: CARD, stroke: BORDER, lw: 1 });
  t('STRATEGIC DETAILS', 40 + 18, colTop - 26, { f: fontBold, size: 9.5, color: ORANGE, tracking: 0.5 });
  line(40 + 18, colTop - 34, 40 + leftW - 18, colTop - 34, { color: LINE, thickness: 1 });

  let ry = colTop - 34 - 20;
  detailRows.forEach(([label, val], i) => {
    t(label, 40 + 18, ry, { f: font, size: 9.3, color: INK_SOFT });
    t(val.toString(), 40 + leftW - 18, ry, { f: fontBold, size: 9.3, color: INK, align: 'right' });
    if (i < detailRows.length - 1) {
      line(40 + 18, ry - 8, 40 + leftW - 18, ry - 8, { color: LINE, thickness: 0.75 });
    }
    ry -= rowH;
  });

  const rx = 40 + leftW + colGap;
  const costH = 40 + rowH * 3;
  rrect(rx, colTop - costH, rightW, costH, 6, { fill: CARD, stroke: BORDER, lw: 1 });
  t('COST SUMMARY', rx + 18, colTop - 26, { f: fontBold, size: 9.5, color: ORANGE, tracking: 0.5 });
  line(rx + 18, colTop - 34, rx + rightW - 18, colTop - 34, { color: LINE, thickness: 1 });

  let cy = colTop - 34 - 20;
  const costRows = [
    ['Fuel Cost', data.fuelCost || '3,024'],
    ['Other Charges', data.otherCharges || '500'],
  ];
  for (const [label, val] of costRows) {
    t(label, rx + 18, cy, { f: font, size: 9.3, color: INK_SOFT });
    money(val.toString(), rx + rightW - 18, cy, { f: fontBold, size: 9.3, color: INK, align: 'right' });
    line(rx + 18, cy - 8, rx + rightW - 18, cy - 8, { color: LINE, thickness: 0.75 });
    cy -= rowH;
  }
  t('Total Cost', rx + 18, cy, { f: fontBold, size: 10, color: INK });
  money((data.operationalCost || '3,524').toString(), rx + rightW - 18, cy, { f: fontBold, size: 11.5, color: ORANGE, align: 'right' });

  const statusTop = colTop - costH - 14;
  const statusH = Math.max(leftH - costH - 14, 54);
  rrect(rx, statusTop - statusH, rightW, statusH, 6, { fill: GREEN_LT, stroke: rgb(0.769, 0.878, 0.792), lw: 1 });
  const sy = statusTop - statusH / 2;
  page.drawCircle({ x: rx + 26, y: sy, size: 9, color: GREEN });
  t('COMPLETED', rx + 44, sy + 4, { f: fontBold, size: 10.5, color: GREEN });
  t('Snapshot ready for download', rx + 44, sy - 8, { f: font, size: 8, color: rgb(0.365, 0.502, 0.412) });

  const footY = 50;
  line(40, footY + 18, W - 40, footY + 18, { color: LINE, thickness: 1 });
  t('Generated automatically by TransitOps Smart Transport Platform', 40, footY, { f: font, size: 7.5, color: INK_FAINT });
  t('Page 1 of 1', W - 40, footY, { f: font, size: 7.5, color: INK_FAINT, align: 'right' });

  return pdfDoc.save();
}
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width: W, height: H } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  function textW(s, f, size) { return f.widthOfTextAtSize(s, size); }

  function t(s, x, y, { f = font, size = 10, color = INK, align = 'left', tracking = 0 } = {}) {
    if (tracking) {
      let total = 0;
      for (const ch of s) total += f.widthOfTextAtSize(ch, size) + tracking;
      total -= tracking;
      let cx = x;
      if (align === 'right') cx = x - total;
      if (align === 'center') cx = x - total / 2;
      for (const ch of s) {
        page.drawText(ch, { x: cx, y, size, font: f, color });
        cx += f.widthOfTextAtSize(ch, size) + tracking;
      }
      return total;
    }
    const w = textW(s, f, size);
    let dx = x;
    if (align === 'right') dx = x - w;
    if (align === 'center') dx = x - w / 2;
    page.drawText(s, { x: dx, y, size, font: f, color });
    return w;
  }

  function roundedRectPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return [
      `M ${x + r} ${y}`,
      `L ${x + w - r} ${y}`,
      `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
      `L ${x + w} ${y + h - r}`,
      `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
      `L ${x + r} ${y + h}`,
      `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
      `L ${x} ${y + r}`,
      `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
      'Z',
    ].join(' ');
  }

  function rrect(x, y, w, h, r, { fill, stroke, lw = 1 } = {}) {
    page.drawSvgPath(roundedRectPath(x, y, w, h, r), {
      x: 0,
      y: 0,
      color: fill,
      borderColor: stroke,
      borderWidth: stroke ? lw : 0,
    });
  }

  function line(x1, y1, x2, y2, { color = BORDER, thickness = 1, dash } = {}) {
    if (!dash) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
      return;
    }
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    let d = 0;
    while (d < len) {
      const seg = Math.min(dash, len - d);
      page.drawLine({ start: { x: x1 + ux * d, y: y1 + uy * d }, end: { x: x1 + ux * (d + seg), y: y1 + uy * (d + seg) }, thickness, color });
      d += dash * 2;
    }
  }

  function money(amount, x, y, { f = fontBold, size = 10, color = INK, align = 'left' } = {}) {
    const label = 'Rs ' + amount;
    return t(label, x, y, { f, size, color, align });
  }

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

  const headerH = 110;
  page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: ORANGE });
  page.drawRectangle({ x: 0, y: H - headerH - 3, width: W, height: 3, color: rgb(0.678, 0.376, 0.161) });

  t('TransitOps', 44, H - 48, { f: fontBold, size: 22, color: WHITE });
  t('SMART TRANSPORT PLATFORM', 44, H - 65, { f: fontBold, size: 7.5, color: WHITE, tracking: 1.6 });
  t('TRIP COMPLETION REPORT', W - 44, H - 46, { f: fontBold, size: 12.5, color: WHITE, align: 'right', tracking: 0.6 });
  t(`Trip ID: ${tripData.name || 'TRP-0001'}`, W - 44, H - 62, { f: font, size: 9.5, color: WHITE, align: 'right' });
  t(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, W - 44, H - 75, { f: font, size: 8.5, color: WHITE, align: 'right' });

  let y = H - headerH - 30;

  const routeH = 52;
  rrect(40, y - routeH, W - 80, routeH, 6, { fill: CARD, stroke: BORDER, lw: 1 });
  const midY = y - routeH / 2;

  page.drawCircle({ x: 66, y: midY, size: 4.5, color: GREEN });
  t((tripData.source || 'ORIGIN').toUpperCase(), 82, midY + 4, { f: fontBold, size: 11.5, color: INK });
  t('Origin', 82, midY - 10, { f: font, size: 7.5, color: INK_FAINT });

  line(215, midY, W - 215, midY, { color: BORDER, thickness: 1, dash: 3 });
  rrect(W / 2 - 34, midY - 8, 68, 16, 3, { fill: ORANGE_LT });
  t(`${tripData.actual_distance || 0} KM`, W / 2, midY - 3.5, { f: fontBold, size: 8.5, color: ORANGE, align: 'center' });

  t((tripData.destination || 'DESTINATION').toUpperCase(), W - 82, midY + 4, { f: fontBold, size: 11.5, color: INK, align: 'right' });
  t('Destination', W - 82, midY - 10, { f: font, size: 7.5, color: INK_FAINT, align: 'right' });
  page.drawCircle({ x: W - 66, y: midY, size: 4.5, color: ORANGE });

  y -= routeH + 20;

  const kpiH = 68;
  const gap = 12;
  const kpiW = (W - 80 - gap * 3) / 4;
  const fuelEfficiency = tripData.fuel_consumed && tripData.actual_distance
    ? (tripData.actual_distance / tripData.fuel_consumed).toFixed(2)
    : '0.00';
  const kpis = [
    { label: 'FUEL EFFICIENCY', val: fuelEfficiency, unit: 'km/L' },
    { label: 'CARGO WEIGHT', val: tripData.cargo_weight || 0, unit: 'kg' },
    { label: 'DISTANCE', val: tripData.actual_distance || 0, unit: 'km' },
    { label: 'TOTAL COST', val: tripData.total_cost || '3,524', unit: '' },
  ];
  let x = 40;
  for (const k of kpis) {
    rrect(x, y - kpiH, kpiW, kpiH, 6, { fill: CARD, stroke: BORDER, lw: 1 });
    page.drawRectangle({ x, y: y - kpiH, width: 3, height: kpiH, color: ORANGE });
    t(k.label, x + 16, y - 24, { f: fontBold, size: 7, color: INK_SOFT, tracking: 0.3 });
    const vw = t(k.val.toString(), x + 16, y - 46, { f: fontBold, size: 16, color: INK });
    if (k.unit) t(k.unit, x + 16 + vw + 4, y - 43, { f: font, size: 8.5, color: INK_FAINT });
    x += kpiW + gap;
  }

  y -= kpiH + 20;

  const colGap = 14;
  const leftW = (W - 80 - colGap) * 0.58;
  const rightW = (W - 80 - colGap) * 0.42;
  const colTop = y;
  const rowH = 25;
  const detailRows = [
    ['Driver', tripData.driver_name || 'Alex Johnson'],
    ['Vehicle', tripData.vehicle_reg || 'Van-05'],
    ['Route', `${tripData.source || 'Ahmedabad'} - ${tripData.destination || 'Surat'}`],
    ['Cargo Weight', `${tripData.cargo_weight || 450} kg`],
    ['Distance Covered', `${tripData.actual_distance || 275} km`],
    ['Fuel Used', `${tripData.fuel_consumed || 28} L`],
  ];
  const leftH = 40 + rowH * detailRows.length;
  rrect(40, colTop - leftH, leftW, leftH, 6, { fill: CARD, stroke: BORDER, lw: 1 });
  t('TRIP INFORMATION', 40 + 18, colTop - 26, { f: fontBold, size: 9.5, color: ORANGE, tracking: 0.5 });
  line(40 + 18, colTop - 34, 40 + leftW - 18, colTop - 34, { color: LINE, thickness: 1 });

  let ry = colTop - 34 - 20;
  detailRows.forEach(([label, val], i) => {
    t(label, 40 + 18, ry, { f: font, size: 9.3, color: INK_SOFT });
    t(val, 40 + leftW - 18, ry, { f: fontBold, size: 9.3, color: INK, align: 'right' });
    if (i < detailRows.length - 1) {
      line(40 + 18, ry - 8, 40 + leftW - 18, ry - 8, { color: LINE, thickness: 0.75 });
    }
    ry -= rowH;
  });

  const rx = 40 + leftW + colGap;
  const costH = 40 + rowH * 3;
  rrect(rx, colTop - costH, rightW, costH, 6, { fill: CARD, stroke: BORDER, lw: 1 });
  t('COST SUMMARY', rx + 18, colTop - 26, { f: fontBold, size: 9.5, color: ORANGE, tracking: 0.5 });
  line(rx + 18, colTop - 34, rx + rightW - 18, colTop - 34, { color: LINE, thickness: 1 });

  let cy = colTop - 34 - 20;
  const costRows = [
    ['Fuel Cost', tripData.fuel_cost || '3,024'],
    ['Other Charges', tripData.other_charges || '500'],
  ];
  for (const [label, val] of costRows) {
    t(label, rx + 18, cy, { f: font, size: 9.3, color: INK_SOFT });
    money(val, rx + rightW - 18, cy, { f: fontBold, size: 9.3, color: INK, align: 'right' });
    line(rx + 18, cy - 8, rx + rightW - 18, cy - 8, { color: LINE, thickness: 0.75 });
    cy -= rowH;
  }
  t('Total Cost', rx + 18, cy, { f: fontBold, size: 10, color: INK });
  money(tripData.total_cost || '3,524', rx + rightW - 18, cy, { f: fontBold, size: 11.5, color: ORANGE, align: 'right' });

  const statusTop = colTop - costH - 14;
  const statusH = Math.max(leftH - costH - 14, 54);
  rrect(rx, statusTop - statusH, rightW, statusH, 6, { fill: GREEN_LT, stroke: rgb(0.769, 0.878, 0.792), lw: 1 });
  const sy = statusTop - statusH / 2;
  page.drawCircle({ x: rx + 26, y: sy, size: 9, color: GREEN });
  t('COMPLETED', rx + 44, sy + 4, { f: fontBold, size: 10.5, color: GREEN });
  t('Trip closed & verified', rx + 44, sy - 8, { f: font, size: 8, color: rgb(0.365, 0.502, 0.412) });

  const footY = 50;
  line(40, footY + 18, W - 40, footY + 18, { color: LINE, thickness: 1 });
  t('Generated automatically by TransitOps Smart Transport Platform', 40, footY, { f: font, size: 7.5, color: INK_FAINT });
  t('Page 1 of 1', W - 40, footY, { f: font, size: 7.5, color: INK_FAINT, align: 'right' });

  return pdfDoc.save();
}


// GET /api/dashboard/kpis
router.get('/kpis', authenticate, async (req, res) => {
  try {
    const { region, status, type } = req.query;
    const [vehiclesRes, driversRes, tripsRes, maintenanceRes, fuelRes, expensesRes] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('trips').select('*'),
      supabase.from('maintenance_logs').select('*'),
      supabase.from('fuel_logs').select('*'),
      supabase.from('expenses').select('*')
    ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (driversRes.error) throw driversRes.error;
    if (tripsRes.error) throw tripsRes.error;
    if (maintenanceRes.error) throw maintenanceRes.error;
    if (fuelRes.error) throw fuelRes.error;
    if (expensesRes.error) throw expensesRes.error;

    let vehicles = vehiclesRes.data || [];
    let drivers = driversRes.data || [];
    let trips = tripsRes.data || [];
    const maintenanceLogs = maintenanceRes.data || [];
    const fuelLogs = fuelRes.data || [];
    const expenses = expensesRes.data || [];

    if (region && region !== 'All') {
      vehicles = vehicles.filter((vehicle) => String(vehicle.region_id) === String(region));
      drivers = drivers.filter((driver) => String(driver.region_id) === String(region));
      trips = trips.filter((trip) => String(trip.region_id) === String(region));
    }

    if (status && status !== 'All') {
      vehicles = vehicles.filter((vehicle) => vehicle.status === status);
    }

    if (type && type !== 'All') {
      vehicles = vehicles.filter((vehicle) => String(vehicle.vehicle_type_id) === String(type));
      const vehicleIds = new Set(vehicles.map((vehicle) => String(vehicle.id)));
      trips = trips.filter((trip) => vehicleIds.has(String(trip.vehicle_id)));
    }

    // Calculations
    const activeVehicles = vehicles.filter(v => v.status !== 'Retired');
    const availableVehicles = vehicles.filter(v => v.status === 'Available');
    const vehiclesInMaintenance = vehicles.filter(v => v.status === 'In Shop');
    const retiredVehicles = vehicles.filter(v => v.status === 'Retired');

    const driversOnDuty = drivers.filter(d => d.status === 'On Trip');
    const driversAvailable = drivers.filter(d => d.status === 'Available');

    const activeTrips = trips.filter(t => t.state === 'Dispatched');
    const pendingTrips = trips.filter(t => t.state === 'Draft');
    const completedTrips = trips.filter(t => t.state === 'Completed');

    // Fleet Utilization %: (Vehicles On Trip / Active Vehicles) * 100
    const vehiclesOnTripCount = vehicles.filter(v => v.status === 'On Trip').length;
    const fleetUtilization = activeVehicles.length > 0 
      ? parseFloat(((vehiclesOnTripCount / activeVehicles.length) * 100).toFixed(2))
      : 0.0;

    // Fuel Efficiency: actual_distance / fuel_consumed for completed trips
    const completedTripsWithFuel = completedTrips.filter(t => t.fuel_consumed > 0 && t.actual_distance > 0);
    const totalDistance = completedTripsWithFuel.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
    const totalFuel = completedTripsWithFuel.reduce((sum, t) => sum + (t.fuel_consumed || 0), 0);
    const fuelEfficiency = totalFuel > 0 ? parseFloat((totalDistance / totalFuel).toFixed(2)) : 0.0;

    // Operational Cost: Fuel Cost + Maintenance Cost + Toll Expense + Misc Expense
    const totalFuelCost = fuelLogs.reduce((sum, f) => sum + parseFloat(f.cost || 0), 0);
    const totalMaintenanceCost = maintenanceLogs.reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
    const tollExpense = expenses.filter(e => e.expense_category === 'Toll').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const miscExpense = expenses.filter(e => e.expense_category === 'Misc').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const operationalCost = parseFloat((totalFuelCost + totalMaintenanceCost + tollExpense + miscExpense).toFixed(2));

    // Vehicle ROI: (Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost (average across active vehicles)
    // Revenue = total completed trips actual distance * 1.50 (standard rate)
    const activeVehiclesWithROI = activeVehicles.map(v => {
      const vFuelCost = fuelLogs.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + parseFloat(f.cost || 0), 0);
      const vMaintCost = maintenanceLogs.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
      const vTrips = completedTrips.filter(t => t.vehicle_id === v.id);
      const vDistance = vTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
      const vRevenue = vDistance * 1.50; // standard freight billing rate
      const acquisitionCost = parseFloat(v.acquisition_cost || 0) || 1.0; // avoid division by zero
      const roi = (vRevenue - (vMaintCost + vFuelCost)) / acquisitionCost;
      return roi;
    });
    const avgROI = activeVehiclesWithROI.length > 0
      ? parseFloat((activeVehiclesWithROI.reduce((sum, val) => sum + val, 0) / activeVehiclesWithROI.length).toFixed(4))
      : 0.0;

    // Maintenance Due (count of Scheduled logs)
    const maintenanceDue = maintenanceLogs.filter(m => m.state === 'Scheduled').length;

    // Expiring Licenses: Driver licenses expiring within 30 days (or expired)
    const expiringLicenses = drivers.filter(d => {
      if (!d.license_expiry_date) return false;
      const days = (new Date(d.license_expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;

    res.json({
      active_vehicles: activeVehicles.length,
      available_vehicles: availableVehicles.length,
      vehicles_in_maintenance: vehiclesInMaintenance.length,
      retired_vehicles: retiredVehicles.length,
      drivers_on_duty: driversOnDuty.length,
      drivers_available: driversAvailable.length,
      active_trips: activeTrips.length,
      pending_trips: pendingTrips.length,
      completed_trips: completedTrips.length,
      fleet_utilization: fleetUtilization,
      fuel_efficiency: fuelEfficiency,
      operational_cost: operationalCost,
      vehicle_roi: avgROI,
      maintenance_due: maintenanceDue,
      expiring_licenses: expiringLicenses
    });
  } catch (err) {
    console.error('KPI dashboard error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/dashboard/vehicle-performance
router.get('/vehicle-performance', authenticate, async (req, res) => {
  try {
    const [vehiclesRes, tripsRes, maintenanceRes, fuelRes] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('trips').select('*'),
      supabase.from('maintenance_logs').select('*'),
      supabase.from('fuel_logs').select('*'),
    ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (tripsRes.error) throw tripsRes.error;
    if (maintenanceRes.error) throw maintenanceRes.error;
    if (fuelRes.error) throw fuelRes.error;

    const trips = tripsRes.data || [];
    const maintenanceLogs = maintenanceRes.data || [];
    const fuelLogs = fuelRes.data || [];

    const vehicles = (vehiclesRes.data || []).map((vehicle) => {
      const vehicleTrips = trips.filter((trip) => String(trip.vehicle_id) === String(vehicle.id));
      const completedTrips = vehicleTrips.filter((trip) => trip.state === 'Completed');
      const dispatchedTrips = vehicleTrips.filter((trip) => trip.state === 'Dispatched');
      const vehicleFuel = fuelLogs.filter((log) => String(log.vehicle_id) === String(vehicle.id));
      const vehicleMaintenance = maintenanceLogs.filter((log) => String(log.vehicle_id) === String(vehicle.id));

      const totalDistance = completedTrips.reduce((sum, trip) => sum + Number(trip.actual_distance || 0), 0);
      const totalFuelConsumed = completedTrips.reduce((sum, trip) => sum + Number(trip.fuel_consumed || 0), 0);
      const loggedEfficiency = vehicleFuel
        .filter((log) => Number(log.fuel_efficiency) > 0)
        .map((log) => Number(log.fuel_efficiency));
      const fuelEfficiency = totalFuelConsumed > 0
        ? totalDistance / totalFuelConsumed
        : loggedEfficiency.length
          ? loggedEfficiency.reduce((sum, value) => sum + value, 0) / loggedEfficiency.length
          : 0;

      const utilizationRate = vehicleTrips.length > 0
        ? ((completedTrips.length + dispatchedTrips.length) / vehicleTrips.length) * 100
        : vehicle.status === 'On Trip'
          ? 100
          : 0;

      const fuelCost = vehicleFuel.reduce((sum, log) => sum + Number(log.cost || 0), 0);
      const maintenanceCost = vehicleMaintenance.reduce((sum, log) => sum + Number(log.cost || 0), 0);
      const revenue = totalDistance * 1.5;
      const acquisitionCost = Number(vehicle.acquisition_cost || 0) || 1;
      const roiContribution = (revenue - fuelCost - maintenanceCost) / acquisitionCost;

      return {
        ...vehicle,
        fuel_efficiency: Number(fuelEfficiency.toFixed(2)),
        utilization_rate: Number(utilizationRate.toFixed(2)),
        roi_contribution: Number(roiContribution.toFixed(4)),
      };
    });

    res.json({ vehicles, count: vehicles.length });
  } catch (err) {
    console.error('Vehicle performance error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/dashboard/analytics
router.get('/analytics', authenticate, async (req, res) => {
  const { date_from, date_to, status } = req.query;

  try {
    let query = supabase.from('trips').select('*');

    if (date_from) query = query.gte('planned_date', date_from);
    if (date_to) query = query.lte('planned_date', date_to);
    if (status) query = query.eq('state', status);

    const { data: trips, error } = await query;
    if (error) throw error;

    const completed = trips.filter((t) => t.state === 'Completed');
    const fuelEfficiency = completed
      .filter((t) => t.fuel_consumed > 0 && t.actual_distance > 0)
      .map((t) => ({
        trip_id: t.id,
        trip_name: t.name,
        efficiency: parseFloat((t.actual_distance / t.fuel_consumed).toFixed(2)),
      }));

    res.json({
      total_trips: trips.length,
      completed_trips: completed.length,
      fuel_efficiency: fuelEfficiency,
    });
  } catch (err) {
    console.error('Analytics query error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/dashboard/reports/strategy/pdf
router.get('/reports/strategy/pdf', authenticate, requireRole('admin', 'fleet_manager', 'financial_analyst', 'safety_officer'), async (req, res) => {
  try {
    const [vehiclesRes, driversRes, tripsRes, maintenanceRes, fuelRes, expensesRes] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('trips').select('*'),
      supabase.from('maintenance_logs').select('*'),
      supabase.from('fuel_logs').select('*'),
      supabase.from('expenses').select('*'),
    ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (driversRes.error) throw driversRes.error;
    if (tripsRes.error) throw tripsRes.error;
    if (maintenanceRes.error) throw maintenanceRes.error;
    if (fuelRes.error) throw fuelRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const vehicles = vehiclesRes.data || [];
    const drivers = driversRes.data || [];
    const trips = tripsRes.data || [];
    const maintenanceLogs = maintenanceRes.data || [];
    const fuelLogs = fuelRes.data || [];
    const expenses = expensesRes.data || [];
    const completedTrips = trips.filter((trip) => trip.state === 'Completed');
    const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== 'Retired');
    const vehiclesOnTrip = vehicles.filter((vehicle) => vehicle.status === 'On Trip').length;
    const fleetUtilization = activeVehicles.length ? ((vehiclesOnTrip / activeVehicles.length) * 100).toFixed(1) : '0.0';
    const totalDistance = completedTrips.reduce((sum, trip) => sum + Number(trip.actual_distance || 0), 0);
    const totalFuelConsumed = completedTrips.reduce((sum, trip) => sum + Number(trip.fuel_consumed || 0), 0);
    const fuelEfficiency = totalFuelConsumed > 0 ? (totalDistance / totalFuelConsumed).toFixed(1) : '0.0';
    const totalFuelCost = fuelLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
    const totalMaintenanceCost = maintenanceLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
    const maintenanceDue = maintenanceLogs.filter((log) => log.state === 'Scheduled').length;
    const operationalCost = [
      ...fuelLogs.map((log) => Number(log.cost || 0)),
      ...maintenanceLogs.map((log) => Number(log.cost || 0)),
      ...expenses.map((expense) => Number(expense.amount || 0)),
    ].reduce((sum, value) => sum + value, 0);
    const expiringLicenses = drivers.filter((driver) => {
      if (!driver.license_expiry_date) return false;
      const days = (new Date(driver.license_expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;

    const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const pdf = await generateStrategyPdf({
      generatedAt,
      fleetUtilization,
      fuelEfficiency: `${fuelEfficiency} km/L`,
      activeVehicles: activeVehicles.length,
      availableVehicles: vehicles.filter((vehicle) => vehicle.status === 'Available').length,
      vehiclesInMaintenance: vehicles.filter((vehicle) => vehicle.status === 'In Shop').length,
      driversAvailable: drivers.filter((driver) => driver.status === 'Available').length,
      activeTrips: trips.filter((trip) => trip.state === 'Dispatched').length,
      completedTrips: completedTrips.length,
      operationalCost: operationalCost.toFixed(2),
      fuelCost: totalFuelCost.toFixed(2),
      otherCharges: totalMaintenanceCost.toFixed(2),
      maintenanceDue: maintenanceDue,
      expiringLicenses: expiringLicenses,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transitops_strategy_report.pdf"');
    res.status(200).send(pdf);
  } catch (err) {
    console.error('Strategy PDF generation error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/dashboard/reports/:reportName/export
router.get('/reports/:reportName/export', authenticate, requireRole('admin', 'fleet_manager', 'financial_analyst', 'safety_officer'), async (req, res) => {
  const { reportName } = req.params;
  const { date_from, date_to, status } = req.query;

  try {
    let headers = [];
    let rows = [];

    // Helper: format cells for CSV
    const escapeCell = (cell) => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper: date filter formatting
    const filterByDateRange = (list, dateField) => {
      return list.filter(item => {
        if (!item[dateField]) return true;
        const itemDate = new Date(item[dateField]);
        if (date_from && itemDate < new Date(date_from)) return false;
        if (date_to && itemDate > new Date(date_to)) return false;
        return true;
      });
    };

    switch (reportName.toLowerCase()) {
      case 'audit':
      case 'audit-dataset':
      case 'audit_dataset': {
        headers = ['Record Type', 'Record ID', 'Reference', 'Status', 'Date', 'Vehicle ID', 'Driver ID', 'Amount', 'Details'];
        const [vehiclesRes, driversRes, tripsRes, maintenanceRes, fuelRes, expensesRes] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('drivers').select('*'),
          supabase.from('trips').select('*'),
          supabase.from('maintenance_logs').select('*'),
          supabase.from('fuel_logs').select('*'),
          supabase.from('expenses').select('*'),
        ]);

        if (vehiclesRes.error) throw vehiclesRes.error;
        if (driversRes.error) throw driversRes.error;
        if (tripsRes.error) throw tripsRes.error;
        if (maintenanceRes.error) throw maintenanceRes.error;
        if (fuelRes.error) throw fuelRes.error;
        if (expensesRes.error) throw expensesRes.error;

        rows = [
          ...vehiclesRes.data.map((vehicle) => [
            'Vehicle',
            vehicle.id,
            vehicle.registration_number,
            vehicle.status,
            vehicle.created_at || '',
            vehicle.id,
            '',
            vehicle.acquisition_cost || '',
            `${vehicle.name || ''} ${vehicle.vehicle_model || ''}`.trim(),
          ]),
          ...driversRes.data.map((driver) => [
            'Driver',
            driver.id,
            driver.license_number,
            driver.status,
            driver.license_expiry_date || '',
            '',
            driver.id,
            '',
            `${driver.name || ''} safety score ${driver.safety_score || 0}`.trim(),
          ]),
          ...tripsRes.data.map((trip) => [
            'Trip',
            trip.id,
            trip.name,
            trip.state,
            trip.planned_date || trip.created_at || '',
            trip.vehicle_id,
            trip.driver_id,
            '',
            `${trip.source || ''} to ${trip.destination || ''}`.trim(),
          ]),
          ...maintenanceRes.data.map((log) => [
            'Maintenance',
            log.id,
            log.maintenance_type,
            log.state,
            log.scheduled_date || log.created_at || '',
            log.vehicle_id,
            '',
            log.cost || '',
            log.notes || '',
          ]),
          ...fuelRes.data.map((log) => [
            'Fuel',
            log.id,
            `${log.litres} L`,
            '',
            log.date || log.created_at || '',
            log.vehicle_id,
            '',
            log.cost || '',
            `Odometer ${log.odometer || ''}; efficiency ${log.fuel_efficiency || ''}`.trim(),
          ]),
          ...expensesRes.data.map((expense) => [
            'Expense',
            expense.id,
            expense.expense_category,
            '',
            expense.date || expense.created_at || '',
            expense.vehicle_id,
            '',
            expense.amount || '',
            expense.notes || '',
          ]),
        ];
        break;
      }
      case 'fleet-utilization':
      case 'fleet_utilization': {
        headers = ['Vehicle ID', 'Vehicle Name', 'Registration Number', 'Model', 'Manufacturer', 'Capacity', 'Odometer', 'Status', 'Is Utilized (On Trip)'];
        const { data: vehicles, error } = await supabase.from('vehicles').select('*');
        if (error) throw error;
        
        let filtered = vehicles.filter(v => v.status !== 'Retired');
        if (status) filtered = filtered.filter(v => v.status === status);

        rows = filtered.map(v => [
          v.id,
          v.name,
          v.registration_number,
          v.vehicle_model,
          v.manufacturer || '',
          v.capacity,
          v.odometer || 0,
          v.status,
          v.status === 'On Trip' ? 'Yes' : 'No'
        ]);
        break;
      }
      case 'trips':
      case 'trip-report':
      case 'trip_report': {
        headers = ['Trip ID', 'Trip Name', 'Source', 'Destination', 'Cargo Weight', 'Planned Distance', 'Actual Distance', 'Fuel Consumed', 'State', 'Planned Date', 'Vehicle ID', 'Driver ID'];
        let query = supabase.from('trips').select('*');
        if (status) query = query.eq('state', status);
        const { data: trips, error } = await query;
        if (error) throw error;

        let filtered = trips;
        if (date_from) filtered = filtered.filter(t => t.planned_date >= date_from);
        if (date_to) filtered = filtered.filter(t => t.planned_date <= date_to);

        rows = filtered.map(t => [
          t.id,
          t.name,
          t.source,
          t.destination,
          t.cargo_weight,
          t.planned_distance,
          t.actual_distance || '',
          t.fuel_consumed || '',
          t.state,
          t.planned_date || '',
          t.vehicle_id,
          t.driver_id
        ]);
        break;
      }
      case 'driver-performance':
      case 'driver_performance': {
        headers = ['Driver ID', 'Driver Name', 'Phone', 'Email', 'License Number', 'License Expiry', 'Safety Score', 'Status', 'Total Trips Completed', 'Total Distance Driven'];
        const [driversRes, tripsRes] = await Promise.all([
          supabase.from('drivers').select('*'),
          supabase.from('trips').select('*').eq('state', 'Completed')
        ]);
        if (driversRes.error) throw driversRes.error;
        if (tripsRes.error) throw tripsRes.error;

        rows = driversRes.data.map(d => {
          const completedTrips = tripsRes.data.filter(t => t.driver_id === d.id);
          const totalDistance = completedTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
          return [
            d.id,
            d.name,
            d.phone,
            d.email || '',
            d.license_number,
            d.license_expiry_date,
            d.safety_score || 100,
            d.status,
            completedTrips.length,
            totalDistance
          ];
        });
        break;
      }
      case 'vehicle-performance':
      case 'vehicle_performance': {
        headers = ['Vehicle ID', 'Vehicle Name', 'Registration Number', 'Model', 'Manufacturer', 'Capacity', 'Odometer', 'Status', 'Total Trips Completed', 'Total Distance Driven'];
        const [vehiclesRes, tripsRes] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('trips').select('*').eq('state', 'Completed')
        ]);
        if (vehiclesRes.error) throw vehiclesRes.error;
        if (tripsRes.error) throw tripsRes.error;

        rows = vehiclesRes.data.map(v => {
          const completedTrips = tripsRes.data.filter(t => t.vehicle_id === v.id);
          const totalDistance = completedTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
          return [
            v.id,
            v.name,
            v.registration_number,
            v.vehicle_model,
            v.manufacturer || '',
            v.capacity,
            v.odometer || 0,
            v.status,
            completedTrips.length,
            totalDistance
          ];
        });
        break;
      }
      case 'maintenance':
      case 'maintenance-report':
      case 'maintenance_report': {
        headers = ['Log ID', 'Vehicle ID', 'Maintenance Type', 'State', 'Scheduled Date', 'Open Date', 'Close Date', 'Cost', 'Odometer', 'Notes'];
        const { data: logs, error } = await supabase.from('maintenance_logs').select('*');
        if (error) throw error;

        let filtered = logs;
        if (status) filtered = filtered.filter(l => l.state === status);
        filtered = filterByDateRange(filtered, 'scheduled_date');

        rows = filtered.map(l => [
          l.id,
          l.vehicle_id,
          l.maintenance_type,
          l.state,
          l.scheduled_date || '',
          l.open_date || '',
          l.close_date || '',
          l.cost || 0,
          l.odometer || '',
          l.notes || ''
        ]);
        break;
      }
      case 'fuel-efficiency':
      case 'fuel_efficiency': {
        headers = ['Trip ID', 'Trip Name', 'Vehicle ID', 'Actual Distance', 'Fuel Consumed', 'Fuel Efficiency (km/L)'];
        const { data: trips, error } = await supabase.from('trips').select('*').eq('state', 'Completed');
        if (error) throw error;

        const filtered = trips.filter(t => t.fuel_consumed > 0 && t.actual_distance > 0);

        rows = filtered.map(t => [
          t.id,
          t.name,
          t.vehicle_id,
          t.actual_distance,
          t.fuel_consumed,
          parseFloat((t.actual_distance / t.fuel_consumed).toFixed(2))
        ]);
        break;
      }
      case 'expenses':
      case 'expense-report':
      case 'expense_report': {
        headers = ['Expense ID', 'Vehicle ID', 'Trip ID', 'Expense Category', 'Amount', 'Date', 'Notes'];
        const { data: expenses, error } = await supabase.from('expenses').select('*');
        if (error) throw error;

        let filtered = expenses;
        if (status) filtered = filtered.filter(e => e.expense_category === status);
        filtered = filterByDateRange(filtered, 'date');

        rows = filtered.map(e => [
          e.id,
          e.vehicle_id,
          e.trip_id || '',
          e.expense_category,
          e.amount,
          e.date,
          e.notes || ''
        ]);
        break;
      }
      case 'vehicle-roi':
      case 'vehicle_roi': {
        headers = ['Vehicle ID', 'Vehicle Name', 'Registration Number', 'Acquisition Cost', 'Total Fuel Cost', 'Total Maintenance Cost', 'Derived Revenue', 'Net Return', 'ROI'];
        const [vehiclesRes, fuelRes, maintenanceRes, tripsRes] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('fuel_logs').select('*'),
          supabase.from('maintenance_logs').select('*'),
          supabase.from('trips').select('*').eq('state', 'Completed')
        ]);
        if (vehiclesRes.error) throw vehiclesRes.error;
        if (fuelRes.error) throw fuelRes.error;
        if (maintenanceRes.error) throw maintenanceRes.error;
        if (tripsRes.error) throw tripsRes.error;

        rows = vehiclesRes.data.map(v => {
          const vFuel = fuelRes.data.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + parseFloat(f.cost || 0), 0);
          const vMaint = maintenanceRes.data.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
          const vTrips = tripsRes.data.filter(t => t.vehicle_id === v.id);
          const vDistance = vTrips.reduce((sum, t) => sum + (t.actual_distance || 0), 0);
          const vRevenue = vDistance * 1.50; // standard freight billing rate
          const acquisitionCost = parseFloat(v.acquisition_cost || 0) || 1.0;
          const roi = (vRevenue - (vMaint + vFuel)) / acquisitionCost;
          const netReturn = vRevenue - (vMaint + vFuel);

          return [
            v.id,
            v.name,
            v.registration_number,
            v.acquisition_cost || 0,
            vFuel,
            vMaint,
            vRevenue.toFixed(2),
            netReturn.toFixed(2),
            roi.toFixed(4)
          ];
        });
        break;
      }
      case 'license-expiry':
      case 'license_expiry':
      case 'license_expiry_report': {
        headers = ['Driver ID', 'Driver Name', 'License Number', 'License Expiry', 'Days to Expiry', 'Status'];
        const { data: drivers, error } = await supabase.from('drivers').select('*');
        if (error) throw error;

        rows = drivers.map(d => {
          const days = Math.ceil((new Date(d.license_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
          let statusLabel = 'Valid';
          if (days < 0) statusLabel = 'Expired';
          else if (days <= 30) statusLabel = 'Expiring Soon';
          return [
            d.id,
            d.name,
            d.license_number,
            d.license_expiry_date,
            days,
            statusLabel
          ];
        });
        break;
      }
      case 'operational-cost':
      case 'operational_cost': {
        headers = ['Vehicle ID', 'Vehicle Name', 'Registration Number', 'Fuel Cost', 'Maintenance Cost', 'Toll Expense', 'Misc Expense', 'Total Operational Cost'];
        const [vehiclesRes, fuelRes, maintenanceRes, expensesRes] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('fuel_logs').select('*'),
          supabase.from('maintenance_logs').select('*'),
          supabase.from('expenses').select('*')
        ]);
        if (vehiclesRes.error) throw vehiclesRes.error;
        if (fuelRes.error) throw fuelRes.error;
        if (maintenanceRes.error) throw maintenanceRes.error;
        if (expensesRes.error) throw expensesRes.error;

        rows = vehiclesRes.data.map(v => {
          const vFuel = fuelRes.data.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + parseFloat(f.cost || 0), 0);
          const vMaint = maintenanceRes.data.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
          const vToll = expensesRes.data.filter(e => e.vehicle_id === v.id && e.expense_category === 'Toll').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
          const vMisc = expensesRes.data.filter(e => e.vehicle_id === v.id && e.expense_category === 'Misc').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
          const total = vFuel + vMaint + vToll + vMisc;
          return [
            v.id,
            v.name,
            v.registration_number,
            vFuel,
            vMaint,
            vToll,
            vMisc,
            total
          ];
        });
        break;
      }
      default:
        return res.status(400).json({ error: `Invalid report name: ${reportName}` });
    }

    const csvContent = [headers.join(',')];
    for (const row of rows) {
      csvContent.push(row.map(escapeCell).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportName}_report.csv"`);
    res.status(200).send(csvContent.join('\n'));
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
