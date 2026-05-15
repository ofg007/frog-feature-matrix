import { useState } from 'react';
import { ChevronDown, GripHorizontal, Archive } from 'lucide-react';

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

  const avgFeasibility = (positionAbsoluteX / 400 + 1).toFixed(1);
  const desirability = (5 - positionAbsoluteY / 300).toFixed(1);

  const showArrow = data.viability === 'A' && data.showViabilityBadges !== false;

  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      border: `1.5px solid ${selected ? '#3b82f6' : isExpanded ? '#c7d2fe' : '#e2e8f0'}`,
      padding: '8px 10px 8px',
      paddingTop: '18px',
      width: isExpanded ? '300px' : '180px',
      boxShadow: selected
        ? '0 8px 24px -4px rgba(59, 130, 246, 0.22)'
        : isExpanded
          ? '0 8px 20px -4px rgba(0,0,0,0.12)'
          : '0 2px 8px rgba(0,0,0,0.07)',
      transition: 'width 0.25s ease, box-shadow 0.2s, border-color 0.2s',
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
              padding: '8px 10px', borderRadius: '6px',
              fontSize: '10px', lineHeight: 1.5,
              whiteSpace: 'normal', width: '200px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
              pointerEvents: 'none', zIndex: 9999,
            }}>
              <div style={{ fontWeight: 700, marginBottom: data.viabilityComment ? '5px' : 0 }}>
                Sustainable business impact
              </div>
              {data.viabilityComment && (
                <div style={{ color: '#94a3b8' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Reason: </span>
                  {data.viabilityComment}
                </div>
              )}
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
        paddingRight: showArrow ? '28px' : 0,
      }}>
        {data.title}
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {data.clusterName && (
          <span style={{ ...TAG, background: data.clusterColor || '#94a3b8', color: 'white', border: 'none' }}>
            {data.clusterName}
          </span>
        )}
        {data.subClusterName && (
          <span style={{ ...TAG, background: 'transparent', color: '#334155', border: `1px solid ${data.clusterColor || '#94a3b8'}` }}>
            {data.subClusterName}
          </span>
        )}
      </div>

      {/* Expanding section */}
      <div style={{
        overflow: 'hidden',
        maxHeight: isExpanded ? '500px' : '0px',
        opacity: isExpanded ? 1 : 0,
        transition: 'max-height 0.3s ease, opacity 0.25s ease',
      }}>
        <div style={{
          marginTop: '10px',
          background: '#f8fafc',
          borderRadius: '6px',
          padding: '10px',
          borderTop: '1px solid #e2e8f0',
        }}>
          {data.description && (
            <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '11px', lineHeight: 1.6 }}>
              {data.description}
            </p>
          )}
          {data.showCoordinates && (
            <div style={{
              borderTop: data.description ? '1px solid #e2e8f0' : 'none',
              paddingTop: data.description ? '8px' : '0',
              display: 'flex', flexDirection: 'column', gap: '3px',
            }}>
              {/* Individual feasibility — both label and value grey */}
              {[['Technical Feasibility', data.techFeasibility], ['Business Feasibility', data.bizFeasibility], ['Legal Feasibility', data.legalFeasibility]].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                  <span>{label}</span><span>{val?.toFixed(1) ?? '—'}</span>
                </div>
              ))}
              {/* Divider */}
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '2px 0' }} />
              {/* Avg. Feasibility and Desirability — label and value black, bold */}
              {[['Avg. Feasibility', avgFeasibility], ['Desirability', desirability]].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                  <span>{label}</span><span>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row — archive left, expand/collapse right */}
      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center' }}>
        <div
          onClick={(e) => { e.stopPropagation(); moveToBucketRef.current?.(id); }}
          title="Move to Out of Scope"
          style={{ cursor: 'pointer', color: '#e2e8f0', transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#e2e8f0'}
        >
          <Archive size={11} />
        </div>
        <div style={{ flex: 1 }} />
        <div
          onClick={(e) => { e.stopPropagation(); setIsExpanded(x => !x); }}
          style={{
            cursor: 'pointer', color: '#d1d5db', display: 'flex', alignItems: 'center',
            transform: isExpanded ? 'rotate(135deg)' : 'rotate(-45deg)',
            transition: 'transform 0.25s ease, color 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#94a3b8'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
        >
          <ChevronDown size={13} />
        </div>
      </div>
    </div>
  );
};

export default FeatureCardNode;
