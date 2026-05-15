const esc = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const firstWord = (name) =>
  (name || '').split(/[_\s\-]+/)[0].toUpperCase();

const f1 = (n) => Number(n).toFixed(1);

const renderCard = (node, options, fileGroupNames) => {
  const { includeCoordinates, includeViability } = options;
  const d = node.data;

  const groupName = fileGroupNames[d.fileGroupId] || d.fileGroupId || '';
  const fileLabel = firstWord(groupName);

  const viabilityArrow = (includeViability && d.viability === 'A')
    ? `<span class="viability-arrow">↗</span>`
    : '';

  const color = d.clusterColor || '#94a3b8';
  const clusterTag = d.clusterName
    ? `<span class="tag tag-filled" style="background:${color}">${esc(d.clusterName)}</span>`
    : '';
  const subTag = d.subClusterName
    ? `<span class="tag tag-outline" style="border-color:${color}">${esc(d.subClusterName)}</span>`
    : '';

  const description = d.description
    ? `<p class="description">${esc(d.description)}</p>`
    : '';

  let coordsSection = '';
  if (includeCoordinates && d.techFeasibility != null) {
    const avgF = f1((d.techFeasibility + d.bizFeasibility + d.legalFeasibility) / 3);

    const row = (label, val, bold = false) =>
      `<div class="coord-row${bold ? ' coord-bold' : ''}">` +
      `<span class="coord-label">${label}</span>` +
      `<span class="coord-value">${val}</span></div>`;

    let rows = '';
    rows += row('Technical Feasibility', f1(d.techFeasibility));
    rows += row('Business Feasibility',  f1(d.bizFeasibility));
    rows += row('Legal Feasibility',     f1(d.legalFeasibility));
    rows += `<div class="coord-divider"></div>`;
    rows += row('Avg. Feasibility', avgF, true);
    if (d.rawY != null) rows += row('Desirability', f1(d.rawY), true);

    coordsSection = `<div class="coords">${rows}</div>`;
  }

  return `
    <div class="card">
      ${viabilityArrow}
      ${fileLabel ? `<div class="file-label">${esc(fileLabel)}</div>` : ''}
      <h3 class="card-title">${esc(d.title)}</h3>
      <div class="tags">${clusterTag}${subTag}</div>
      ${description}
      ${coordsSection}
    </div>`;
};

export const generatePDF = (nodes, options, fileGroupNames = {}) => {
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

  const cards = visibleCards.map(n => renderCard(n, options, fileGroupNames)).join('\n');

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
      color: #000;
    }
    .grid {
      display: grid;
      grid-template-columns: 110mm;
      gap: 8mm;
      justify-content: center;
    }
    .card {
      position: relative;
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1.5px solid #e2e8f0;
      border-radius: 0;
      padding: 12px 14px;
      background: white;
    }
    .viability-arrow {
      position: absolute;
      top: 10px;
      right: 12px;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
      border-radius: 9999px;
      padding: 1px 6px;
      font-size: 10px;
      font-weight: 700;
    }
    .file-label {
      font-size: 8px;
      font-weight: 300;
      color: #000;
      letter-spacing: 0.14em;
      margin-bottom: 3px;
    }
    .card-title {
      margin: 0 0 8px;
      font-size: 19px;
      font-weight: 700;
      line-height: 1.25;
      color: #000;
      padding-right: 28px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 8px;
    }
    .tag {
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 600;
    }
    .tag-filled { color: white; border: none; }
    .tag-outline { background: transparent; color: #334155; border: 1px solid; }
    .description {
      margin: 0 0 7px;
      font-size: 11px;
      color: #000;
      line-height: 1.5;
    }
    .coords {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .coord-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    .coord-label { color: #64748b; }
    .coord-value { color: #64748b; }
    .coord-bold { font-weight: 700; font-size: 11px; }
    .coord-bold .coord-label { color: #000; }
    .coord-bold .coord-value { color: #000; }
    .coord-divider { border-top: 1px solid #e2e8f0; margin: 4px 0; }
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
