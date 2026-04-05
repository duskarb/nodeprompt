import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, EdgeProps } from '@xyflow/react';
import { getEdgeParams } from '../lib/flow-utils';

export const LombardiEdge = ({ id, source, target, style = {}, markerEnd, label, selected }: EdgeProps) => {
  const rf = useReactFlow();
  const sourceNode = rf.getNode(source);
  const targetNode = rf.getNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

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
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? 'rgba(100,60,255,0.6)' : 'rgba(0,0,0,0.18)',
          strokeWidth: selected ? 2 : 1,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 13,
              fontWeight: 400,
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
              letterSpacing: '-0.01em',
              pointerEvents: 'all',
              backgroundColor: 'rgba(255,255,255,0.88)',
              color: '#000000',
              padding: '2px 8px',
              borderRadius: 6,
              boxShadow: '0 1px 6px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
              whiteSpace: 'nowrap',
              zIndex: 1000,
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
