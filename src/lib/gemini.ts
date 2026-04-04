import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NodeData {
  id: string;
  label: string;
  type: string;
  mentions: number; // 1-100 based on frequency or importance
  strength: number; // 1-10 based on influence or power
}

export interface EdgeData {
  source: string;
  target: string;
  label: string;
  strength: number; // 1-10
  isDirected: boolean;
}

export async function extractNodesAndEdges(prompt: string) {
  const wordCount = prompt.trim().split(/\s+/).length;
  const targetNodeCount = Math.max(10, Math.floor(wordCount / 5)); // Roughly 1 node per 5 words, min 10

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract EVERY key entity, sub-entity, and relationship from the following prompt, creating an extremely complex, sweeping map of influence in the signature style of Mark Lombardi.
    
    Break down the linear text into an extremely granular, dense, non-linear network of power, causality, and hidden connections.
    
    CRITICAL INSTRUCTIONS:
    1. LOMBARDI ARCHITECTURE: Focus on the "web". Map how individuals, corporations, and political entities are interconnected through deals, influence, and shared interests.
    2. MAXIMUM GRANULARITY: Do not group entities. If a person is mentioned with a company, extract BOTH as separate nodes and link them.
    3. DENSE INTERCONNECTIVITY: Look for cross-connections. If A knows B and B knows C, does A have a hidden link to C?
    4. SCALE WITH INPUT: The input has approximately ${wordCount} words. Aim for a high-density extraction of at least ${targetNodeCount} unique nodes to capture the full depth of the text.
    5. ATOMIC ENTITIES: Every specific person, bank, company, or government body must be a unique node.
    6. DIRECTIONALITY: Use directed edges (isDirected: true) for flows of money, orders, or direct causality. Use undirected for mutual associations or shared memberships.
    7. NODE TYPES: 
       - 'entity': Person, Bank, Corporation, or Government Agency.
       - 'action': A specific transaction, merger, scandal, or meeting.
       - 'concept': An ideology, policy, or systemic force.
       - 'risk': A point of vulnerability or conflict.
    
    Prompt: "${prompt}"
    
    Return the result as JSON with 'nodes' (id, label, type, mentions, strength) and 'edges' (source, target, label, strength, isDirected).
    'nodes' and 'edges' should represent a dense, sweeping influence map.
    'mentions' for nodes should be 1-100, representing how frequently or prominently the entity is discussed.
    'strength' for nodes should be 1-10, representing the inherent power or influence of that node.
    Strength for edges should be 1-10.
    'isDirected' should be true if the relationship has a specific direction, false otherwise.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                type: { type: Type.STRING },
                mentions: { type: Type.NUMBER },
                strength: { type: Type.NUMBER },
              },
              required: ["id", "label", "type", "mentions", "strength"],
            },
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                target: { type: Type.STRING },
                label: { type: Type.STRING },
                strength: { type: Type.NUMBER },
                isDirected: { type: Type.BOOLEAN },
              },
              required: ["source", "target", "label", "strength", "isDirected"],
            },
          },
        },
        required: ["nodes", "edges"],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { nodes: [], edges: [] };
  }
}

export async function generateFinalResponse(nodes: NodeData[], edges: EdgeData[], originalPrompt: string) {
  const graphDescription = `
    Nodes: ${nodes.map(n => `${n.label} (${n.type}, strength: ${n.strength})`).join(", ")}
    Edges: ${edges.map(e => `${e.source} -> ${e.target} [${e.label}, strength: ${e.strength}]`).join(", ")}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Based on the following non-linear graph structure derived from an initial prompt, generate a comprehensive and creative response.
    The graph represents the core concepts and their specific relationships (connections, order, strength).
    
    Original Prompt: "${originalPrompt}"
    
    Graph Structure:
    ${graphDescription}
    
    Please synthesize this information into a coherent answer that respects the defined relationships.`,
  });

  return response.text;
}
