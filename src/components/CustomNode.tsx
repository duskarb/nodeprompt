import React, { useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { getNodeSize } from '../lib/flow-utils';
import { cn } from '../lib/utils';
import { ThemeContext } from '../App';

export const CustomNode = ({ id, data, selected }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label as string);
  const { setNodes } = useReactFlow();

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(data.label as string);
  };

  const submitEdit = () => {
    setIsEditing(false);
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, label: editValue } };
        }
        return n;
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(data.label as string);
    }
  };
  const strength = (data.strength as number) || 5;
  const highlighted = (data.highlighted as boolean) || false;
  const isAnyHighlighted = (data.isAnyHighlighted as boolean) || false;
  const size = getNodeSize(strength);
  const { isDarkMode } = React.useContext(ThemeContext);

  // Font size scales with node size but stays readable
  const fontSize = Math.min(28, Math.max(22, size * 0.13));

  // Three visual states (Dark Mode / Light Mode):
  const bgColor = isDarkMode 
    ? (selected || highlighted ? '#111111' : '#000000') 
    : (selected || highlighted ? '#EAEAEA' : '#FFFFFF');
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const opacity = isAnyHighlighted && !highlighted ? 0.2 : 1;
  const scale = highlighted ? 1.1 : 1;

  const c = isDarkMode ? '255,255,255' : '0,0,0';
  const boxShadow = selected
    ? `0 0 24px rgba(${c},0.6), inset 0 0 12px rgba(${c},0.2)`
    : highlighted
    ? `0 0 16px rgba(${c},0.4), inset 0 0 8px rgba(${c},0.1)`
    : `0 0 8px rgba(${c},0.15), inset 0 0 4px rgba(${c},0.05)`;

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
          onDoubleClick={handleDoubleClick}
        >
          {isEditing ? (
            <input
              autoFocus
              className="bg-transparent text-center focus:outline-none w-full h-full px-2 pointer-events-auto"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={submitEdit}
              style={{ color: textColor }}
            />
          ) : (
            <span
              className="whitespace-normal break-words max-w-full max-h-full px-2 flex items-center justify-center text-center"
              style={{ overflow: 'hidden' }}
            >
              {data.label as string}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
