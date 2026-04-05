import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, EdgeProps } from '@xyflow/react';
import { getEdgeParams } from '../lib/flow-utils';
import { ThemeContext } from '../App';

export const LombardiEdge = ({ id, source, target, style = {}, markerEnd, label, selected }: EdgeProps) => {
  const rf = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label as string);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(label as string);
  };

  const submitEdit = () => {
    setIsEditing(false);
    rf.setEdges((eds) =>
      eds.map((e) => {
        if (e.id === id) {
          return { ...e, label: editValue };
        }
        return e;
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(label as string);
    }
  };
  const sourceNode = rf.getNode(source);
  const targetNode = rf.getNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

  const { isDarkMode } = React.useContext(ThemeContext);

  const edgeColorNormal = isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.18)';
  const edgeColorSelected = isDarkMode ? '#ffffff' : '#000000';
  const shadowFilter = isDarkMode ? 'drop-shadow(0 0 8px rgba(255,255,255,0.8))' : 'drop-shadow(0 0 4px rgba(0,0,0,0.3))';

  const dynamicMarkerEnd = React.useMemo(() => {
    if (markerEnd && typeof markerEnd === 'object') {
      return { ...(markerEnd as any), color: selected ? edgeColorSelected : edgeColorNormal };
    }
    return markerEnd;
  }, [markerEnd, selected, edgeColorSelected, edgeColorNormal]);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={dynamicMarkerEnd}
        style={{
          ...style,
          stroke: selected ? edgeColorSelected : edgeColorNormal,
          strokeWidth: selected ? (Number(style.strokeWidth || 1) + 2) : (style.strokeWidth || 1),
          filter: selected ? shadowFilter : 'none',
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            onDoubleClick={handleDoubleClick}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 13,
              fontWeight: 400,
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
              letterSpacing: '-0.01em',
              pointerEvents: 'all',
              backgroundColor: isDarkMode ? '#000000' : 'rgba(255,255,255,0.88)',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              padding: '4px 10px',
              borderRadius: 8,
              boxShadow: isDarkMode ? '0 0 12px rgba(255,255,255,0.2), 0 0 0 1px rgba(255,255,255,0.1)' : '0 1px 6px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              cursor: 'text',
            }}
            className="nodrag nopan"
          >
            {isEditing ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={submitEdit}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDarkMode ? '#FFFFFF' : '#000000',
                  outline: 'none',
                  width: `${Math.max(editValue.length, 1) * 8}px`,
                  minWidth: '30px',
                  textAlign: 'center',
                }}
              />
            ) : (
              (label as string)
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
