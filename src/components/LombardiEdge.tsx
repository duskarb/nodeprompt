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
          stroke: '#000000',
          strokeWidth: selected ? 2 : 1,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              fontWeight: 400,
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
              letterSpacing: '-0.01em',
              pointerEvents: 'all',
              backgroundColor: '#FFFFFF',
              color: '#000000',
              padding: '2px 8px',
              border: `1px solid #000000`,
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
