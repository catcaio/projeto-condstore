'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, ZoomIn, ZoomOut, RotateCcw, Filter, Layers, GitBranch,
  Database, Cpu, Network, Server, ShieldCheck, CheckCircle2, AlertTriangle,
  X, ChevronRight, ExternalLink, HelpCircle, FileText, ArrowRight, Eye, Code2,
  Maximize2, Minimize2, Sun, Moon, Share2, CornerDownRight, ChevronDown, Key,
  Sparkles, Layers2, Box, Radio
} from 'lucide-react';
import {
  ARCHITECTURE_DATA, ArchNode, NodeCategory, NodeStatus, ViewPerspective, ArchFlow
} from './architecture-data';

// Semantic status dot mapping
const STATUS_CONFIG: Record<NodeStatus, { label: string; dotClass: string; textClass: string }> = {
  production: { label: 'Produção', dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]', textClass: 'text-emerald-400' },
  partial: { label: 'Parcial', dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]', textClass: 'text-amber-400' },
  implemented: { label: 'Implementado', dotClass: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]', textClass: 'text-blue-400' },
  experimental: { label: 'Experimental', dotClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]', textClass: 'text-purple-400' },
  planned: { label: 'Planejado', dotClass: 'bg-gray-400', textClass: 'text-gray-400' },
  out_of_scope: { label: 'Fora do Escopo', dotClass: 'bg-red-500', textClass: 'text-red-400' },
  unconfirmed: { label: 'Não Confirmado', dotClass: 'bg-gray-600', textClass: 'text-gray-500' }
};

// Domain badge color accents (desaturated)
const DOMAIN_COLORS: Record<string, string> = {
  'Atendimento': '#4A72B0',
  'Logística': '#3B8B88',
  'Orders': '#A06836',
  'Cockpit': '#7C5295',
  'IA Frank': '#8E5280',
  'Clientes': '#4A8A6E',
  'Database': '#5B6984',
  'Infrastructure': '#64748B',
  'Integrations': '#5E81AC',
  'FinOps': '#8F7249',
  'Core System': '#3E5CFF'
};

