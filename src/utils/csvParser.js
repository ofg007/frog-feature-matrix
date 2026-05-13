import Papa from 'papaparse';

const SCALE_X = 400;
const SCALE_Y = 300;
const Y_MAX_VALUE = 5;

// Parse a single file
const parseSingleCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false, // We'll handle headers manually to enforce index-based mapping
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const parseCSVs = async (files, callback) => {
  try {
    const allDataPromises = Array.from(files).map(file => parseSingleCSV(file));
    const allResults = await Promise.all(allDataPromises);
    
    let combinedData = [];
    allResults.forEach(data => {
      // Assuming first row is header, skip it
      if (data.length > 0) {
        combinedData = combinedData.concat(data.slice(1));
      }
    });

    const occupiedPositions = new Map();
    
    const parsedNodes = combinedData.map((row, index) => {
      // The first column is the name of the cluster, the 2nd is the name of the sub cluster, 
      // the 3rd is an explanation of the subcluster, the 4th is the function/feature, 
      // the 5th is an explanation or an example of the feature, the 6th is the feasibility and the 7th the desirability.
      const clusterName = row[0] || 'Uncategorized';
      const subClusterName = row[1] || 'General';
      const subClusterExplanation = row[2] || '';
      const functionName = row[3] || `Feature ${index + 1}`;
      const featureExplanation = row[4] || '';
      
      const parsedX = parseFloat(row[5]);
      const parsedY = parseFloat(row[6]);
      const outOfScope = isNaN(parsedX) || isNaN(parsedY);
      const rawX = isNaN(parsedX) ? 1 : parsedX;
      const rawY = isNaN(parsedY) ? 1 : parsedY;
      const rawViability = (row[7] || '').toString().trim().toUpperCase();
      const viability = (rawViability === 'A' || rawViability === 'B') ? rawViability : null;

      let posX = (rawX - 1) * SCALE_X;
      let posY = (Y_MAX_VALUE - rawY) * SCALE_Y;

      // Collision detection
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
          rawX,
          rawY,
          viability,
          originalRow: row // For exporting
        },
      };
    });

    callback(parsedNodes);
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
    const newRawX = (node.position.x / SCALE_X) + 1;
    const newRawY = Y_MAX_VALUE - (node.position.y / SCALE_Y);
    
    return [
      node.data.clusterName,
      node.data.subClusterName,
      node.data.subClusterExplanation,
      node.data.title,
      node.data.description,
      newRawX.toFixed(2),
      newRawY.toFixed(2),
      node.data.viability !== null && node.data.viability !== undefined ? node.data.viability : ''
    ];
  });

  // Add header
  dataToExport.unshift([
    'Cluster Name',
    'Sub-cluster Name',
    'Sub-cluster Explanation',
    'Function/Feature Name',
    'Feature Explanation / Example',
    'Feasibility',
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
