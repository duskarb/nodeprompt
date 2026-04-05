import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getNodeSize } from '../lib/flow-utils';
import { cn } from '../lib/utils';

export const CustomNode = ({ data, selected }: NodeProps) => {
  const strength = (data.strength as number) || 5;
  const highlighted = (data.highlighted as boolean) || false;
  const isAnyHighlighted = (data.isAnyHighlighted as boolean) || false;
  const size = getNodeSize(strength);

  // Font size scales with node size but stays readable
  const fontSize = Math.min(28, Math.max(22, size * 0.13));

  // Three visual states:
  // selected/highlighted → black fill, white text (interaction)
  // default   → white fill, black text
  const bgColor = selected || highlighted ? '#1a1a1a' : '#FFFFFF';
  const textColor = selected || highlighted ? '#FFFFFF' : '#1a1a1a';
  const opacity = isAnyHighlighted && !highlighted ? 0.2 : 1;
  const scale = highlighted ? 1.1 : 1;

  const boxShadow = selected
    ? '0 0 0 3px rgba(100,60,255,0.50), 0 8px 32px rgba(100,60,255,0.22), 0 2px 16px rgba(0,0,0,0.12)'
    : highlighted
    ? '0 0 0 2.5px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)'
    : '0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.07)';

  return (
    <div
      className={cn("flex flex-col items-center justify-center group relative")}
      style={{
        zIndex: 10,
        width: size,
        height: size,
        opacity,
        transform: `scale(${scale})`,
        borderRadius: '50%',
        boxShadow,
        transition: 'opacity 200ms ease, transform 200ms ease, box-shadow 200ms ease'
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
          borderWidth: 0,
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
