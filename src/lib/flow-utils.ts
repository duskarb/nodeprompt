import { Node, Edge, Position } from '@xyflow/react';
import dagre from 'dagre';

export const getNodeSize = (strength: number = 5) => {
  return Math.max(120, 100 + strength * 15);
};

export function getEdgeParams(source: Node, target: Node) {
  const sSize = getNodeSize(source.data?.strength as number);
  const tSize = getNodeSize(target.data?.strength as number);

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
      const sizes = nodes.map(n => getNodeSize(n.data?.strength as number));
      const totalSize = sizes.reduce((a, b) => a + b, 0);
      const maxRadiusSum = Math.max(...sizes);
      
      const n = nodes.length;
      const minRadiusForSpacing = n > 1 
        ? (1.5 * maxRadiusSum) / (2 * Math.sin(Math.PI / n))
        : 0;
      
      const radius = Math.max(minRadiusForSpacing, (1.5 * totalSize) / (2 * Math.PI), 1200);
      
      const newNodes = nodes.map((node, index) => {
        const size = getNodeSize(node.data?.strength as number);
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
      // Force-directed layout for organic clustering around the hub
      const iterations = 300;
      const k = 150; // Optimal resting distance (reduced heavily)
      
      const n = nodes.length;
      let simNodes = nodes.map((node, i) => {
        const radius = 100; // Reduced initial spawn radius
        const angle = (i / n) * 2 * Math.PI;
        return {
          id: node.id,
          x: node.id === hubNodeId ? centerX : centerX + Math.cos(angle) * radius,
          y: node.id === hubNodeId ? centerY : centerY + Math.sin(angle) * radius,
          size: getNodeSize(node.data?.strength as number),
          vx: 0,
          vy: 0
        };
      });

      for (let iter = 0; iter < iterations; iter++) {
        const temperature = Math.max(1, 100 * (1 - iter / iterations));
        
        simNodes.forEach(node1 => {
          node1.vx = 0;
          node1.vy = 0;
        });

        // Repulsion
        for(let i=0; i<simNodes.length; i++) {
          for(let j=i+1; j<simNodes.length; j++) {
            const n1 = simNodes[i];
            const n2 = simNodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const minDist = (n1.size + n2.size) / 2 + 20; // Reduced gap dramatically
            
            let repulse = 0;
            if (dist < minDist) {
              repulse = 500 / dist; // Strong collision bounce
            } else {
              repulse = (k * k * 0.2) / dist; // Weaker standard repulsion
            }
            
            const fx = (dx / dist) * repulse;
            const fy = (dy / dist) * repulse;
            n1.vx += fx;
            n1.vy += fy;
            n2.vx -= fx;
            n2.vy -= fy;
          }
        }

        // Attraction
        edges.forEach(edge => {
          const s = simNodes.find(node => node.id === edge.source);
          const t = simNodes.find(node => node.id === edge.target);
          if (s && t) {
            const dx = s.x - t.x;
            const dy = s.y - t.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const strength = (edge.data?.strength as number) || 5;
            
            const sumSizes = (s.size + t.size) / 2 + 20; // Reduced base gap
            // Stronger edges want to be closer
            const targetDist = Math.max(sumSizes, k - (strength * 5)); // Scaled down targeting
            // Hooke's law attraction
            const attract = (dist - targetDist) * 0.15; // Slightly stronger rubber banding
            
            const fx = (dx / dist) * attract;
            const fy = (dy / dist) * attract;
            s.vx -= fx;
            s.vy -= fy;
            t.vx += fx;
            t.vy += fy;
          }
        });

        // Center Gravity & Appling Velocity
        simNodes.forEach(node => {
          if (node.id !== hubNodeId) {
            const dx = node.x - centerX;
            const dy = node.y - centerY;
            const distToCenter = Math.sqrt(dx*dx + dy*dy) || 1;
            // Pull lightly toward center to keep tight clusters
            node.vx -= (dx / distToCenter) * (distToCenter * 0.02);
            node.vy -= (dy / distToCenter) * (distToCenter * 0.02);

            const v = Math.sqrt(node.vx * node.vx + node.vy * node.vy) || 1;
            const limitedV = Math.min(v, temperature);
            node.x += (node.vx / v) * limitedV;
            node.y += (node.vy / v) * limitedV;
          } else {
            // Keep Hub pinned exactly at center
            node.x = centerX;
            node.y = centerY;
          }
        });
      }

      const newNodes = nodes.map(orig => {
        const simNode = simNodes.find(sn => sn.id === orig.id)!;
        return {
          ...orig,
          position: {
            x: simNode.x - simNode.size / 2,
            y: simNode.y - simNode.size / 2
          }
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
