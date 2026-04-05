/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Download,
  ChevronRight,
  ChevronLeft,
  X,
  Menu,
  MessageSquare,
  ArrowUp,
  Sun,
  Moon,
} from "lucide-react";

export const ThemeContext = React.createContext({
  isDarkMode: true,
  toggleTheme: () => {},
});
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { extractNodesAndEdges, generateFinalResponse } from "./lib/gemini";
import ReactMarkdown from "react-markdown";
import { toPng } from "html-to-image";
import { CustomNode } from "./components/CustomNode";
import { LombardiEdge } from "./components/LombardiEdge";
import { getLayoutedElements, getNodeSize } from "./lib/flow-utils";
import { cn } from "./lib/utils";

// --- Highlightable text components for analysis hover ---

function HighlightableSentence({
  text,
  children,
  onEnter,
  onLeave,
}: {
  text: string;
  children: React.ReactNode;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <span
      style={{
        textDecoration: hovered ? "underline" : "none",
        textUnderlineOffset: "3px",
        cursor: "default",
      }}
      onMouseEnter={() => {
        setHovered(true);
        onEnter();
      }}
      onMouseLeave={() => {
        setHovered(false);
        onLeave();
      }}
    >
      {children}
    </span>
  );
}

function parseAndWrapSentences(
  children: React.ReactNode,
  onEnter: (t: string) => void,
  onLeave: () => void,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      const sentences = child.match(/[^.!?\n]+[.!?]+|\s+|[^.!?\n]+$/g) || [
        child,
      ];
      return sentences.map((s, i) => {
        if (!s.trim()) return s;
        return (
          <HighlightableSentence
            key={`${i}`}
            text={s}
            onEnter={() => onEnter(s)}
            onLeave={onLeave}
          >
            {s}
          </HighlightableSentence>
        );
      });
    }
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...(child.props as any),
        children: parseAndWrapSentences(
          (child.props as any).children,
          onEnter,
          onLeave,
        ),
      });
    }
    return child;
  });
}

// --- MiniMap circular node renderer ---
const MiniMapNode = ({ x, y, width, height, color }: any) => (
  <circle
    cx={x + width / 2}
    cy={y + height / 2}
    r={Math.min(width, height) / 2}
    fill={color || "#1a1a1a"}
    fillOpacity={0.75}
  />
);

// --- Flow Content Component ---

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => setIsDarkMode((prev) => !prev), []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ReactFlowProvider>
        <FlowContent />
      </ReactFlowProvider>
    </ThemeContext.Provider>
  );
}

