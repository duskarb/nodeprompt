import { Node, Edge, Position } from '@xyflow/react';
import dagre from 'dagre';

export const getNodeSize = (mentions: number = 10) => {
  return Math.max(180, 120 + (mentions / 100) * 350);
};

export function getEdgeParams(source: Node, target: Node) {
  const sSize = getNodeSize(source.data?.mentions as number);
  const tSize = getNodeSize(target.data?.mentions as number);

  const sw = source.measured?.width ?? sSize;
  const sh = source.measured?.height ?? sSize;
  const tw = target.measured?.width ?? tSize;
  const th = target.measured?.height ?? tSize;

  const scx = source.position.x + sw / 2;
  const scy = source.position.y + sh / 2;
  const tcx = target.position.x + tw / 2;
  const tcy = target.position.y + th / 2;

  const dx = tcx - scx;
  const dy = tcy - scy;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d === 0) {
    return { sx: scx, sy: scy, tx: tcx, ty: tcy, sourcePos: Position.Top, targetPos: Position.Bottom };
  }

  const sRadius = sw / 2;
  const tRadius = tw / 2 + 4;

  const sx = scx + (dx / d) * sRadius;
  const sy = scy + (dy / d) * sRadius;
  const tx = tcx - (dx / d) * tRadius;
  const ty = tcy - (dy / d) * tRadius;

  let sourcePos = Position.Bottom;
  let targetPos = Position.Top;

  if (Math.abs(dx) > Math.abs(dy)) {
    sourcePos = dx > 0 ? Position.Right : Position.Left;
    targetPos = dx > 0 ? Position.Left : Position.Right;
  } else {
    sourcePos = dy > 0 ? Position.Bottom : Position.Top;
    targetPos = dy > 0 ? Position.Top : Position.Bottom;
  }

  return { sx, sy, tx, ty, sourcePos, targetPos };
}

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'RADIAL') => {
  if (direction === 'CIRCLE' || direction === 'RADIAL') {
    if (nodes.length === 0) return { nodes, edges };

    let hubNodeId = nodes[0].id;
    if (direction === 'RADIAL') {
      const degrees: Record<string, number> = {};
      edges.forEach(edge => {
        degrees[edge.source] = (degrees[edge.source] || 0) + 1;
        degrees[edge.target] = (degrees[edge.target] || 0) + 1;
      });
      let maxDegree = -1;
      nodes.forEach(node => {
        if ((degrees[node.id] || 0) > maxDegree) {
          maxDegree = degrees[node.id] || 0;
          hubNodeId = node.id;
        }
      });
    }

    const centerX = 0;
    const centerY = 0;
    
    if (direction === 'CIRCLE') {
      const sizes = nodes.map(n => getNodeSize(n.data?.mentions as number));
      const totalSize = sizes.reduce((a, b) => a + b, 0);
      const maxRadiusSum = Math.max(...sizes);
      
      const n = nodes.length;
      const minRadiusForSpacing = n > 1 
        ? (1.5 * maxRadiusSum) / (2 * Math.sin(Math.PI / n))
        : 0;
      
      const radius = Math.max(minRadiusForSpacing, (1.5 * totalSize) / (2 * Math.PI), 1200);
      
      const newNodes = nodes.map((node, index) => {
        const size = getNodeSize(node.data?.mentions as number);
        const angle = (index / nodes.length) * 2 * Math.PI;
        
        return {
          ...node,
          position: {
            x: centerX + radius * Math.cos(angle) - size / 2,
            y: centerY + radius * Math.sin(angle) - size / 2,
          },
        };
      });
      return { nodes: newNodes, edges };
    } else {
      const otherNodes = nodes.filter(n => n.id !== hubNodeId);
      
      const hubStrengths: Record<string, number> = {};
      edges.forEach(edge => {
        const strength = (edge.data?.strength as number) || 5;
        if (edge.source === hubNodeId) hubStrengths[edge.target] = Math.max(hubStrengths[edge.target] || 0, strength);
        if (edge.target === hubNodeId) hubStrengths[edge.target] = Math.max(hubStrengths[edge.target] || 0, strength);
        if (edge.target === hubNodeId) hubStrengths[edge.source] = Math.max(hubStrengths[edge.source] || 0, strength);
      });

      const hubNode = nodes.find(n => n.id === hubNodeId);
      const hubSize = getNodeSize(hubNode?.data?.mentions as number);
      const hubRadius = hubSize / 2;

      const newNodes = nodes.map((node) => {
        const nodeSize = getNodeSize(node.data?.mentions as number);
        
        if (node.id === hubNodeId) {
          return { ...node, position: { x: centerX - nodeSize / 2, y: centerY - nodeSize / 2 } };
        }
        
        const index = otherNodes.findIndex(n => n.id === node.id);
        const angle = (index / otherNodes.length) * 2 * Math.PI;
        
        const strength = hubStrengths[node.id] || 1;
        const nodeRadius = nodeSize / 2;

        const minHubDist = 2.0 * (hubRadius + nodeRadius);
        const maxHubDist = 5.0 * (hubRadius + nodeRadius);
        const baseRadius = maxHubDist - ((Math.min(15, strength) - 1) / 14) * (maxHubDist - minHubDist);
        
        const deltaTheta = (2 * Math.PI) / Math.max(1, otherNodes.length);
        const minRadiusForSiblings = otherNodes.length > 1
          ? (1.5 * (nodeSize)) / (2 * Math.sin(deltaTheta / 2))
          : 0;

        const radius = Math.max(baseRadius, minRadiusForSiblings, 1200);
        
        return {
          ...node,
          position: {
            x: centerX + radius * Math.cos(angle) - nodeSize / 2,
            y: centerY + radius * Math.sin(angle) - nodeSize / 2,
          },
        };
      });
      return { nodes: newNodes, edges };
    }
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 2000; 
  const nodeHeight = 1000; 

  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 800, 
    ranksep: 1200, 
    marginx: 500,
    marginy: 500,
    ranker: 'network-simplex'
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};
