import Papa from 'papaparse';

const SCALE_X = 400;
const SCALE_Y = 300;
const Y_MAX_VALUE = 5;

const parseSingleCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error)
    });
  });
};

export const parseCSVs = async (files, callback) => {
  try {
    const fileArray = Array.from(files);

    // Parse all CSVs in parallel, keeping filename alongside data
    const allResults = await Promise.all(
      fileArray.map(file =>
        parseSingleCSV(file).then(data => ({
          data,
          fileGroupId: file.name.replace(/\.[^/.]+$/, ''), // strip extension
        }))
      )
    );

    const occupiedPositions = new Map();
    const fileGroups = [];
    let allNodes = [];
    let globalIndex = 0;

    for (const { data, fileGroupId } of allResults) {
      fileGroups.push({ id: fileGroupId, name: fileGroupId });

      const rows = data.slice(1); // skip header row

      const nodes = rows.map((row) => {
        const index = globalIndex++;

        const na = (v) => { const s = (v || '').toString().trim(); return /^n\/a$/i.test(s) ? '' : s; };

        const clusterName = na(row[0]) || 'Uncategorized';
        const subClusterName = na(row[1]) || 'General';
        const subClusterExplanation = na(row[2]);
        const functionName = na(row[3]) || `Feature ${index + 1}`;
        const featureExplanation = na(row[4]);

        const parsedTechF  = parseFloat(row[5]);
        const parsedBizF   = parseFloat(row[6]);
        const parsedLegalF = parseFloat(row[7]);
        const parsedY      = parseFloat(row[8]);

        const outOfScope = isNaN(parsedTechF) || isNaN(parsedBizF) || isNaN(parsedLegalF) || isNaN(parsedY);

        const techFeasibility  = isNaN(parsedTechF)  ? 1 : parsedTechF;
        const bizFeasibility   = isNaN(parsedBizF)   ? 1 : parsedBizF;
        const legalFeasibility = isNaN(parsedLegalF) ? 1 : parsedLegalF;
        const rawY = isNaN(parsedY) ? 1 : parsedY;

        const avgFeasibility = (techFeasibility + bizFeasibility + legalFeasibility) / 3;

        const rawViability = (row[9] || '').toString().trim().toUpperCase();
        const viability = (rawViability === 'A' || rawViability === 'B') ? rawViability : null;
        const viabilityComment = na(row[10]) || null;

        let posX = (avgFeasibility - 1) * SCALE_X;
        let posY = (Y_MAX_VALUE - rawY) * SCALE_Y;

        // Global collision detection across all files
        const posKey = `${posX},${posY}`;
        if (occupiedPositions.has(posKey)) {
          const count = occupiedPositions.get(posKey);
          posX += count * 30;
          posY += count * 30;
          occupiedPositions.set(posKey, count + 1);
        } else {
          occupiedPositions.set(posKey, 1);
        }

        return {
          id: `node-${index}-${Date.now()}`,
          type: 'featureCard',
          position: { x: posX, y: posY },
          hidden: outOfScope,
          data: {
            outOfScope,
            missingCoords: outOfScope,
            clusterName,
            subClusterName,
            subClusterExplanation,
            title: functionName,
            description: featureExplanation,
            techFeasibility,
            bizFeasibility,
            legalFeasibility,
            rawY,
            viability,
            viabilityComment,
            fileGroupId,
          },
        };
      });

      allNodes = allNodes.concat(nodes);
    }

    callback(allNodes, fileGroups);
  } catch (error) {
    console.error('Error parsing CSVs:', error);
    alert('Failed to parse CSV files.');
  }
};

export const exportToCSV = (nodes) => {
  if (!nodes || nodes.length === 0) return;

  const featureNodes = nodes.filter(n => n.type === 'featureCard');
  if (featureNodes.length === 0) return;

  const dataToExport = featureNodes.map(node => {
    const { techFeasibility, bizFeasibility, legalFeasibility } = node.data;
    const newAvg = (node.position.x / SCALE_X) + 1;
    const originalAvg = (techFeasibility + bizFeasibility + legalFeasibility) / 3;
    const delta = newAvg - originalAvg;

    const newRawY = Y_MAX_VALUE - (node.position.y / SCALE_Y);

    return [
      node.data.clusterName,
      node.data.subClusterName,
      node.data.subClusterExplanation,
      node.data.title,
      node.data.description,
      (techFeasibility  + delta).toFixed(2),
      (bizFeasibility   + delta).toFixed(2),
      (legalFeasibility + delta).toFixed(2),
      newRawY.toFixed(2),
      node.data.viability != null ? node.data.viability : ''
    ];
  });

  dataToExport.unshift([
    'Cluster Name',
    'Sub-cluster Name',
    'Sub-cluster Explanation',
    'Function/Feature Name',
    'Feature Explanation / Example',
    'Technical Feasibility',
    'Business Feasibility',
    'Legal Feasibility',
    'Desirability',
    'Viability'
  ]);

  const csv = Papa.unparse(dataToExport);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'adjusted_feature_matrix.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