function FlowContent() {
  const { isDarkMode, toggleTheme } = React.useContext(ThemeContext);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, setCenter } = useReactFlow();
  const [prompt, setPrompt] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isResizing = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX - 24;
    if (newWidth > 280 && newWidth < 800) {
      setSidebarWidth(newWidth);
    }
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
  }, [handleMouseMove]);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", stopResizing);
    },
    [handleMouseMove, stopResizing],
  );

  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
    }),
    [],
  );

  const edgeTypes = useMemo(
    () => ({
      lombardi: LombardiEdge,
    }),
    [],
  );

  React.useEffect(() => {
    // Dynamic theme handled by App
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        label: "Connection",
        type: "lombardi",
        animated: true,
        data: { strength: 5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isDarkMode ? "#ffffff" : "#000000",
        },
        style: { stroke: isDarkMode ? "#ffffff" : "#000000", strokeWidth: 2.5 },
        selectionWidth: 20,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
  );

  const handleExtract = async () => {
    if (!prompt.trim()) return;
    setIsExtracting(true);
    setResult(null);
    try {
      const { nodes: extractedNodes, edges: extractedEdges } =
        await extractNodesAndEdges(prompt);

      const initialNodes: Node[] = extractedNodes.map((n: any) => ({
        id: n.id,
        type: "custom",
        data: {
          label: n.label,
          type: n.type,
          mentions: n.mentions,
          strength: n.strength || 5,
        },
        position: { x: 0, y: 0 },
      }));

      const initialEdges: Edge[] = extractedEdges.map(
        (e: any, idx: number) => ({
          id: `e-${e.source}-${e.target}-${idx}`,
          source: e.source,
          target: e.target,
          label: e.label,
          type: "lombardi", // Use custom edge for better label rendering
          animated: !!e.isDirected,
          data: { strength: e.strength || 5, isDirected: e.isDirected },
          markerEnd: e.isDirected
            ? {
                type: MarkerType.ArrowClosed,
                color: isDarkMode ? "#ffffff" : "#000000",
                width: 12,
                height: 12,
                strokeWidth: 1,
              }
            : undefined,
          style: {
            stroke: isDarkMode ? "#ffffff" : "#000000",
            strokeWidth: Math.max(1, (e.strength || 5) / 2),
            opacity: 0.7,
            strokeDasharray: idx % 5 === 0 ? "5,5" : "none", // Mix of solid and dashed lines
          },
          selectionWidth: 20,
        }),
      );

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(initialNodes, initialEdges, "RADIAL");

      setNodes([...layoutedNodes]);
      setEdges(layoutedEdges);

      setTimeout(() => fitView({ padding: 0.1, duration: 1000 }), 100);

      if (isMobile) setSidebarOpen(false);

      // Reset textarea height after extraction
      if (mobileTextareaRef.current) {
        mobileTextareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Extraction failed", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      setTimeout(() => fitView({ padding: 0.1, duration: 1000 }), 100);
    },
    [nodes, edges, setNodes, setEdges, fitView],
  );

  const onDownload = useCallback(() => {
    if (reactFlowWrapper.current === null || nodes.length === 0) return;

    const nodesBounds = getNodesBounds(nodes);
    const margin = 100;

    // Calculate dimensions to include exactly 100px margin on all sides
    const width = nodesBounds.width + margin * 2;
    const height = nodesBounds.height + margin * 2;

    // Use zoom level 1 for high-fidelity 1:1 export
    const zoom = 1;

    // Calculate the offset to position the top-left node at (margin, margin)
    const x = margin - nodesBounds.x;
    const y = margin - nodesBounds.y;

    const viewportElement = reactFlowWrapper.current.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement;
    if (!viewportElement) return;

    toPng(viewportElement, {
      backgroundColor: isDarkMode ? "#000000" : "#FFFFFF",
      width: width,
      height: height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
      },
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `node-ai-map-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Download failed", err);
      });
  }, [nodes]);

  const handleGenerate = async () => {
    if (nodes.length === 0) return;
    setIsGenerating(true);
    try {
      const nodeData = nodes.map((n) => ({
        id: n.id,
        label: n.data.label as string,
        type: n.data.type as string,
        mentions: (n.data.mentions as number) || 10,
        strength: (n.data.strength as number) || 5,
      }));
      const edgeData = edges.map((e) => ({
        source: e.source,
        target: e.target,
        label: e.label as string,
        strength: (e.data?.strength as number) || 5,
        isDirected: !!e.markerEnd,
      }));
      const response = await generateFinalResponse(nodeData, edgeData, prompt);
      setResult(response);
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const [selectedElement, setSelectedElement] = useState<{
    type: "node" | "edge";
    id: string;
  } | null>(null);

  const onElementClick = useCallback((_: any, element: any) => {
    if (element.id) {
      setSelectedElement({
        type: "source" in element ? "edge" : "node",
        id: element.id,
      });
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
  }, []);

  const updateNodeLabel = (id: string, label: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, label } };
        }
        return node;
      }),
    );
  };

  const updateNodeStrength = (id: string, strength: number) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, strength } };
        }
        return node;
      }),
    );
  };

  const updateEdgeLabel = (id: string, label: string) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          return { ...edge, label };
        }
        return edge;
      }),
    );
  };

  const updateEdgeStrength = (id: string, strength: number) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: { ...edge.data, strength },
            style: { ...edge.style, strokeWidth: Math.max(1, strength / 2) },
          };
        }
        return edge;
      }),
    );
  };

  const deleteElement = useCallback(() => {
    if (!selectedElement) return;
    if (selectedElement.type === "node") {
      setNodes((nds) => nds.filter((n) => n.id !== selectedElement.id));
      setEdges((eds) =>
        eds.filter(
          (e) =>
            e.source !== selectedElement.id && e.target !== selectedElement.id,
        ),
      );
    } else {
      setEdges((eds) => eds.filter((e) => e.id !== selectedElement.id));
    }
    setSelectedElement(null);
  }, [selectedElement, setNodes, setEdges]);

  const addNode = () => {
    const id = `node-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "custom",
      data: { label: "New Node", type: "concept", strength: 5 },
      position: { x: Math.random() * 100, y: Math.random() * 100 },
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedElement({ type: "node", id });
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedElement
      ) {
        // Don't delete if user is typing in an input or textarea
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }
        deleteElement();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, deleteElement]);

  // Keyword-based node matching for analysis hover highlight
  const getMatchingNodeIds = useCallback(
    (text: string): Set<string> => {
      const lowerText = text.toLowerCase();
      const matched = new Set<string>();
      nodes.forEach((node) => {
        const label = (node.data.label as string).toLowerCase();
        const words = label.split(/[\s\/,\-\(\)]+/).filter((w) => w.length > 3);
        if (words.some((word) => lowerText.includes(word))) {
          matched.add(node.id);
        }
      });
      return matched;
    },
    [nodes],
  );

  // Nodes with highlighted flag for analysis hover
  const nodesWithHighlight = useMemo(() => {
    const isAnyHighlighted = highlightedNodeIds.size > 0;
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        highlighted: highlightedNodeIds.has(n.id),
        isAnyHighlighted,
      },
    }));
  }, [nodes, highlightedNodeIds]);

  const focusOnNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const size = getNodeSize(node.data?.strength as number);
      setCenter(node.position.x + size / 2, node.position.y + size / 2, {
        zoom: 0.75,
        duration: 500,
      });
      setSelectedElement({ type: "node", id: nodeId });
    },
    [nodes, setCenter],
  );

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[var(--apple-bg)] text-[var(--apple-text)] font-sans overflow-hidden relative">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <motion.aside
          initial={false}
          animate={{
            width: sidebarOpen ? sidebarWidth : 56,
          }}
          style={{
            height: "calc(100vh - 32px)",
            top: 16,
            left: 16,
            borderRadius: 16,
            background: "var(--apple-card)",
            boxShadow: "0 0 16px var(--glow-base), 0 0 0 1px var(--glow-inset)",
          }}
          transition={{ type: "tween", duration: 0.12, ease: "linear" }}
          className="fixed z-50 overflow-hidden flex flex-col"
        >
          {/* Resize Handle */}
          {sidebarOpen && (
            <div
              onMouseDown={startResizing}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/20 transition-colors z-[60]"
            />
          )}

          {/* Sidebar Header */}
          <div
            className={cn(
              "flex items-center shrink-0",
              sidebarOpen ? "justify-between px-5 h-13" : "justify-center h-13",
            )}
          >
            {sidebarOpen && (
              <span
                className="text-[13px] font-bold tracking-widest uppercase text-[var(--apple-text)]"
                style={{ textShadow: "0 0 8px var(--glow-base)" }}
              >
                NODEPROMPT
              </span>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center text-[var(--apple-text)] opacity-50 hover:opacity-100"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                transition: "all 150ms ease",
              }}
              title="Toggle sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div
            className={cn(
              "flex-1 overflow-y-auto flex flex-col",
              sidebarOpen
                ? "px-5 py-4 space-y-4"
                : "px-2 py-5 space-y-4 items-center",
            )}
          >
            {sidebarOpen ? (
              <>
                <div className="flex-1 space-y-4">
                  {selectedElement ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-widest text-black/50">
                          {selectedElement.type === "node" ? "Node" : "Edge"}
                        </span>
                        <button
                          onClick={() => setSelectedElement(null)}
                          className="icon-btn w-7 h-7"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-black/50">
                          Label
                        </label>
                        <input
                          type="text"
                          value={
                            selectedElement.type === "node"
                              ? (nodes.find((n) => n.id === selectedElement.id)
                                  ?.data.label as string) || ""
                              : (edges.find((e) => e.id === selectedElement.id)
                                  ?.label as string) || ""
                          }
                          onChange={(e) => {
                            if (selectedElement.type === "node") {
                              updateNodeLabel(
                                selectedElement.id,
                                e.target.value,
                              );
                            } else {
                              updateEdgeLabel(
                                selectedElement.id,
                                e.target.value,
                              );
                            }
                          }}
                          className="apple-input w-full"
                        />
                      </div>

                      {selectedElement.type === "node" ? (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-[11px] text-black/50">
                              Type
                            </label>
                            <select
                              value={
                                (nodes.find((n) => n.id === selectedElement.id)
                                  ?.data.type as string) || "concept"
                              }
                              onChange={(e) => {
                                setNodes((nds) =>
                                  nds.map((node) => {
                                    if (node.id === selectedElement.id) {
                                      return {
                                        ...node,
                                        data: {
                                          ...node.data,
                                          type: e.target.value,
                                        },
                                      };
                                    }
                                    return node;
                                  }),
                                );
                              }}
                              className="apple-input w-full appearance-none"
                            >
                              <option value="concept">Concept</option>
                              <option value="entity">Entity</option>
                              <option value="action">Action</option>
                              <option value="attribute">Attribute</option>
                              <option value="risk">Risk</option>
                              <option value="opportunity">Opportunity</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] text-black/50">
                                Influence Strength
                              </label>
                              <span className="text-[11px] text-black tabular-nums">
                                {nodes.find((n) => n.id === selectedElement.id)
                                  ?.data?.strength || 5}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={
                                nodes.find((n) => n.id === selectedElement.id)
                                  ?.data?.strength || 5
                              }
                              onChange={(e) =>
                                updateNodeStrength(
                                  selectedElement.id,
                                  parseInt(e.target.value),
                                )
                              }
                              className="w-full"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] text-black/50">
                              Strength
                            </label>
                            <span className="text-[11px] text-black tabular-nums">
                              {edges.find((e) => e.id === selectedElement.id)
                                ?.data?.strength || 5}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={
                              edges.find((e) => e.id === selectedElement.id)
                                ?.data?.strength || 5
                            }
                            onChange={(e) =>
                              updateEdgeStrength(
                                selectedElement.id,
                                parseInt(e.target.value),
                              )
                            }
                            className="w-full"
                          />

                          <div className="flex items-center justify-between pt-1">
                            <label className="text-[11px] text-black/50">
                              Directed
                            </label>
                            <button
                              onClick={() => {
                                setEdges((eds) =>
                                  eds.map((edge) => {
                                    if (edge.id === selectedElement.id) {
                                      const isDirected = !edge.markerEnd;
                                      return {
                                        ...edge,
                                        animated: isDirected,
                                        markerEnd: isDirected
                                          ? {
                                              type: MarkerType.ArrowClosed,
                                              color: isDarkMode
                                                ? "#ffffff"
                                                : "#000000",
                                            }
                                          : undefined,
                                      };
                                    }
                                    return edge;
                                  }),
                                );
                              }}
                              className={cn(
                                "toggle-track",
                                edges.find((e) => e.id === selectedElement.id)
                                  ?.markerEnd
                                  ? "on"
                                  : "off",
                              )}
                            >
                              <div className="toggle-thumb" />
                            </button>
                          </div>
                        </div>
                      )}

                      <button onClick={deleteElement} className="danger-btn">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Describe a narrative, system, or power structure to map..."
                          className="apple-input w-full h-52 resize-none text-[13px] leading-relaxed p-4"
                        />
                      </div>

                      <button
                        onClick={handleExtract}
                        disabled={isExtracting || !prompt.trim()}
                        className="apple-button-primary w-full"
                      >
                        <span className="text-[13px]">
                          {isExtracting
                            ? "Extracting..."
                            : "Extract Influence Map"}
                        </span>
                      </button>

                      {nodes.length > 0 && !isMobile && (
                        <div className="space-y-3">
                          <hr className="border-t border-black/[0.06]" />
                          <div className="space-y-0.5">
                            {[...nodes]
                              .sort(
                                (a, b) =>
                                  ((b.data?.strength as number) || 5) -
                                  ((a.data?.strength as number) || 5),
                              )
                              .slice(0, 6)
                              .map((node, i) => (
                                <button
                                  key={node.id}
                                  onClick={() => focusOnNode(node.id)}
                                  className="node-list-item"
                                  title={node.data.label as string}
                                >
                                  <span className="text-[10px] w-4 shrink-0 text-center text-black/25 tabular-nums">
                                    {i + 1}
                                  </span>
                                  <span className="flex-1 text-[12px] truncate">
                                    {node.data.label as string}
                                  </span>
                                  <span className="text-[10px] shrink-0 tabular-nums text-black/30 pr-1">
                                    {node.data?.strength || 5}
                                  </span>
                                </button>
                              ))}
                          </div>

                          <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="apple-button-secondary w-full"
                          >
                            {isGenerating && (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <span className="text-[13px]">
                              Generate Analysis
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {result && (
                  <div className="pt-4">
                    <div className="flex items-center justify-end mb-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleCopy}
                          className="icon-btn w-7 h-7"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setResult(null)}
                          className="icon-btn w-7 h-7"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[13px] leading-relaxed markdown-body">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2">
                              {parseAndWrapSentences(
                                children,
                                (t) =>
                                  setHighlightedNodeIds(getMatchingNodeIds(t)),
                                () => setHighlightedNodeIds(new Set()),
                              )}
                            </p>
                          ),
                          li: ({ children }) => (
                            <li className="list-inside">
                              {parseAndWrapSentences(
                                children,
                                (t) =>
                                  setHighlightedNodeIds(getMatchingNodeIds(t)),
                                () => setHighlightedNodeIds(new Set()),
                              )}
                            </li>
                          ),
                        }}
                      >
                        {result}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Mini Mode Icons */
              <div className="flex flex-col gap-3">
                {nodes.length > 0 && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="icon-btn-dark w-10 h-10"
                    title="Generate Analysis"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.aside>
      )}

      {/* Main Canvas Area */}
      <main className="flex-1 relative bg-[var(--apple-bg)] flex flex-col">
        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodesWithHighlight}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onElementClick}
            onEdgeClick={onElementClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.01}
            maxZoom={4}
            colorMode={isDarkMode ? "dark" : "light"}
            className="bg-transparent"
          >
            <Background gap={20} size={1} color="#333333" />
            {!isMobile && (
              <Controls
                showInteractive={false}
                position="bottom-right"
                className="!bg-transparent !border-none !shadow-none !m-6"
              />
            )}
            {!isMobile && (
              <MiniMap
                nodeComponent={MiniMapNode}
                nodeColor={() => isDarkMode ? "#FFFFFF" : "#000000"}
                maskColor={isDarkMode ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)"}
                className="!rounded-xl !border-none overflow-hidden"
                style={{
                  background: "var(--apple-card)",
                  boxShadow: "0 0 16px var(--glow-base), 0 0 0 1px var(--glow-inset)",
                  overflow: "hidden",
                }}
              />
            )}
          </ReactFlow>

          {/* Action Buttons - Top Right */}
          <div className="absolute top-6 right-6 flex flex-col gap-3 z-30">
            <button
              onClick={addNode}
              className="icon-btn w-12 h-12"
              title="Add Node"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={onDownload}
              className="icon-btn w-12 h-12"
              title="Download Image"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="icon-btn w-12 h-12"
              title={
                isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
              }
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Analysis Result Overlay */}
          <AnimatePresence>
            {isMobile && result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-[var(--apple-bg)] overflow-y-auto custom-scrollbar p-8 safe-area-inset text-[var(--apple-text)]"
              >
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-8 sticky top-0 bg-[var(--apple-bg)] py-4 border-b border-[var(--apple-text)] border-opacity-10 shadow-[0_4px_20px_var(--glow-hover)] z-10">
                    <span className="text-[11px] uppercase tracking-widest text-[var(--apple-text)]">
                      Analysis
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={handleCopy} className="icon-btn w-8 h-8">
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setResult(null)}
                        className="icon-btn w-8 h-8"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm leading-relaxed markdown-body pb-20">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2">
                            {parseAndWrapSentences(
                              children,
                              (t) =>
                                setHighlightedNodeIds(getMatchingNodeIds(t)),
                              () => setHighlightedNodeIds(new Set()),
                            )}
                          </p>
                        ),
                        li: ({ children }) => (
                          <li className="list-inside">
                            {parseAndWrapSentences(
                              children,
                              (t) =>
                                setHighlightedNodeIds(getMatchingNodeIds(t)),
                              () => setHighlightedNodeIds(new Set()),
                            )}
                          </li>
                        ),
                      }}
                    >
                      {result}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Edit Panel Overlay */}
          <AnimatePresence>
            {isMobile && selectedElement && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 bottom-0 z-[80] bg-[var(--apple-surface)] p-6 safe-bottom text-[var(--apple-text)]"
                style={{
                  borderRadius: "20px 20px 0 0",
                  boxShadow:
                    "0 -4px 30px var(--glow-hover), 0 0 0 1px var(--glow-inset)",
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[11px] uppercase tracking-widest text-white/50">
                    {selectedElement.type === "node" ? "Node" : "Edge"}
                  </span>
                  <button
                    onClick={() => setSelectedElement(null)}
                    className="icon-btn w-8 h-8"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-apple-gray-600 ml-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={
                        selectedElement.type === "node"
                          ? (nodes.find((n) => n.id === selectedElement.id)
                              ?.data.label as string) || ""
                          : (edges.find((e) => e.id === selectedElement.id)
                              ?.label as string) || ""
                      }
                      onChange={(e) => {
                        if (selectedElement.type === "node") {
                          updateNodeLabel(selectedElement.id, e.target.value);
                        } else {
                          updateEdgeLabel(selectedElement.id, e.target.value);
                        }
                      }}
                      className="apple-input w-full"
                    />
                  </div>

                  {selectedElement.type === "node" ? (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-apple-gray-600 ml-1">
                          Type
                        </label>
                        <select
                          value={
                            (nodes.find((n) => n.id === selectedElement.id)
                              ?.data.type as string) || "concept"
                          }
                          onChange={(e) => {
                            setNodes((nds) =>
                              nds.map((node) => {
                                if (node.id === selectedElement.id) {
                                  return {
                                    ...node,
                                    data: {
                                      ...node.data,
                                      type: e.target.value,
                                    },
                                  };
                                }
                                return node;
                              }),
                            );
                          }}
                          className="apple-input w-full appearance-none"
                        >
                          <option value="concept">Concept</option>
                          <option value="entity">Entity</option>
                          <option value="action">Action</option>
                          <option value="attribute">Attribute</option>
                          <option value="risk">Risk</option>
                          <option value="opportunity">Opportunity</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-xs font-medium text-apple-gray-600">
                            Influence Strength
                          </label>
                          <span className="text-xs font-bold text-black">
                            {nodes.find((n) => n.id === selectedElement.id)
                              ?.data?.strength || 5}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={
                            nodes.find((n) => n.id === selectedElement.id)?.data
                              ?.strength || 5
                          }
                          onChange={(e) =>
                            updateNodeStrength(
                              selectedElement.id,
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-medium text-apple-gray-600">
                          Strength
                        </label>
                        <span className="text-xs font-bold text-black">
                          {edges.find((e) => e.id === selectedElement.id)?.data
                            ?.strength || 5}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={
                          edges.find((e) => e.id === selectedElement.id)?.data
                            ?.strength || 5
                        }
                        onChange={(e) =>
                          updateEdgeStrength(
                            selectedElement.id,
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full"
                      />

                      <div className="flex items-center justify-between pt-2 px-1">
                        <label className="text-xs font-medium text-apple-gray-600">
                          Directed
                        </label>
                        <button
                          onClick={() => {
                            setEdges((eds) =>
                              eds.map((edge) => {
                                if (edge.id === selectedElement.id) {
                                  const isDirected = !edge.markerEnd;
                                  return {
                                    ...edge,
                                    animated: isDirected,
                                    markerEnd: isDirected
                                      ? {
                                          type: MarkerType.ArrowClosed,
                                          color: isDarkMode
                                            ? "#ffffff"
                                            : "#000000",
                                        }
                                      : undefined,
                                  };
                                }
                                return edge;
                              }),
                            );
                          }}
                          className={cn(
                            "toggle-track",
                            edges.find((e) => e.id === selectedElement.id)
                              ?.markerEnd
                              ? "on"
                              : "off",
                          )}
                        >
                          <div className="toggle-thumb" />
                        </button>
                      </div>
                    </div>
                  )}

                  <button onClick={deleteElement} className="danger-btn">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Chat-style Input Bar */}
        {isMobile && (
          <div className="absolute inset-x-0 bottom-0 z-50 p-4 safe-bottom pointer-events-none">
            <div
              className="flex items-end gap-2 bg-[var(--apple-card)] p-1.5 pl-4 pointer-events-auto"
              style={{
                borderRadius: 24,
                boxShadow:
                  "0 0 16px var(--glow-base), 0 0 0 1px var(--glow-inset)",
              }}
            >
              <textarea
                ref={mobileTextareaRef}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Auto-resize logic
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                }}
                placeholder="Describe to map..."
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-2.5 resize-none overflow-y-auto custom-scrollbar"
                style={{ height: "auto", minHeight: "40px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleExtract();
                  }
                }}
              />
              <div className="flex gap-2 flex-shrink-0 mb-0.5">
                <AnimatePresence mode="popLayout">
                  {nodes.length > 0 && (
                    <motion.button
                      key="analysis-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleGenerate}
                      disabled={isGenerating || isExtracting}
                      className="icon-btn-dark w-10 h-10"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </motion.button>
                  )}
                  {(prompt.trim() !== "" || nodes.length === 0) && (
                    <motion.button
                      key="send-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleExtract}
                      disabled={isExtracting || isGenerating || !prompt.trim()}
                      className={cn(
                        "w-10 h-10",
                        prompt.trim() ? "icon-btn-dark" : "icon-btn opacity-40",
                      )}
                    >
                      {isExtracting ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowUp className="w-5 h-5" />
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--apple-border);
          border-radius: 10px;
        }
        .react-flow__node {
          cursor: grab;
        }
        .react-flow__node:active {
          cursor: grabbing;
        }
        .react-flow__handle {
          width: 12px;
          height: 12px;
          background: var(--apple-accent);
          border: 2px solid var(--apple-card);
        }
        .react-flow__edge-path {
          stroke: #ffffff;
          stroke-linecap: round;
          transition: stroke 0.2s, stroke-width 0.2s;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke-width: 2.5;
          stroke: var(--apple-accent);
        }
        .react-flow__controls-button {
          border-bottom: 1px solid var(--apple-border) !important;
          background: var(--apple-surface) !important;
        }
        .react-flow__controls-button svg {
          fill: var(--apple-text) !important;
        }
        .markdown-body {
          font-family: var(--font-sans);
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
          color: inherit;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        .markdown-body h1 { font-size: 1.25rem; }
        .markdown-body h2 { font-size: 1.1rem; }
        .markdown-body h3 { font-size: 1rem; }
        .markdown-body p {
          margin-bottom: 0.75rem;
        }
        .markdown-body ul, .markdown-body ol {
          margin-bottom: 0.75rem;
          padding-left: 1.25rem;
        }
        .markdown-body li {
          margin-bottom: 0.25rem;
        }
        .markdown-body code {
          background: rgba(0, 0, 0, 0.05);
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
          font-size: 0.8rem;
        }
        .dark .markdown-body code {
          background: rgba(255, 255, 255, 0.1);
        }
        .markdown-body pre {
          background: rgba(0, 0, 0, 0.03);
          padding: 1rem;
          overflow-x: auto;
          margin-bottom: 1rem;
          border-radius: 10px;
        }
        .dark .markdown-body pre {
          background: rgba(255, 255, 255, 0.05);
        }
        .safe-bottom {
          padding-bottom: calc(1rem + env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
