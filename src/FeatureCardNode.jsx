import { useState } from 'react';
import { ChevronDown, ChevronUp, GripHorizontal, Archive } from 'lucide-react';

export const moveToBucketRef = { current: null };

const TAG = {
  background: 'transparent',
  padding: '2px 7px',
  borderRadius: '9999px',
  fontSize: '9px',
  fontWeight: 600,
  color: '#1e293b',
  border: '1px solid rgba(0,0,0,0.10)',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  lineHeight: 1.3,
};

const FeatureCardNode = ({ id, data, selected, positionAbsoluteX, positionAbsoluteY }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showViabilityTooltip, setShowViabilityTooltip] = useState(false);

  const feasibility = (positionAbsoluteX / 400 + 1).toFixed(1);
  const desirability = (5 - positionAbsoluteY / 300).toFixed(1);

  const showArrow = data.viability === 'A' && data.showViabilityBadges !== false;

  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      border: `1.5px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
      padding: '8px 10px 8px',
      paddingTop: '18px',
      width: '180px',
      boxShadow: selected
        ? '0 8px 24px -4px rgba(59, 130, 246, 0.22)'
        : '0 2px 8px rgba(0,0,0,0.07)',
      transition: 'box-shadow 0.2s, border-color 0.2s',
      position: 'relative',
    }}>

      {/* Drag handle */}
      <div className="custom-drag-handle" style={{
        position: 'absolute', top: '5px', left: '50%',
        transform: 'translateX(-50%)',
        cursor: 'grab', color: '#d1d5db',
        display: 'flex', alignItems: 'center',
      }}>
        <GripHorizontal size={14} />
      </div>

      {/* Viability arrow — only shown for A */}
      {showArrow && (
        <div
          style={{ position: 'absolute', top: '4px', right: '8px', zIndex: 10 }}
          onMouseEnter={() => setShowViabilityTooltip(true)}
          onMouseLeave={() => setShowViabilityTooltip(false)}
        >
          <div style={{
            display: 'flex', alignItems: 'center',
            background: '#dcfce7', color: '#166534',
            border: '1px solid #86efac',
            borderRadius: '9999px', padding: '1px 5px',
            fontSize: '10px', fontWeight: 700,
            cursor: 'default', userSelect: 'none',
          }}>
            ↗
          </div>
          {showViabilityTooltip && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: '#1e293b', color: 'white',
              padding: '6px 10px', borderRadius: '6px',
              fontSize: '10px', lineHeight: 1.4,
              whiteSpace: 'normal', width: '170px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
              pointerEvents: 'none', zIndex: 9999,
            }}>
              Sustainable business impact
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <p style={{
        margin: '0 0 7px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#1e293b',
        lineHeight: 1.35,
      }}>
        {data.title}
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {data.clusterName && (
          <span style={{ ...TAG, background: data.clusterColor || '#e2e8f0', border: 'none' }}>
            {data.clusterName}
          </span>
        )}
        {data.subClusterName && (
          <span style={{ ...TAG, background: data.subClusterColor || '#f1f5f9', border: 'none' }}>
            {data.subClusterName}
          </span>
        )}
      </div>

      {/* Expanding section */}
      <div style={{
        overflow: 'hidden',
        maxHeight: isExpanded ? '250px' : '0px',
        opacity: isExpanded ? 1 : 0,
        transition: 'max-height 0.3s ease, opacity 0.25s ease',
      }}>
        <div style={{ paddingTop: '10px' }}>
          {data.description && (
            <p style={{ margin: 0, color: '#64748b', fontSize: '11px', lineHeight: 1.5 }}>
              {data.description}
            </p>
          )}
          {data.showCoordinates && (
            <div style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '7px', marginTop: '8px',
              display: 'flex', flexDirection: 'column', gap: '3px',
            }}>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                Desirability <strong style={{ color: '#475569', fontWeight: 600 }}>{desirability}</strong>
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                Feasibility <strong style={{ color: '#475569', fontWeight: 600 }}>{feasibility}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }} />
        <div
          onClick={(e) => { e.stopPropagation(); setIsExpanded(x => !x); }}
          style={{ cursor: 'pointer', color: '#d1d5db', transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#94a3b8'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
        >
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div
            onClick={(e) => { e.stopPropagation(); moveToBucketRef.current?.(id); }}
            title="Move to Out of Scope"
            style={{ cursor: 'pointer', color: '#e2e8f0', transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#e2e8f0'}
          >
            <Archive size={11} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureCardNode;
