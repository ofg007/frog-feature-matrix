import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { parseCSVs, exportToCSV } from './utils/csvParser';
import FeatureCardNode, { moveToBucketRef } from './FeatureCardNode';
import { Download, Upload, Filter, Eye, EyeOff, Info, ChevronDown, ChevronRight, Trash2, Settings, Archive, X, RotateCcw } from 'lucide-react';

const AxisNode = ({ data }) => {
  return (
    <div style={{
      width: data.width || 1,
      height: data.height || 1,
      borderTop: data.horizontal ? '3px dashed #cbd5e1' : 'none',
      borderLeft: !data.horizontal ? '3px dashed #cbd5e1' : 'none',
      pointerEvents: 'none'
    }} />
  );
};

const PerimeterNode = ({ data }) => {
  return (
    <div style={{
      width: data.width,
      height: data.height,
      border: '3px dashed rgba(148, 163, 184, 0.4)',
      borderRadius: '24px',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    }} />
  );
};

const AxisLabelNode = ({ data }) => (
  <div style={{
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    background: 'rgba(255,255,255,0.9)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    pointerEvents: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  }}>
    {data.text}
  </div>
);

const QuadrantNode = ({ data }) => {
  const corner = data.labelCorner;
  const labelStyle = {
    position: 'absolute',
    fontSize: '15px',
    fontWeight: 800,
    color: data.color,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    opacity: 0.4,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    userSelect: 'none',
    top: corner === 'top-left' || corner === 'top-right' ? '20px' : undefined,
    bottom: corner === 'bottom-left' || corner === 'bottom-right' ? '20px' : undefined,
    left: corner === 'top-left' || corner === 'bottom-left' ? '20px' : undefined,
    right: corner === 'top-right' || corner === 'bottom-right' ? '20px' : undefined,
  };
  return (
    <div style={{
      width: data.width,
      height: data.height,
      background: data.bg,
      borderRadius: data.borderRadius,
      pointerEvents: 'none',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      <div style={labelStyle}>{data.label}</div>
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange }) => (
  <div
    onClick={onChange}
    style={{
      width: '44px',
      height: '24px',
      backgroundColor: checked ? '#3b82f6' : '#e2e8f0',
      borderRadius: '12px',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background-color 0.2s',
      flexShrink: 0
    }}
  >
    <div style={{
      position: 'absolute',
      width: '18px',
      height: '18px',
      backgroundColor: 'white',
      borderRadius: '50%',
      top: '3px',
      left: checked ? '23px' : '3px',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }} />
  </div>
);

const PERIMETER_BOUNDS = { xMin: -40, xMax: 1640, yMin: -40, yMax: 1240 };

const nodeTypes = {
  featureCard: FeatureCardNode,
  axis: AxisNode,
  perimeter: PerimeterNode,
  axisLabel: AxisLabelNode,
  quadrant: QuadrantNode,
};

const SUGGESTED_COLORS = [
  '#a390e4', '#8b96e9', '#78a6eb', '#5dbce6', '#4ecdd4',
  '#43cebc', '#44d89e', '#6fdd72', '#a0e056', '#d2e043',
  '#eedb40', '#f3c442', '#f69d51', '#fb865e', '#ff7067'
];

function CustomColorPicker({ color, onChange, size = 24 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX - 200 // shift left so it fits
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Color Swatch Trigger */}
      <div
        ref={triggerRef}
        onClick={toggleOpen}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          borderRadius: '4px',
          border: '1px solid rgba(0,0,0,0.1)',
          cursor: 'pointer'
        }}
      />

      {/* Popover via Portal */}
      {isOpen && createPortal(
        <div ref={popoverRef} style={{
          position: 'absolute',
          left: `${coords.left}px`,
          top: `${coords.top}px`,
          width: '240px',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          padding: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Preset Colors Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {SUGGESTED_COLORS.map(c => (
              <div
                key={c}
                onClick={() => { onChange(c); setIsOpen(false); }}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: c,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: color === c ? '3px solid #1e293b' : '1px solid transparent',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  margin: 'auto'
                }}
              />
            ))}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

          {/* Custom Color Input */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Custom Color</span>
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              style={{
                width: '32px',
                height: '32px',
                padding: 0,
                border: 'none',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const DEFAULT_CLUSTER_COLORS = SUGGESTED_COLORS;
const DEFAULT_SUBCLUSTER_COLORS = SUGGESTED_COLORS;

const loadFromStorage = (key, defaultValue, isSet = false) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return isSet ? new Set(parsed) : parsed;
    }
  } catch (e) {
    console.error('Error loading state from localStorage', e);
  }
  return defaultValue;
};

function Flow() {
  const [nodes, setNodes] = useState(() => {
    const loadedNodes = loadFromStorage('fm_nodes', []);
    if (!loadedNodes.some(n => n.id === 'perimeter')) {
      loadedNodes.push({
        id: 'perimeter',
        type: 'perimeter',
        position: { x: -40, y: -40 },
        data: { width: 1680, height: 1280 },
        draggable: false,
        selectable: false,
        zIndex: -2
      });
    }
    return loadedNodes;
  });
  const [edges, setEdges] = useState([]);
  const fileInputRef = useRef(null);
  const { setViewport } = useReactFlow();

  const [hiddenClusters, setHiddenClusters] = useState(() => loadFromStorage('fm_hiddenClusters', [], true));
  const [hiddenSubClusters, setHiddenSubClusters] = useState(() => loadFromStorage('fm_hiddenSubClusters', [], true));
  const [colors, setColors] = useState(() => loadFromStorage('fm_colors', {}));
  const [expandedClusters, setExpandedClusters] = useState(() => loadFromStorage('fm_expandedClusters', [], true));
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBucketOpen, setIsBucketOpen] = useState(false);
  const [settings, setSettings] = useState(() =>
    loadFromStorage('fm_settings', { showAxisValues: false, showCardCoordinates: false, showQuadrants: false, showViabilityBadges: true })
  );

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const pushState = useCallback((stateToSave) => {
    setPast((prev) => [...prev, stateToSave]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [nodes, ...prev]);
    setNodes(previous);
  }, [past, nodes]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev, nodes]);
    setNodes(next);
  }, [future, nodes]);

  const [outOfRangeNode, setOutOfRangeNode] = useState(null);

  const onNodeDragStart = useCallback(() => {
    pushState(nodes);
  }, [nodes, pushState]);

  const onNodeDragStop = useCallback((_event, node) => {
    if (node.type !== 'featureCard') return;
    const { x, y } = node.position;
    const { xMin, xMax, yMin, yMax } = PERIMETER_BOUNDS;
    if (x < xMin || x > xMax || y < yMin || y > yMax) {
      const snappedPosition = {
        x: Math.max(xMin, Math.min(xMax, x)),
        y: Math.max(yMin, Math.min(yMax, y)),
      };
      setOutOfRangeNode({ id: node.id, snappedPosition });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('fm_nodes', JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    localStorage.setItem('fm_hiddenClusters', JSON.stringify(Array.from(hiddenClusters)));
  }, [hiddenClusters]);

  useEffect(() => {
    localStorage.setItem('fm_hiddenSubClusters', JSON.stringify(Array.from(hiddenSubClusters)));
  }, [hiddenSubClusters]);

  useEffect(() => {
    localStorage.setItem('fm_colors', JSON.stringify(colors));
  }, [colors]);

  useEffect(() => {
    localStorage.setItem('fm_expandedClusters', JSON.stringify(Array.from(expandedClusters)));
  }, [expandedClusters]);

  useEffect(() => {
    localStorage.setItem('fm_settings', JSON.stringify(settings));
  }, [settings]);

  const quadrantNodes = useMemo(() => {
    if (!settings.showQuadrants) return [];
    const mk = (id, x, y, bg, color, borderRadius, label, labelCorner) => ({
      id, type: 'quadrant',
      position: { x, y },
      data: { width: 840, height: 640, bg, color, borderRadius, label, labelCorner },
      draggable: false, selectable: false, zIndex: -3,
    });
    return [
      mk('quad-tl', -40, -40, 'rgba(139,92,246,0.07)', '#7c3aed', '22px 0 0 0', 'Big Bets', 'top-left'),
      mk('quad-tr', 800, -40, 'rgba(16,185,129,0.07)', '#059669', '0 22px 0 0', 'Easy Wins', 'top-right'),
      mk('quad-bl', -40, 600, 'rgba(239,68,68,0.05)', '#dc2626', '0 0 0 22px', 'Why?', 'bottom-left'),
      mk('quad-br', 800, 600, 'rgba(245,158,11,0.07)', '#d97706', '0 0 22px 0', 'Fill Ins', 'bottom-right'),
    ];
  }, [settings.showQuadrants]);

  const axisLabelNodes = useMemo(() => {
    if (!settings.showAxisValues) return [];
    return [
      { id: 'label-x-min', type: 'axisLabel', position: { x: -85, y: 591 }, data: { text: '1' }, draggable: false, selectable: false, zIndex: -1 },
      { id: 'label-x-max', type: 'axisLabel', position: { x: 1645, y: 591 }, data: { text: '4' }, draggable: false, selectable: false, zIndex: -1 },
      { id: 'label-y-min', type: 'axisLabel', position: { x: 808, y: 1247 }, data: { text: '1' }, draggable: false, selectable: false, zIndex: -1 },
      { id: 'label-y-max', type: 'axisLabel', position: { x: 808, y: -67 }, data: { text: '5' }, draggable: false, selectable: false, zIndex: -1 },
    ];
  }, [settings.showAxisValues]);

  const handleClearData = () => {
    localStorage.clear();
    setNodes([]);
    setHiddenClusters(new Set());
    setHiddenSubClusters(new Set());
    setColors({});
    setExpandedClusters(new Set());
    setPast([]);
    setFuture([]);
    setIsConfirmingClear(false);
  };

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      parseCSVs(files, (parsedNodes) => {
        const axisNodes = [
          {
            id: 'x-axis',
            type: 'axis',
            position: { x: -3000, y: 600 },
            data: { horizontal: true, width: 8000, height: 4 },
            draggable: false,
            selectable: false,
            zIndex: -1
          },
          {
            id: 'y-axis',
            type: 'axis',
            position: { x: 800, y: -3000 },
            data: { horizontal: false, width: 4, height: 8000 },
            draggable: false,
            selectable: false,
            zIndex: -1
          },
          {
            id: 'perimeter',
            type: 'perimeter',
            position: { x: -40, y: -40 },
            data: { width: 1680, height: 1280 },
            draggable: false,
            selectable: false,
            zIndex: -2
          }
        ];

        setNodes([...axisNodes, ...parsedNodes]);

        // Auto-assign default colors
        const newColors = {};
        let clusterIdx = 0;
        let subClusterIdx = 0;

        parsedNodes.forEach(node => {
          const { clusterName, subClusterName } = node.data;
          if (!newColors[clusterName]) {
            newColors[clusterName] = DEFAULT_CLUSTER_COLORS[clusterIdx % DEFAULT_CLUSTER_COLORS.length];
            clusterIdx++;
          }
          const subKey = `${clusterName}|${subClusterName}`;
          if (!newColors[subKey]) {
            newColors[subKey] = DEFAULT_SUBCLUSTER_COLORS[subClusterIdx % DEFAULT_SUBCLUSTER_COLORS.length];
            subClusterIdx++;
          }
        });

        setColors(newColors);
        setViewport({ x: 100, y: 100, zoom: 0.8 });
      });
    }
  };

  const handleExport = () => {
    exportToCSV(nodes);
  };

  // Compute Hierarchy
  const hierarchy = useMemo(() => {
    const tree = {};
    nodes.forEach(node => {
      if (node.type === 'axis' || node.type === 'perimeter') return;
      const { clusterName, subClusterName, subClusterExplanation } = node.data;
      if (!tree[clusterName]) {
        tree[clusterName] = { subClusters: {} };
      }
      if (!tree[clusterName].subClusters[subClusterName]) {
        tree[clusterName].subClusters[subClusterName] = { explanation: subClusterExplanation, viability: node.data.viability, nodes: [] };
      }
      tree[clusterName].subClusters[subClusterName].nodes.push(node);
    });
    return tree;
  }, [nodes]);

  // Apply hidden state, colors, and settings to nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map(node => {
        if (node.type === 'axis' || node.type === 'perimeter') return node;

        const { clusterName, subClusterName } = node.data;
        const subKey = `${clusterName}|${subClusterName}`;

        const isHidden = hiddenClusters.has(clusterName) || hiddenSubClusters.has(subKey) || node.data.outOfScope === true;
        const clusterColor = colors[clusterName] || '#bae6fd';
        const subClusterColor = colors[subKey] || '#e0e7ff';
        const showCoordinates = settings.showCardCoordinates;
        const showViabilityBadges = settings.showViabilityBadges;

        if (
          node.hidden !== isHidden ||
          node.data.clusterColor !== clusterColor ||
          node.data.subClusterColor !== subClusterColor ||
          node.data.showCoordinates !== showCoordinates ||
          node.data.showViabilityBadges !== showViabilityBadges
        ) {
          return {
            ...node,
            hidden: isHidden,
            data: { ...node.data, clusterColor, subClusterColor, showCoordinates, showViabilityBadges }
          };
        }
        return node;
      })
    );
  }, [hiddenClusters, hiddenSubClusters, colors, settings.showCardCoordinates, settings.showViabilityBadges, setNodes]);

  const toggleCluster = (clusterName) => {
    setHiddenClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterName)) next.delete(clusterName);
      else next.add(clusterName);
      return next;
    });
  };

  const toggleSubCluster = (subKey) => {
    setHiddenSubClusters(prev => {
      const next = new Set(prev);
      if (next.has(subKey)) next.delete(subKey);
      else next.add(subKey);
      return next;
    });
  };

  const toggleAccordion = (clusterName) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterName)) next.delete(clusterName);
      else next.add(clusterName);
      return next;
    });
  };

  const updateColor = (key, hex) => {
    setColors(prev => ({ ...prev, [key]: hex }));
  };

  const moveToBucket = useCallback((nodeId) => {
    pushState(nodes);
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, hidden: true, data: { ...n.data, outOfScope: true } } : n
    ));
  }, [nodes, pushState]);

  const restoreFromBucket = useCallback((nodeId) => {
    pushState(nodes);
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const { clusterName, subClusterName } = n.data;
      const subKey = `${clusterName}|${subClusterName}`;
      const isHidden = hiddenClusters.has(clusterName) || hiddenSubClusters.has(subKey);
      return { ...n, hidden: isHidden, data: { ...n.data, outOfScope: false } };
    }));
  }, [nodes, pushState, hiddenClusters, hiddenSubClusters]);

  moveToBucketRef.current = moveToBucket;

  const outOfScopeNodes = useMemo(
    () => nodes.filter(n => n.type === 'featureCard' && n.data?.outOfScope === true),
    [nodes]
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#f8fafc' }}>

      {/* Sidebar for Filters */}
      <div style={{
        width: '380px',
        background: 'white',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '1px 0 10px rgba(0,0,0,0.05)',
        zIndex: 10,
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={20} /> Feature Matrix
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>
            Map features by feasibility and desirability.
          </p>
        </div>

        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <button
            onClick={() => setIsBucketOpen(b => !b)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: isBucketOpen ? '#f1f5f9' : 'white', border: isBucketOpen ? '1px solid #94a3b8' : '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '13px', color: '#475569', marginBottom: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Archive size={15} /> Out of Scope
            {outOfScopeNodes.length > 0 && (
              <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '9999px', marginLeft: 'auto' }}>
                {outOfScopeNodes.length}
              </span>
            )}
          </button>

          <h2 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Clusters & Sub-clusters
          </h2>

          {Object.keys(hierarchy).length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
              No clusters found. Upload CSVs to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(hierarchy).map(([clusterName, clusterData]) => {
                const isClusterHidden = hiddenClusters.has(clusterName);
                const isExpanded = expandedClusters.has(clusterName);
                const isClusterSelected = Object.values(clusterData.subClusters).some(sub => sub.nodes.some(n => n.selected));

                return (
                  <div key={clusterName} style={{
                    border: isClusterSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: isClusterSelected
                      ? '0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 8px 10px -6px rgba(59, 130, 246, 0.1)'
                      : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.05)',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* Cluster Header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px',
                      background: isClusterHidden ? '#f1f5f9' : '#f8fafc',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                    }}>
                      <button onClick={() => toggleAccordion(clusterName)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                      <input
                        type="checkbox"
                        checked={!isClusterHidden}
                        onChange={() => toggleCluster(clusterName)}
                        style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: isClusterHidden ? '#94a3b8' : '#0f172a' }}>
                        {clusterName}
                      </span>
                      <CustomColorPicker
                        color={colors[clusterName] || '#000000'}
                        onChange={(hex) => updateColor(clusterName, hex)}
                        size={24}
                      />
                    </div>

                    {/* Sub-clusters */}
                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 8px 8px 24px', background: 'white' }}>
                        {Object.entries(clusterData.subClusters).map(([subName, subData]) => {
                          const subKey = `${clusterName}|${subName}`;
                          const isSubHidden = hiddenSubClusters.has(subKey) || isClusterHidden;
                          const isSubClusterSelected = subData.nodes.some(n => n.selected);

                          return (
                            <div key={subKey} style={{
                              border: isSubClusterSelected ? '2px solid #93c5fd' : '1px solid #e2e8f0',
                              borderRadius: '6px',
                              background: isSubClusterSelected ? '#eff6ff' : '#f8fafc',
                              overflow: 'hidden',
                              transition: 'all 0.3s ease'
                            }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={!isSubHidden}
                                  onChange={() => toggleSubCluster(subKey)}
                                  disabled={isClusterHidden}
                                  style={{ width: '14px', height: '14px', accentColor: '#3b82f6', cursor: isClusterHidden ? 'not-allowed' : 'pointer', opacity: isClusterHidden ? 0.5 : 1 }}
                                />
                                <span style={{ flex: 1, fontSize: '13px', color: isSubHidden ? '#94a3b8' : '#334155' }}>
                                  {subName} ({subData.nodes.length})
                                </span>

                                {subData.viability && settings.showViabilityBadges && (
                                  <div
                                    style={{ cursor: 'help', display: 'flex', alignItems: 'center' }}
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredTooltip({
                                        text: 'Note: Long term business impact considering: TAM, Revenue potential, DT right-to-play, Global scalability',
                                        top: rect.top + window.scrollY + rect.height / 2,
                                        left: rect.right + window.scrollX + 10
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredTooltip(null)}
                                  >
                                    <span style={{
                                      background: subData.viability === 'A' ? '#dcfce7' : '#f1f5f9',
                                      color: subData.viability === 'A' ? '#166534' : '#64748b',
                                      border: `1px solid ${subData.viability === 'A' ? '#86efac' : '#cbd5e1'}`,
                                      borderRadius: '9999px', padding: '1px 6px',
                                      fontSize: '9px', fontWeight: 700,
                                      userSelect: 'none',
                                    }}>
                                      {subData.viability === 'A' ? 'Sustainable business impact' : 'No major business impact'}
                                    </span>
                                  </div>
                                )}

                                <div
                                  style={{ color: '#94a3b8', cursor: 'help', display: 'flex', alignItems: 'center' }}
                                  onMouseEnter={(e) => {
                                    if (subData.explanation) {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHoveredTooltip({
                                        text: subData.explanation,
                                        top: rect.top + window.scrollY + rect.height / 2,
                                        left: rect.right + window.scrollX + 10
                                      });
                                    }
                                  }}
                                  onMouseLeave={() => setHoveredTooltip(null)}
                                >
                                  <Info size={14} />
                                </div>

                                <CustomColorPicker
                                  color={colors[subKey] || '#000000'}
                                  onChange={(hex) => updateColor(subKey, hex)}
                                  size={20}
                                />
                              </div>

                              {!isSubHidden && (
                                <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '4px' }}>
                                  {subData.nodes.map(n => (
                                    <div
                                      key={n.id}
                                      onClick={() => {
                                        setNodes(nds => nds.map(node => ({
                                          ...node,
                                          selected: node.id === n.id
                                        })));
                                      }}
                                      style={{
                                        margin: '2px 8px 4px 8px',
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        color: n.selected ? '#1e40af' : '#475569',
                                        background: 'transparent',
                                        fontWeight: n.selected ? 600 : 400,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      {n.data.title}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {isBucketOpen && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '320px',
            background: 'white', borderLeft: '1px solid #e2e8f0',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
            zIndex: 100, display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Archive size={18} color="#64748b" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Out of Scope</h3>
                {outOfScopeNodes.length > 0 && (
                  <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '11px', fontWeight: 700, padding: '1px 8px', borderRadius: '9999px' }}>
                    {outOfScopeNodes.length}
                  </span>
                )}
              </div>
              <button onClick={() => setIsBucketOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {outOfScopeNodes.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '24px 0', margin: 0 }}>
                  No cards out of scope.<br />Cards with missing coordinates are placed here automatically, or move any card using the <Archive size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> icon.
                </p>
              ) : (
                outOfScopeNodes.map(node => (
                  <div key={node.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>{node.data.title}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {node.data.clusterName && (
                        <span style={{ background: node.data.clusterColor || '#e2e8f0', color: '#0f172a', padding: '1px 6px', borderRadius: '9999px', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {node.data.clusterName}
                        </span>
                      )}
                      {node.data.subClusterName && (
                        <span style={{ background: node.data.subClusterColor || '#e2e8f0', color: '#334155', padding: '1px 4px', borderRadius: '4px', fontSize: '8px', fontWeight: 600, border: '1px solid rgba(0,0,0,0.05)' }}>
                          {node.data.subClusterName}
                        </span>
                      )}
                    </div>
                    {node.data.missingCoords ? (
                      <div
                        title="Missing coordinate data — this card has no position and cannot be placed on the canvas"
                        style={{ cursor: 'not-allowed', display: 'inline-flex' }}
                      >
                        <button
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', color: '#cbd5e1', fontWeight: 500, pointerEvents: 'none', cursor: 'not-allowed' }}
                        >
                          <RotateCcw size={11} /> Restore to canvas
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => restoreFromBucket(node.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'white', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', color: '#475569', fontWeight: 500 }}
                      >
                        <RotateCcw size={11} /> Restore to canvas
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <ReactFlow
          nodes={[...quadrantNodes, ...nodes, ...axisLabelNodes]}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ nodes: [{ id: 'perimeter' }], padding: 0.05 }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={true}
          multiSelectionKeyCode={null}
        >
          <Background gap={50} size={1} color="#e2e8f0" />
          <Controls fitViewOptions={{ nodes: [{ id: 'perimeter' }], padding: 0.05 }} />

          {/* Axis Labels Overlay */}
          <Panel position="bottom-center" style={{ marginBottom: '20px', pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '8px 16px',
              borderRadius: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontWeight: 600,
              color: '#475569',
              border: '1px solid #cbd5e1'
            }}>
              Feasibility (X-Axis) ➔
            </div>
          </Panel>

          <Panel position="left-center" style={{ marginLeft: '20px', pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '8px 16px',
              borderRadius: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontWeight: 600,
              color: '#475569',
              border: '1px solid #cbd5e1',
              transform: 'rotate(-90deg)',
              transformOrigin: 'left center'
            }}>
              Desirability (Y-Axis) ➔
            </div>
          </Panel>

          <Panel position="top-right" style={{ display: 'flex', gap: '10px', padding: '10px' }}>
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', color: '#475569' }}
            >
              <Settings size={18} /> Settings
            </button>
            <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
              <button
                onClick={undo}
                disabled={past.length === 0}
                title="Undo (Cmd+Z)"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', width: '36px', height: '36px', borderRadius: '6px', cursor: past.length === 0 ? 'default' : 'pointer', opacity: past.length === 0 ? 0.5 : 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '20px', fontWeight: 'bold', color: '#475569' }}
              >
                ↶
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                title="Redo (Cmd+Shift+Z)"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', width: '36px', height: '36px', borderRadius: '6px', cursor: future.length === 0 ? 'default' : 'pointer', opacity: future.length === 0 ? 0.5 : 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '20px', fontWeight: 'bold', color: '#475569' }}
              >
                ↷
              </button>
            </div>
            <input
              type="file"
              accept=".csv"
              multiple
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <Upload size={18} /> Upload CSV(s)
            </button>
            <button
              className="primary"
              onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              disabled={nodes.length === 0}
            >
              <Download size={18} /> Export Coordinates
            </button>
            {nodes.length > 0 && (
              <button
                onClick={() => setIsConfirmingClear(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                <Trash2 size={18} /> Clear Data
              </button>
            )}
          </Panel>
        </ReactFlow>
      </div>

      {hoveredTooltip && createPortal(
        <div style={{
          position: 'absolute',
          left: `${hoveredTooltip.left}px`,
          top: `${hoveredTooltip.top}px`,
          transform: 'translateY(-50%)',
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          whiteSpace: 'normal',
          maxWidth: '250px',
          lineHeight: '1.4',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {hoveredTooltip.text}
          <div style={{
            position: 'absolute',
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: 'transparent #1e293b transparent transparent'
          }} />
        </div>,
        document.body
      )}

      {isSettingsOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxWidth: '420px',
            width: '90%'
          }}>
            <div style={{ background: '#eff6ff', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <Settings size={24} color="#3b82f6" />
            </div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#0f172a', textAlign: 'center' }}>Settings</h3>

            {/* Toggle: Show axis values */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Show axis values</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>Display min / max labels at the edges of the X and Y axes</div>
              </div>
              <ToggleSwitch
                checked={settings.showAxisValues}
                onChange={() => setSettings(s => ({ ...s, showAxisValues: !s.showAxisValues }))}
              />
            </div>

            {/* Toggle: Show card coordinates */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Show card coordinates</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>Show Desirability and Feasibility values on each card when expanded</div>
              </div>
              <ToggleSwitch
                checked={settings.showCardCoordinates}
                onChange={() => setSettings(s => ({ ...s, showCardCoordinates: !s.showCardCoordinates }))}
              />
            </div>

            {/* Toggle: Viability badges */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Show viability badges</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>Show A / B viability rating on sub-cluster cards</div>
              </div>
              <ToggleSwitch
                checked={settings.showViabilityBadges}
                onChange={() => setSettings(s => ({ ...s, showViabilityBadges: !s.showViabilityBadges }))}
              />
            </div>

            {/* Toggle: Highlight quadrants */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Highlight quadrants</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>Colour the four quadrants and show their names — Easy Wins, Big Bets, Fill Ins, Why?</div>
              </div>
              <ToggleSwitch
                checked={settings.showQuadrants}
                onChange={() => setSettings(s => ({ ...s, showQuadrants: !s.showQuadrants }))}
              />
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{ marginTop: '24px', width: '100%', background: '#1e293b', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      {outOfRangeNode && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            background: 'white', padding: '32px', borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            maxWidth: '400px', width: '90%', textAlign: 'center'
          }}>
            <div style={{ background: '#fef9c3', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Archive size={24} color="#ca8a04" />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#0f172a' }}>Move to Out of Scope?</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              This card was dragged outside the canvas bounds. Do you want to move it to Out of Scope, or snap it back to the nearest valid position?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setNodes(nds => nds.map(n =>
                    n.id === outOfRangeNode.id
                      ? { ...n, hidden: true, data: { ...n.data, outOfScope: true } }
                      : n
                  ));
                  setOutOfRangeNode(null);
                }}
                style={{ flex: 1, background: '#1e293b', color: 'white', border: 'none', padding: '10px 0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Yes, Out of Scope
              </button>
              <button
                onClick={() => {
                  setNodes(nds => nds.map(n =>
                    n.id === outOfRangeNode.id
                      ? { ...n, position: outOfRangeNode.snappedPosition }
                      : n
                  ));
                  setOutOfRangeNode(null);
                }}
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                No, Snap Back
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isConfirmingClear && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <div style={{ background: '#fee2e2', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Trash2 size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#0f172a' }}>Clear All Data?</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to clear the entire matrix? This will remove all uploaded feature cards and reset your custom colors. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsConfirmingClear(false)}
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px 0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
