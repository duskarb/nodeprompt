import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getNodeSize } from '../lib/flow-utils';
import { cn } from '../lib/utils';

export const CustomNode = ({ data, selected }: NodeProps) => {
  const mentions = (data.mentions as number) || 10;
  const highlighted = (data.highlighted as boolean) || false;
  const isAnyHighlighted = (data.isAnyHighlighted as boolean) || false;
  const size = getNodeSize(mentions);

  // Font size scales with node size but stays readable
  const fontSize = Math.min(14, Math.max(11, size * 0.065));

  // Three visual states:
  // selected/highlighted → black fill, white text (interaction)
  // default   → white fill, black text
  const bgColor = selected || highlighted ? '#000000' : '#FFFFFF';
  const textColor = selected || highlighted ? '#FFFFFF' : '#000000';
  const borderWidth = selected || highlighted ? 2 : 1;
  const opacity = isAnyHighlighted && !highlighted ? 0.2 : 1;
  const scale = highlighted ? 1.1 : 1;

  return (
    <div
      className={cn("flex flex-col items-center justify-center group relative")}
      style={{ 
        zIndex: 10, 
        width: size, 
        height: size,
        opacity,
        transform: `scale(${scale})`,
        transition: 'opacity 200ms ease, transform 200ms ease'
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          top: 0,
          left: 0,
          transform: 'none',
          zIndex: 0,
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          top: 0,
          left: 0,
          transform: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="apple-node absolute inset-0 pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: bgColor,
          color: textColor,
          borderWidth,
          borderColor: '#000000',
          fontSize,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          fontWeight: 400,
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
          overflow: 'hidden',
          zIndex: 1,
          padding: 0,
          transition: 'background-color 120ms linear, color 120ms linear',
        }}
      >
        <div
          className="w-[72%] h-[72%] rounded-full flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing"
          style={{ pointerEvents: 'auto' }}
        >
          <span
            className="whitespace-normal break-words max-w-full max-h-full px-2 flex items-center justify-center text-center"
            style={{ overflow: 'hidden' }}
          >
            {data.label as string}
          </span>
        </div>
      </div>
    </div>
  );
};