export function ArchitectureExplorer() {
  // Navigation & View state
  const [activeView, setActiveView] = useState<ViewPerspective>('architecture');
  const [systemMode, setSystemMode] = useState<'MVP' | 'FULL'>('MVP');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('condstore-root');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>('whatsapp-order-flow');

  // Hierarchy state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'condstore-root': true,
    'conversations-module': true,
    'fulfillment-module': true,
    'orders-module': true,
    'cockpit-module': true,
    'frank-module': true,
    'infra-core': true
  });

  // Canvas positions (draggable nodes)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const initial: Record<string, { x: number; y: number }> = {};
    ARCHITECTURE_DATA.nodes.forEach(n => {
      if (n.x !== undefined && n.y !== undefined) {
        initial[n.id] = { x: n.x, y: n.y };
      }
    });
    return initial;
  });

  // Spatial Canvas Viewport
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isCanvasDragging, setIsCanvasDragging] = useState<boolean>(false);
  const [canvasDragStart, setCanvasDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filters
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLayer, setSelectedLayer] = useState<string>('ALL');

  // Search & Modals
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [showPrDiff, setShowPrDiff] = useState<boolean>(true);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Deep Linking URL synchronization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const nodeParam = params.get('node');
      const viewParam = params.get('view');
      const modeParam = params.get('mode');
      const themeParam = params.get('theme');

      if (nodeParam && ARCHITECTURE_DATA.nodes.some(n => n.id === nodeParam)) {
        setSelectedNodeId(nodeParam);
      }
      if (viewParam) {
        setActiveView(viewParam as ViewPerspective);
      }
      if (modeParam && ['MVP', 'FULL'].includes(modeParam)) {
        setSystemMode(modeParam as 'MVP' | 'FULL');
      }
      if (themeParam && ['dark', 'light'].includes(themeParam)) {
        setTheme(themeParam as 'dark' | 'light');
      }
    }
  }, []);

  const updateUrl = useCallback((nodeId: string | null, view: string, mode: string, currentTheme: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (nodeId) url.searchParams.set('node', nodeId);
      else url.searchParams.delete('node');
      url.searchParams.set('view', view);
      url.searchParams.set('mode', mode);
      url.searchParams.set('theme', currentTheme);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Node Visibility Logic
  const isNodeVisible = useCallback((node: ArchNode): boolean => {
    // Mode Filter
    if (systemMode === 'MVP' && !node.isMvp) return false;

    // View Perspective Filter
    if (activeView === 'data' && node.category !== 'entity' && node.domain !== 'Database') return false;
    if (activeView === 'integrations' && node.category !== 'integration' && node.domain !== 'Integrations') return false;
    if (activeView === 'ai' && node.category !== 'ai_tool' && node.domain !== 'IA Frank' && !node.id.startsWith('frank-')) return false;
    if (activeView === 'infra' && node.category !== 'infra' && node.domain !== 'Infrastructure' && node.domain !== 'Database') return false;
    if (activeView === 'dependencies' && node.dependencies.length === 0 && node.dependents.length === 0) return false;
    if (activeView === 'stack' && node.technologies.length === 0) return false;
    if (activeView === 'multi_tenant' && !['edge-middleware', 'drizzle-schema', 'database-mysql', 'infra-core', 'frank-scheduler'].includes(node.id)) return false;
    if (activeView === 'flow' && selectedFlowId) {
      const flow = ARCHITECTURE_DATA.flows.find(f => f.id === selectedFlowId);
      if (flow && !flow.steps.some(s => s.nodeId === node.id)) return false;
    }

    // Domain Filter
    if (selectedDomain !== 'ALL' && node.domain !== selectedDomain) return false;

    // Status Filter
    if (selectedStatus !== 'ALL' && node.status !== selectedStatus) return false;

    // Layer Filter
    if (selectedLayer !== 'ALL' && node.layer !== selectedLayer) return false;

    // Expand/Collapse Hierarchy
    if (activeView === 'architecture' && node.parent) {
      let currParent: string | undefined = node.parent;
      while (currParent) {
        if (!expandedNodes[currParent]) return false;
        const parentNode = ARCHITECTURE_DATA.nodes.find(n => n.id === currParent);
        currParent = parentNode?.parent;
      }
    }

    return true;
  }, [systemMode, activeView, selectedDomain, selectedStatus, selectedLayer, expandedNodes, selectedFlowId]);

  // Filtered Nodes
  const visibleNodes = useMemo(() => {
    return ARCHITECTURE_DATA.nodes.filter(isNodeVisible);
  }, [isNodeVisible]);

  // Auto-fit framing when visible nodes change so they are never off-screen
  const fitVisibleNodes = useCallback((nodesToFit: ArchNode[]) => {
    if (nodesToFit.length === 0 || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodesToFit.forEach(n => {
      const pos = nodePositions[n.id] || { x: n.x || 0, y: n.y || 0 };
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });

    const contentWidth = (maxX - minX) + 240;
    const contentHeight = (maxY - minY) + 120;
    const scaleX = rect.width / (contentWidth || 1);
    const scaleY = rect.height / (contentHeight || 1);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.85, 0.4), 1.2);

    const centerX = (minX + maxX) / 2 + 110;
    const centerY = (minY + maxY) / 2 + 45;

    setZoomLevel(newZoom);
    setPan({
      x: rect.width / 2 - centerX * newZoom,
      y: rect.height / 2 - centerY * newZoom
    });
  }, [nodePositions]);

  // Auto-fit whenever view or filters change
  useEffect(() => {
    fitVisibleNodes(visibleNodes);

    // Deselect selected node if it's no longer visible in current view
    if (selectedNodeId && !visibleNodes.some(n => n.id === selectedNodeId)) {
      if (visibleNodes.length > 0) {
        setSelectedNodeId(visibleNodes[0].id);
      } else {
        setSelectedNodeId(null);
      }
    }
  }, [activeView, selectedFlowId, selectedDomain, selectedStatus, selectedLayer, systemMode]);

  // Center canvas on node
  const centerOnNode = useCallback((nodeId: string) => {
    const pos = nodePositions[nodeId];
    if (pos && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const targetX = rect.width / 2 - (pos.x + 110) * zoomLevel;
      const targetY = rect.height / 2 - (pos.y + 45) * zoomLevel;
      setPan({ x: targetX, y: targetY });
    }
  }, [nodePositions, zoomLevel]);

  // Expand ancestors
  const expandAncestors = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const updated = { ...prev };
      let current: ArchNode | undefined = ARCHITECTURE_DATA.nodes.find(n => n.id === nodeId);
      while (current && current.parent) {
        updated[current.parent] = true;
        current = ARCHITECTURE_DATA.nodes.find(n => n.id === current?.parent);
      }
      return updated;
    });
  }, []);

  // Handle Node Selection
  const handleSelectNode = useCallback((id: string) => {
    setSelectedNodeId(id);
    expandAncestors(id);
    centerOnNode(id);
    setIsMobileInspectorOpen(true);
    updateUrl(id, activeView, systemMode, theme);
  }, [expandAncestors, centerOnNode, activeView, systemMode, theme, updateUrl]);

  // Fit canvas to bounds
  const handleFitCanvas = useCallback(() => {
    fitVisibleNodes(visibleNodes);
  }, [fitVisibleNodes, visibleNodes]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          setIsCommandSearchOpen(false);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandSearchOpen(prev => !prev);
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setIsCommandSearchOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setIsCommandSearchOpen(false);
        setIsHelpOpen(false);
        setIsMobileInspectorOpen(false);
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsHelpOpen(prev => !prev);
        return;
      }

      if (e.key === '0') {
        handleFitCanvas();
        return;
      }

      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        const views: ViewPerspective[] = ['architecture', 'flow', 'dependencies', 'data', 'integrations', 'ai', 'infra', 'multi_tenant', 'stack'];
        const index = parseInt(e.key) - 1;
        if (views[index]) {
          setActiveView(views[index]);
          updateUrl(selectedNodeId, views[index], systemMode, theme);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFitCanvas, selectedNodeId, systemMode, theme, updateUrl]);

  // Pan Zoom Wheel Handler
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoomLevel(prev => Math.min(Math.max(prev * zoomFactor, 0.3), 2.5));
    } else {
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  // Canvas Mouse Dragging (Pan)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || draggedNodeId) return;
    setIsCanvasDragging(true);
    setCanvasDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      const dx = (e.clientX - nodeDragStart.x) / zoomLevel;
      const dy = (e.clientY - nodeDragStart.y) / zoomLevel;
      setNodePositions(prev => ({
        ...prev,
        [draggedNodeId]: {
          x: (prev[draggedNodeId]?.x || 0) + dx,
          y: (prev[draggedNodeId]?.y || 0) + dy
        }
      }));
      setNodeDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isCanvasDragging) {
      setPan({
        x: e.clientX - canvasDragStart.x,
        y: e.clientY - canvasDragStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsCanvasDragging(false);
    setDraggedNodeId(null);
  };

  // Node Drag Handle
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setDraggedNodeId(nodeId);
    setNodeDragStart({ x: e.clientX, y: e.clientY });
  };

  // Search Query Matching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return ARCHITECTURE_DATA.nodes.filter(node => {
      const nameMatch = node.name.toLowerCase().includes(q);
      const pathMatch = node.path.toLowerCase().includes(q);
      const descMatch = node.description.toLowerCase().includes(q);
      const respMatch = node.responsibilities.some(r => r.toLowerCase().includes(q));
      const techMatch = node.technologies.some(t => t.toLowerCase().includes(q));
      return nameMatch || pathMatch || descMatch || respMatch || techMatch;
    });
  }, [searchQuery]);

  // Selected Node Object
  const selectedNode = useMemo(() => {
    return ARCHITECTURE_DATA.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId]);

  // Connected nodes & edges calculation for highlighting
  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    const activeId = hoveredNodeId || selectedNodeId;
    if (!activeId) return { highlightedNodeIds: new Set<string>(), highlightedEdgeIds: new Set<string>() };

    const nodeIds = new Set<string>([activeId]);
    const edgeIds = new Set<string>();

    ARCHITECTURE_DATA.edges.forEach(edge => {
      if (edge.source === activeId || edge.target === activeId) {
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
        edgeIds.add(edge.id);
      }
    });

    return { highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds };
  }, [hoveredNodeId, selectedNodeId]);

  // Active edges between visible nodes
  const activeEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map(n => n.id));
    return ARCHITECTURE_DATA.edges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  }, [visibleNodes]);

  const toggleExpandNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyUrlToClipboard = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('Link da visão atual copiado para a área de transferência!');
    }
  };

  const selectedPrDiff = ARCHITECTURE_DATA.prDiffs[0];

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none sitemap-font-sans transition-colors duration-200 ${
      theme === 'dark' ? 'sitemap-theme-dark bg-[#09090b] text-[#f4f4f5]' : 'sitemap-theme-light bg-[#f4f3f0] text-[#141416]'
    }`}>

      {/* TOP HEADER */}
      <header className="h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 flex items-center justify-between z-30 shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="bg-[#3E5CFF] text-white font-bold text-xs px-2.5 py-1 rounded-md tracking-wider uppercase sitemap-font-mono">
              CONDSTORE OS
            </span>
            <span className="text-xs text-[var(--color-fg-subtle)] sitemap-font-mono hidden sm:inline">
              /sitemap — Architecture Explorer
            </span>
          </div>
        </div>

        {/* Global Command Search Trigger */}
        <button
          onClick={() => setIsCommandSearchOpen(true)}
          className="flex items-center justify-between w-64 md:w-96 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-fg-secondary)] px-3 py-1.5 rounded-lg hover:border-[var(--color-border-strong)] transition-all"
        >
          <div className="flex items-center space-x-2">
            <Search className="h-3.5 w-3.5 text-[var(--color-fg-subtle)]" />
            <span className="truncate">Pesquisar módulos, APIs, tabelas...</span>
          </div>
          <kbd className="sitemap-font-mono text-[10px] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 rounded text-[var(--color-fg-subtle)]">
            Cmd+K
          </kbd>
        </button>

        {/* System Scope & Controls */}
        <div className="flex items-center space-x-2">
          {/* Mode Switcher */}
          <div className="bg-[var(--color-bg-subtle)] p-0.5 rounded-lg border border-[var(--color-border-subtle)] flex space-x-0.5">
            <button
              onClick={() => { setSystemMode('MVP'); updateUrl(selectedNodeId, activeView, 'MVP', theme); }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                systemMode === 'MVP' ? 'bg-[#3E5CFF] text-white shadow-sm' : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)]'
              }`}
            >
              MVP CORE
            </button>
            <button
              onClick={() => { setSystemMode('FULL'); updateUrl(selectedNodeId, activeView, 'FULL', theme); }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                systemMode === 'FULL' ? 'bg-[#3E5CFF] text-white shadow-sm' : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)]'
              }`}
            >
              FULL SYSTEM
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              updateUrl(selectedNodeId, activeView, systemMode, nextTheme);
            }}
            className="p-1.5 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-bg-subtle)] transition-colors"
            title="Alternar Tema (Dark / Light)"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Share Deep-Link */}
          <button
            onClick={copyUrlToClipboard}
            className="p-1.5 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-bg-subtle)] transition-colors hidden sm:inline-flex"
            title="Copiar Link da Visão Atual"
          >
            <Share2 className="h-4 w-4" />
          </button>

          {/* Help Modal Trigger */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-1.5 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-bg-subtle)] transition-colors"
            title="Atalhos e Ajuda (?)"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* PERSPECTIVES & FILTERS BAR */}
      <div className="h-11 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]/90 backdrop-blur px-4 flex items-center justify-between shrink-0 z-20 overflow-x-auto sitemap-scrollbar">
        {/* Perspectives Navigation */}
        <div className="flex items-center space-x-1 sitemap-font-mono text-[11px]">
          {[
            { id: 'architecture', label: '1. Arquitetura', icon: Layers },
            { id: 'flow', label: '2. Fluxo', icon: Network },
            { id: 'dependencies', label: '3. Dependências', icon: GitBranch },
            { id: 'data', label: '4. Dados', icon: Database },
            { id: 'integrations', label: '5. Integrações', icon: Server },
            { id: 'ai', label: '6. IA Frank', icon: Cpu },
            { id: 'infra', label: '7. Infra', icon: ShieldCheck },
            { id: 'multi_tenant', label: '8. Multi-Tenant', icon: Key },
            { id: 'stack', label: '9. Stack', icon: Box },
          ].map(view => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => {
                  setActiveView(view.id as ViewPerspective);
                  updateUrl(selectedNodeId, view.id, systemMode, theme);
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#3E5CFF]/15 text-[#3E5CFF] border border-[#3E5CFF]/40 font-semibold'
                    : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] hover:bg-[var(--color-bg-subtle)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{view.label}</span>
              </button>
            );
          })}
        </div>

        {/* Combinable Filters */}
        <div className="flex items-center space-x-2 text-[11px] shrink-0 ml-4">
          {/* Domain Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[var(--color-fg-subtle)] hidden lg:inline">Domínio:</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded px-2 py-0.5 text-[var(--color-fg-main)] text-xs focus:outline-none focus:border-[#3E5CFF]"
            >
              <option value="ALL">Todos Domínios</option>
              <option value="Atendimento">Atendimento</option>
              <option value="Logística">Logística</option>
              <option value="Orders">Orders</option>
              <option value="Cockpit">Cockpit</option>
              <option value="IA Frank">IA Frank</option>
              <option value="Clientes">Clientes</option>
              <option value="Database">Database</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Integrations">Integrations</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[var(--color-fg-subtle)] hidden lg:inline">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded px-2 py-0.5 text-[var(--color-fg-main)] text-xs focus:outline-none focus:border-[#3E5CFF]"
            >
              <option value="ALL">Todos Status</option>
              <option value="production">Produção</option>
              <option value="partial">Parcial</option>
              <option value="implemented">Implementado</option>
              <option value="experimental">Experimental</option>
            </select>
          </div>
        </div>
      </div>

      {/* PR EVOLUTION DIFF BANNER */}
      {showPrDiff && selectedPrDiff && (
        <div className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)] px-4 py-2 flex items-center justify-between text-xs z-20 shrink-0">
          <div className="flex items-center space-x-2 overflow-hidden">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded sitemap-font-mono font-semibold text-[11px] shrink-0">
              {selectedPrDiff.prNumber} Evolução da Arquitetura
            </span>
            <span className="font-semibold text-[var(--color-fg-main)] truncate shrink-0">{selectedPrDiff.title}</span>
            <div className="hidden lg:flex items-center space-x-2 text-[var(--color-fg-secondary)] truncate">
              <span className="text-red-400 sitemap-font-mono text-[11px]">Como era:</span>
              <span className="truncate max-w-sm">{selectedPrDiff.before}</span>
              <ArrowRight className="h-3 w-3 text-[var(--color-fg-subtle)] shrink-0" />
              <span className="text-emerald-400 sitemap-font-mono text-[11px]">Como ficou:</span>
              <span className="truncate max-w-sm">{selectedPrDiff.after}</span>
            </div>
          </div>

          <button
            onClick={() => setShowPrDiff(false)}
            className="text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-main)] p-1 ml-2 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* FLOW SELECTION SUB-BAR (If Flow View is active) */}
      {activeView === 'flow' && (
        <div className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)] px-4 py-1.5 flex items-center space-x-3 text-xs z-20 shrink-0 overflow-x-auto sitemap-scrollbar">
          <span className="sitemap-font-mono text-[11px] text-[var(--color-fg-subtle)] shrink-0">Fluxos Operacionais:</span>
          {ARCHITECTURE_DATA.flows.map(flow => (
            <button
              key={flow.id}
              onClick={() => setSelectedFlowId(flow.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all shrink-0 ${
                selectedFlowId === flow.id
                  ? 'bg-[#3E5CFF] text-white'
                  : 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] border border-[var(--color-border-subtle)]'
              }`}
            >
              {flow.name}
            </button>
          ))}
        </div>
      )}

      {/* MAIN SPATIAL CANVAS & INSPECTOR BODY */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* SPATIAL GRAPH CANVAS */}
        <div
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className={`flex-1 relative overflow-hidden transition-cursor ${
            isCanvasDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundColor: 'var(--color-bg-base)',
            backgroundImage: 'radial-gradient(var(--canvas-dot) 1px, transparent 1px)',
            backgroundSize: `${28 * zoomLevel}px ${28 * zoomLevel}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >

          {/* SVG CONNECTIONS / EDGES LAYER */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="22" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3E5CFF" opacity="0.7" />
              </marker>
              <marker id="arrowhead-highlight" markerWidth="10" markerHeight="7" refX="22" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3E5CFF" opacity="1" />
              </marker>
            </defs>
            <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`, transformOrigin: '0 0' }}>
              {activeEdges.map(edge => {
                const sourceNode = visibleNodes.find(n => n.id === edge.source);
                const targetNode = visibleNodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const sourcePos = nodePositions[sourceNode.id] || { x: sourceNode.x || 0, y: sourceNode.y || 0 };
                const targetPos = nodePositions[targetNode.id] || { x: targetNode.x || 0, y: targetNode.y || 0 };

                const isHighlighted = highlightedEdgeIds.has(edge.id);
                const hasActiveSelection = selectedNodeId !== null || hoveredNodeId !== null;

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourcePos.x + 110}
                      y1={sourcePos.y + 45}
                      x2={targetPos.x + 110}
                      y2={targetPos.y + 45}
                      stroke={isHighlighted ? '#3E5CFF' : 'var(--color-border-strong)'}
                      strokeWidth={isHighlighted ? 2.5 : 1}
                      strokeDasharray={edge.type === 'data_flow' ? '4,4' : undefined}
                      markerEnd={isHighlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'}
                      opacity={hasActiveSelection ? (isHighlighted ? 1 : 0.15) : 0.45}
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* NODES LAYER */}
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`
            }}
          >
            {visibleNodes.map(node => {
              const pos = nodePositions[node.id] || { x: node.x || 100, y: node.y || 100 };
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isHighlighted = highlightedNodeIds.has(node.id);
              const hasActiveSelection = selectedNodeId !== null || hoveredNodeId !== null;
              const isDimmed = hasActiveSelection && !isHighlighted;

              const statusInfo = STATUS_CONFIG[node.status];
              const domainAccentColor = DOMAIN_COLORS[node.domain] || '#64748B';
              const hasChildren = node.children && node.children.length > 0;
              const isExpanded = expandedNodes[node.id];

              return (
                <div
                  key={node.id}
                  onClick={(e) => { e.stopPropagation(); handleSelectNode(node.id); }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={`absolute w-56 rounded-xl border backdrop-blur-md p-3.5 cursor-pointer transition-all duration-150 shadow-lg z-10 ${
                    isSelected
                      ? 'border-[#3E5CFF] ring-2 ring-[#3E5CFF]/40 bg-[var(--color-bg-elevated)] scale-105 shadow-2xl z-20'
                      : isHovered
                      ? 'border-[var(--color-border-strong)] bg-[var(--color-bg-hover)] scale-102 z-20'
                      : 'border-[var(--color-border-subtle)] bg-[var(--panel-glass)]'
                  } ${isDimmed ? 'opacity-30 grayscale-[50%]' : 'opacity-100'}`}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`
                  }}
                >
                  {/* Subtle Domain Color Bar Accent */}
                  <div
                    className="absolute top-0 left-3 right-3 h-[2px] rounded-t-full"
                    style={{ backgroundColor: domainAccentColor }}
                  />

                  {/* Top Meta Line: Status Dot & Category Badge */}
                  <div className="flex items-center justify-between mb-2 pt-1">
                    <span className="text-[10px] sitemap-font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[var(--color-fg-secondary)] uppercase font-semibold">
                      {node.category}
                    </span>

                    <div className="flex items-center space-x-1.5" title={`Status: ${statusInfo.label}`}>
                      <span className={`h-2 w-2 rounded-full ${statusInfo.dotClass}`} />
                      <span className={`text-[10px] sitemap-font-mono font-medium ${statusInfo.textClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-semibold text-sm text-[var(--color-fg-main)] leading-tight mb-1">
                    {node.name}
                  </h3>
                  <p className="text-[11px] text-[var(--color-fg-secondary)] line-clamp-2 mb-2 font-normal">
                    {node.description}
                  </p>

                  {/* Footer Meta: Domain, Level, Expand/Collapse toggle */}
                  <div className="flex items-center justify-between text-[10px] sitemap-font-mono text-[var(--color-fg-subtle)] pt-1.5 border-t border-[var(--color-border-subtle)]">
                    <span className="truncate max-w-[110px]" style={{ color: domainAccentColor }}>
                      {node.domain}
                    </span>

                    <div className="flex items-center space-x-1">
                      {node.isMvp && (
                        <span className="bg-[#3E5CFF]/15 text-[#3E5CFF] px-1 rounded text-[9px] font-bold">
                          MVP
                        </span>
                      )}

                      {hasChildren && activeView === 'architecture' && (
                        <button
                          onClick={(e) => toggleExpandNode(node.id, e)}
                          className="p-0.5 hover:bg-[var(--color-bg-subtle)] rounded text-[var(--color-fg-main)]"
                          title={isExpanded ? 'Recolher descendentes' : 'Expandir descendentes'}
                        >
                          <ChevronDown className={`h-3 w-3 transform transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CANVAS CONTROLS (BOTTOM LEFT) */}
          <div className="absolute bottom-6 left-6 flex items-center space-x-1 bg-[var(--panel-glass)] backdrop-blur-md border border-[var(--color-border-subtle)] p-1.5 rounded-xl shadow-2xl z-20">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 2.5))}
              className="p-1.5 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] hover:bg-[var(--color-bg-subtle)] rounded-lg transition-colors"
              title="Aumentar Zoom (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-xs sitemap-font-mono text-[var(--color-fg-secondary)] w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.3))}
              className="p-1.5 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] hover:bg-[var(--color-bg-subtle)] rounded-lg transition-colors"
              title="Diminuir Zoom (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-[var(--color-border-subtle)] mx-1" />

            <button
              onClick={handleFitCanvas}
              className="px-2 py-1 text-xs sitemap-font-mono text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] hover:bg-[var(--color-bg-subtle)] rounded-lg flex items-center space-x-1 transition-colors"
              title="Enquadrar Visão Geral (0)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Fit</span>
            </button>
          </div>

          {/* ACTIVE PERSPECTIVE / NODE COUNTER OVERLAY (BOTTOM RIGHT) */}
          <div className="absolute bottom-6 right-6 bg-[var(--panel-glass)] backdrop-blur-md border border-[var(--color-border-subtle)] px-3 py-2 rounded-xl shadow-2xl z-20 text-xs sitemap-font-mono hidden sm:block">
            <div className="text-[var(--color-fg-subtle)] mb-0.5 flex items-center justify-between space-x-4">
              <span className="uppercase text-[10px]">Visão Ativa: {activeView.toUpperCase()}</span>
              <span className="bg-[var(--color-bg-subtle)] px-1.5 py-0.5 rounded text-[10px] text-[var(--color-fg-main)] font-semibold">
                {visibleNodes.length} nós no canvas
              </span>
            </div>
            <div className="text-[var(--color-fg-main)] font-semibold truncate max-w-xs">
              {selectedNode ? selectedNode.name : 'Nenhum nó selecionado'}
            </div>
          </div>
        </div>

        {/* PROVENANCE CONTEXTUAL INSPECTOR (SIDE DRAWER RIGHT) */}
        {selectedNode && visibleNodes.some(n => n.id === selectedNode.id) && (
          <aside className={`w-full md:w-96 bg-[var(--color-bg-elevated)] border-l border-[var(--color-border-subtle)] flex flex-col h-full z-30 shrink-0 shadow-2xl overflow-hidden sitemap-scrollbar transition-transform duration-200 ${
            isMobileInspectorOpen ? 'fixed inset-0 md:relative' : 'hidden md:flex'
          }`}>

            {/* Inspector Header */}
            <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="text-[10px] sitemap-font-mono px-2 py-0.5 rounded bg-[#3E5CFF]/15 text-[#3E5CFF] border border-[#3E5CFF]/30 font-semibold uppercase">
                    {selectedNode.category}
                  </span>

                  <span className={`text-[10px] sitemap-font-mono font-semibold ${STATUS_CONFIG[selectedNode.status].textClass}`}>
                    {STATUS_CONFIG[selectedNode.status].label}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[var(--color-fg-main)] leading-snug">{selectedNode.name}</h2>
              </div>

              <button
                onClick={() => { setSelectedNodeId(null); setIsMobileInspectorOpen(false); }}
                className="text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-main)] p-1 rounded-lg hover:bg-[var(--color-bg-hover)]"
                aria-label="Fechar Inspector"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inspector Scrollable Body */}
            <div className="p-4 space-y-5 text-xs overflow-y-auto flex-1 sitemap-scrollbar">

              {/* Description */}
              <div>
                <h4 className="sitemap-font-mono uppercase text-[10px] text-[var(--color-fg-subtle)] mb-1 font-semibold tracking-wider">
                  Descrição do Componente
                </h4>
                <p className="text-[var(--color-fg-secondary)] leading-relaxed font-sans text-xs">
                  {selectedNode.description}
                </p>
              </div>

              {/* Architectural Provenance & Repository Path */}
              <div className="bg-[var(--color-bg-subtle)] p-3 rounded-lg border border-[var(--color-border-subtle)] space-y-2 sitemap-font-mono">
                <div className="text-[var(--color-fg-subtle)] font-semibold uppercase text-[10px] tracking-wider">
                  Proveniência & Localização
                </div>
                <div>
                  <span className="text-[var(--color-fg-subtle)]">Caminho: </span>
                  <span className="text-emerald-400 font-bold break-all">{selectedNode.path}</span>
                </div>
                <div>
                  <span className="text-[var(--color-fg-subtle)]">Diretório: </span>
                  <span className="text-[var(--color-fg-main)]">{selectedNode.directory}</span>
                </div>
                <div>
                  <span className="text-[var(--color-fg-subtle)]">Camada: </span>
                  <span className="text-[var(--color-fg-main)] font-semibold">{selectedNode.layer}</span>
                </div>
                <div>
                  <span className="text-[var(--color-fg-subtle)]">Evidência: </span>
                  <span className="text-[var(--color-fg-secondary)]">{selectedNode.evidence}</span>
                </div>
              </div>

              {/* Responsibilities */}
              {selectedNode.responsibilities.length > 0 && (
                <div>
                  <h4 className="sitemap-font-mono uppercase text-[10px] text-[var(--color-fg-subtle)] mb-2 font-semibold tracking-wider">
                    Responsabilidades Principais
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedNode.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-[var(--color-fg-secondary)]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dependencies */}
              <div>
                <h4 className="sitemap-font-mono uppercase text-[10px] text-[var(--color-fg-subtle)] mb-2 font-semibold tracking-wider">
                  Depende De ({selectedNode.dependencies.length})
                </h4>
                {selectedNode.dependencies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.dependencies.map((depId) => {
                      const depNode = ARCHITECTURE_DATA.nodes.find(n => n.id === depId);
                      return (
                        <button
                          key={depId}
                          onClick={() => handleSelectNode(depId)}
                          className="sitemap-font-mono text-[11px] px-2 py-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] hover:border-[#3E5CFF] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] rounded transition-colors"
                        >
                          {depNode ? depNode.name : depId}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[var(--color-fg-subtle)] sitemap-font-mono">Nenhuma dependência direta declarada.</span>
                )}
              </div>

              {/* Dependents */}
              <div>
                <h4 className="sitemap-font-mono uppercase text-[10px] text-[var(--color-fg-subtle)] mb-2 font-semibold tracking-wider">
                  Utilizado Por ({selectedNode.dependents.length})
                </h4>
                {selectedNode.dependents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.dependents.map((depId) => {
                      const depNode = ARCHITECTURE_DATA.nodes.find(n => n.id === depId);
                      return (
                        <button
                          key={depId}
                          onClick={() => handleSelectNode(depId)}
                          className="sitemap-font-mono text-[11px] px-2 py-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] hover:border-[#3E5CFF] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] rounded transition-colors"
                        >
                          {depNode ? depNode.name : depId}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[var(--color-fg-subtle)] sitemap-font-mono">Nenhum dependente cadastrado.</span>
                )}
              </div>

              {/* Technologies */}
              {selectedNode.technologies.length > 0 && (
                <div>
                  <h4 className="sitemap-font-mono uppercase text-[10px] text-[var(--color-fg-subtle)] mb-1.5 font-semibold tracking-wider">
                    Tecnologias & Frameworks
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.technologies.map(tech => (
                      <span key={tech} className="sitemap-font-mono text-[10px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] px-2 py-0.5 rounded text-[var(--color-fg-secondary)]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Files */}
              {selectedNode.relatedFiles.length > 0 && (
                <div>
                  <h4 className="sitemap-font-mono uppercase text-[10px] text-[var(--color-fg-subtle)] mb-1.5 font-semibold tracking-wider">
                    Arquivos Relacionados
                  </h4>
                  <ul className="space-y-1 font-mono text-[11px]">
                    {selectedNode.relatedFiles.map(file => (
                      <li key={file} className="text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-main)] truncate">
                        • {file}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Direct GitHub Link */}
              <div className="pt-2">
                <a
                  href={selectedNode.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-[#3E5CFF] hover:bg-[#3E5CFF]/90 text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-lg"
                >
                  <Code2 className="h-4 w-4" />
                  <span>Abrir Código Fonte no GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

            </div>
          </aside>
        )}

      </div>

      {/* COMMAND PALETTE SEARCH MODAL (CMD+K / /) */}
      {isCommandSearchOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
          <div className="w-full max-w-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Search Input Header */}
            <div className="p-3 border-b border-[var(--color-border-subtle)] flex items-center space-x-3 bg-[var(--color-bg-subtle)]">
              <Search className="h-4 w-4 text-[var(--color-fg-subtle)] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder="Pesquisar por nome, diretório, API, responsabilidade... (Esc para sair)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-[var(--color-fg-main)] focus:outline-none"
              />
              <button
                onClick={() => setIsCommandSearchOpen(false)}
                className="text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-main)] p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto p-2 sitemap-scrollbar space-y-1">
              {searchResults.length > 0 ? (
                searchResults.map(node => (
                  <button
                    key={node.id}
                    onClick={() => {
                      handleSelectNode(node.id);
                      setIsCommandSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-[var(--color-bg-hover)] rounded-lg flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-[var(--color-fg-main)] group-hover:text-[#3E5CFF]">
                          {node.name}
                        </span>
                        <span className="text-[10px] sitemap-font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[var(--color-fg-subtle)] uppercase">
                          {node.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--color-fg-subtle)] sitemap-font-mono mt-0.5 truncate max-w-md">
                        {node.path}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] sitemap-font-mono text-[var(--color-fg-subtle)]">
                      <span>{node.domain}</span>
                      <CornerDownRight className="h-3.5 w-3.5 text-[var(--color-fg-subtle)] group-hover:text-[#3E5CFF]" />
                    </div>
                  </button>
                ))
              ) : searchQuery.trim() !== '' ? (
                <div className="p-8 text-center text-xs text-[var(--color-fg-subtle)] sitemap-font-mono">
                  Nenhum nó arquitetural encontrado para &quot;{searchQuery}&quot;.
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[var(--color-fg-subtle)] sitemap-font-mono">
                  Digite para encontrar componentes, rotas, tabelas ou ferramentas do Frank...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HELP / KEYBOARD SHORTCUTS MODAL (?) */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <h3 className="font-bold text-sm text-[var(--color-fg-main)] flex items-center space-x-2">
                <HelpCircle className="h-4 w-4 text-[#3E5CFF]" />
                <span>Atalhos de Teclado e Navegação</span>
              </h3>
              <button onClick={() => setIsHelpOpen(false)} className="text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-main)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs sitemap-font-mono">
              {[
                { key: '/  ou  Cmd+K', desc: 'Abrir Busca Global (Command Search)' },
                { key: 'Esc', desc: 'Fechar busca, inspector ou limpar seleção' },
                { key: '1 até 9', desc: 'Alternar entre as visões de perspectiva' },
                { key: '0', desc: 'Resetar zoom e enquadrar mapa central (Fit)' },
                { key: '?', desc: 'Abrir esta ajuda' },
                { key: 'Scroll / Pinça', desc: 'Zoom suave no canvas' },
                { key: 'Clique & Arraste', desc: 'Pan do canvas ou movimentação de nó' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-[var(--color-border-subtle)] last:border-none">
                  <kbd className="bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] px-2 py-0.5 rounded text-[11px] font-semibold text-[var(--color-fg-main)]">
                    {item.key}
                  </kbd>
                  <span className="text-[var(--color-fg-secondary)]">{item.desc}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="w-full py-2 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-hover)] text-[var(--color-fg-main)] text-xs font-semibold rounded-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
