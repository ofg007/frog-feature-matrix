const esc = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renderCard = (node, options) => {
  const { includeCoordinates, includeViability } = options;
  const d = node.data;

  // Tags
  const clusterTag = d.clusterName
    ? `<span class="tag" style="background:${d.clusterColor || '#e2e8f0'}">${esc(d.clusterName)}</span>`
    : '';
  const subTag = d.subClusterName
    ? `<span class="tag" style="background:${d.subClusterColor || '#f1f5f9'}">${esc(d.subClusterName)}</span>`
    : '';

  // Viability badge (A only shows arrow in app, but in PDF show full label)
  let viabilitySection = '';
  if (includeViability && d.viability) {
    const isA = d.viability === 'A';
    const badgeClass = isA ? 'viability-a' : 'viability-b';
    const label = isA ? '↗ Sustainable business impact' : 'No major business impact';
    viabilitySection += `<span class="viability-badge ${badgeClass}">${label}</span>`;
  }
  if (includeViability && d.viabilityComment) {
    viabilitySection += `<p class="viability-comment">${esc(d.viabilityComment)}</p>`;
  }

  // Coordinates
  let coordsSection = '';
  if (includeCoordinates) {
    const hasSplit =
      d.techFeasibility != null &&
      (d.techFeasibility !== d.bizFeasibility || d.bizFeasibility !== d.legalFeasibility);
    const avgF = d.techFeasibility != null
      ? ((d.techFeasibility + d.bizFeasibility + d.legalFeasibility) / 3).toFixed(2)
      : null;
    const des = d.rawY != null ? Number(d.rawY).toFixed(1) : null;

    const row = (label, val) =>
      `<div class="coord-row"><span class="coord-label">${label}</span><strong>${val}</strong></div>`;

    let rows = '';
    if (hasSplit) {
      rows += row('Technical Feasibility', d.techFeasibility.toFixed(2));
      rows += row('Business Feasibility', d.bizFeasibility.toFixed(2));
      rows += row('Legal Feasibility', d.legalFeasibility.toFixed(2));
      rows += `<div class="coord-row avg-row">${row('Avg. Feasibility', avgF).slice('<div class="coord-row">'.length, -6)}</div>`;
    } else if (avgF) {
      rows += row('Feasibility', avgF);
    }
    if (des) rows += row('Desirability', des);

    if (rows) coordsSection = `<div class="coords">${rows}</div>`;
  }

  return `
    <div class="card">
      <h3 class="card-title">${esc(d.title)}</h3>
      <div class="tags">${clusterTag}${subTag}</div>
      ${viabilitySection}
      ${d.description ? `<p class="description">${esc(d.description)}</p>` : ''}
      ${coordsSection}
    </div>`;
};

export const generatePDF = (nodes, options) => {
  const visibleCards = nodes
    .filter(n => n.type === 'featureCard' && !n.hidden && !n.data?.outOfScope)
    .sort((a, b) => {
      const ca = a.data.clusterName || '';
      const cb = b.data.clusterName || '';
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.data.subClusterName || '').localeCompare(b.data.subClusterName || '');
    });

  if (visibleCards.length === 0) {
    alert('No visible cards to export.');
    return;
  }

  const cards = visibleCards.map(n => renderCard(n, options)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Feature Matrix Export</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color: #1e293b;
    }
    .grid {
      display: grid;
      grid-template-columns: 75mm 75mm;
      gap: 8mm;
      justify-content: center;
    }
    .card {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: white;
      font-size: 11px;
    }
    .card-title {
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
      color: #1e293b;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }
    .tag {
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 8px;
      font-weight: 600;
      color: #1e293b;
    }
    .viability-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 8px;
      font-weight: 700;
      margin: 0 0 6px;
    }
    .viability-a { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .viability-b { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
    .description {
      margin: 0 0 6px;
      font-size: 10px;
      color: #64748b;
      line-height: 1.5;
    }
    .viability-comment {
      margin: 0 0 6px;
      font-size: 9px;
      color: #92400e;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 4px;
      padding: 4px 7px;
      line-height: 1.4;
    }
    .coords {
      border-top: 1px solid #f1f5f9;
      padding-top: 5px;
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .coord-row {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
    }
    .coord-label { color: #94a3b8; }
    .coord-row strong { color: #475569; font-weight: 600; }
    .avg-row { border-top: 1px solid #f1f5f9; padding-top: 2px; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="grid">
${cards}
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups for this page to export PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
};
