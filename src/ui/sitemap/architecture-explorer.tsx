'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, ZoomIn, ZoomOut, RotateCcw, Filter, Layers, GitBranch,
  Database, Cpu, Network, Server, ShieldCheck, CheckCircle2, AlertTriangle,
  X, ChevronRight, ExternalLink, HelpCircle, FileText, ArrowRight, Eye, Code2
} from 'lucide-react';
import { ARCHITECTURE_DATA, ArchNode, NodeCategory, NodeStatus } from './architecture-data';

export function ArchitectureExplorer() {
  // State
  const [activeView, setActiveView] = useState<'architecture' | 'flow' | 'dependencies' | 'data' | 'integrations' | 'ai' | 'infra'>('architecture');
  const [systemMode, setSystemMode] = useState<'MVP' | 'FULL'>('MVP');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('condstore-root');
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ 'condstore-root': true });
  const [showPrDiff, setShowPrDiff] = useState<boolean>(true);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Deep linking sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const nodeParam = params.get('node');
      const viewParam = params.get('view');
      const modeParam = params.get('mode');

      if (nodeParam && ARCHITECTURE_DATA.nodes.some(n => n.id === nodeParam)) {
        setSelectedNodeId(nodeParam);
      }
      if (viewParam && ['architecture', 'flow', 'dependencies', 'data', 'integrations', 'ai', 'infra'].includes(viewParam)) {
        setActiveView(viewParam as any);
      }
      if (modeParam && ['MVP', 'FULL'].includes(modeParam)) {
        setSystemMode(modeParam as any);
      }
    }
  }, []);

  const updateUrl = useCallback((nodeId: string | null, view: string, mode: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (nodeId) url.searchParams.set('node', nodeId);
      else url.searchParams.delete('node');
      url.searchParams.set('view', view);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === '+') setZoomLevel(prev => Math.min(prev + 0.2, 2.5));
      if (e.key === '-') setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
      if (e.key === '0') { setZoomLevel(1); setPan({ x: 0, y: 0 }); }
      if (e.key === 'Escape') setSelectedNodeId(null);
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('arch-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Pan Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Filtered Nodes
  const filteredNodes = useMemo(() => {
    return ARCHITECTURE_DATA.nodes.filter(node => {
      // MVP Mode
      if (systemMode === 'MVP' && !node.isMvp) return false;

      // View Filters
      if (activeView === 'data' && !['Database', 'entity'].includes(node.domain) && node.category !== 'entity') return false;
      if (activeView === 'integrations' && node.category !== 'integration' && node.domain !== 'Integrations') return false;
      if (activeView === 'ai' && !['IA Frank', 'ai_tool'].includes(node.domain) && node.category !== 'ai_tool') return false;
      if (activeView === 'infra' && !['Infrastructure', 'infra', 'Database'].includes(node.domain) && node.category !== 'infra') return false;

      // Domain Filter
      if (selectedDomain !== 'ALL' && node.domain !== selectedDomain) return false;

      // Status Filter
      if (selectedStatus !== 'ALL' && node.status !== selectedStatus) return false;

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = node.name.toLowerCase().includes(q);
        const matchesPath = node.path.toLowerCase().includes(q);
        const matchesResp = node.responsibilities.some(r => r.toLowerCase().includes(q));
        const matchesDomain = node.domain.toLowerCase().includes(q);
        return matchesName || matchesPath || matchesResp || matchesDomain;
      }

      return true;
    });
  }, [systemMode, activeView, selectedDomain, selectedStatus, searchQuery]);

  // Selected Node Object
  const selectedNode = useMemo(() => {
    return ARCHITECTURE_DATA.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId]);

  // Edges filtered
  const activeEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return ARCHITECTURE_DATA.edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  }, [filteredNodes]);

  // Select node handler
  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    updateUrl(id, activeView, systemMode);
  };

  const selectedPrDiff = ARCHITECTURE_DATA.prDiffs[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0E13] text-[#F5F6F8] font-sans overflow-hidden select-none">

      {/* HEADER / TOP BAR */}
      <header className="h-16 border-b border-gray-800 bg-[#12161F] px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="bg-[#3E5CFF] text-white font-bold text-xs px-2 py-1 rounded tracking-widest uppercase">
              CONDSTORE OS
            </span>
            <span className="text-xs text-gray-400 font-mono">v1.0.0 (Architectural Explorer)</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="arch-search-input"
            type="text"
            placeholder="Pesquisar módulos, tabelas, APIs, Frank, arquivos... (/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A202C] border border-gray-700 text-sm text-white pl-9 pr-8 py-1.5 rounded-lg focus:outline-none focus:border-[#3E5CFF]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mode Switcher & Tools */}
        <div className="flex items-center space-x-3">
          <div className="bg-[#1A202C] p-1 rounded-lg border border-gray-800 flex space-x-1">
            <button
              onClick={() => { setSystemMode('MVP'); updateUrl(selectedNodeId, activeView, 'MVP'); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${systemMode === 'MVP' ? 'bg-[#3E5CFF] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              MVP CORE
            </button>
            <button
              onClick={() => { setSystemMode('FULL'); updateUrl(selectedNodeId, activeView, 'FULL'); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${systemMode === 'FULL' ? 'bg-[#3E5CFF] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              FULL SYSTEM
            </button>
          </div>

          <a
            href="https://github.com/condstore/condstore-os"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-white flex items-center space-x-1 border border-gray-700 px-3 py-1.5 rounded-lg bg-[#1A202C]"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>GitHub Repositório</span>
          </a>
        </div>
      </header>

      {/* VIEW SELECTOR BAR */}
      <div className="h-11 bg-[#12161F]/80 border-b border-gray-800 px-4 flex items-center justify-between shrink-0 z-20 overflow-x-auto">
        <div className="flex items-center space-x-1 font-mono text-xs">
          {[
            { id: 'architecture', label: '[ ARQUITETURA ]', icon: Layers },
            { id: 'flow', label: '[ FLUXO ]', icon: Network },
            { id: 'dependencies', label: '[ DEPENDÊNCIAS ]', icon: GitBranch },
            { id: 'data', label: '[ DADOS ]', icon: Database },
            { id: 'integrations', label: '[ INTEGRAÇÕES ]', icon: Server },
            { id: 'ai', label: '[ IA FRANK ]', icon: Cpu },
            { id: 'infra', label: '[ INFRA ]', icon: ShieldCheck },
          ].map(view => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => { setActiveView(view.id as any); updateUrl(selectedNodeId, view.id, systemMode); }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  isActive ? 'bg-[#3E5CFF]/20 text-[#3E5CFF] border border-[#3E5CFF]/40 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{view.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">Domínio:</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-[#1A202C] border border-gray-700 rounded px-2 py-1 text-white focus:outline-none"
            >
              <option value="ALL">Todos os Domínios</option>
              <option value="Atendimento">Atendimento</option>
              <option value="Logística">Logística</option>
              <option value="Orders">Orders</option>
              <option value="Cockpit">Cockpit</option>
              <option value="IA Frank">IA Frank</option>
              <option value="Database">Database</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-gray-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#1A202C] border border-gray-700 rounded px-2 py-1 text-white focus:outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="🟢 Produção">🟢 Produção</option>
              <option value="🟡 Parcial">🟡 Parcial</option>
              <option value="🔵 Implementado">🔵 Implementado</option>
              <option value="🟣 Experimental">🟣 Experimental</option>
            </select>
          </div>
        </div>
      </div>

      {/* PR EVOLUTION DIFF BANNER ("Como era vs Como ficou") */}
      {showPrDiff && selectedPrDiff && (
        <div className="bg-[#171C26] border-b border-gray-800 px-4 py-2.5 flex items-center justify-between text-xs z-20 shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold shrink-0">
              {selectedPrDiff.prNumber} Evolução da Arquitetura
            </span>
            <span className="font-semibold text-white truncate shrink-0">{selectedPrDiff.title}</span>
            <div className="hidden lg:flex items-center space-x-2 text-gray-300 truncate">
              <span className="text-red-400 font-mono">Como era:</span>
              <span className="truncate max-w-md">{selectedPrDiff.before}</span>
              <ArrowRight className="h-3 w-3 text-gray-500 shrink-0" />
              <span className="text-emerald-400 font-mono">Como ficou:</span>
              <span className="truncate max-w-md">{selectedPrDiff.after}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 ml-2">
            <span className="text-gray-400 italic hidden xl:inline">💡 {selectedPrDiff.didacticSummary}</span>
            <button
              onClick={() => setShowPrDiff(false)}
              className="text-gray-500 hover:text-gray-300 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* SPATIAL CANVAS AREA */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-1 relative bg-[#0B0E13] overflow-hidden cursor-${isDragging ? 'grabbing' : 'grab'}`}
          style={{
            backgroundImage: 'radial-gradient(#1E2638 1px, transparent 1px)',
            backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >

          {/* SVG CONNECTIONS / EDGES */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="22" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3E5CFF" opacity="0.6" />
              </marker>
            </defs>
            <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`, transformOrigin: '0 0' }}>
              {activeEdges.map(edge => {
                const sourceNode = filteredNodes.find(n => n.id === edge.source);
                const targetNode = filteredNodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const isSelected = selectedNodeId === edge.source || selectedNodeId === edge.target;

                return (
                  <g key={edge.id}>
                    <line
                      x1={(sourceNode.x || 100) + 110}
                      y1={(sourceNode.y || 100) + 35}
                      x2={(targetNode.x || 100) + 110}
                      y2={(targetNode.y || 100) + 35}
                      stroke={isSelected ? '#3E5CFF' : '#2D3748'}
                      strokeWidth={isSelected ? 2.5 : 1}
                      strokeDasharray={edge.type === 'data_flow' ? '4,4' : undefined}
                      markerEnd="url(#arrowhead)"
                      opacity={isSelected ? 1 : 0.4}
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* NODES LAYER */}
          <div
            className="absolute inset-0 origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`
            }}
          >
            {filteredNodes.map(node => {
              const isSelected = selectedNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={(e) => { e.stopPropagation(); handleSelectNode(node.id); }}
                  className={`absolute w-56 rounded-xl border p-3 bg-[#12161F] shadow-xl cursor-pointer transition-all hover:scale-105 z-10 ${
                    isSelected
                      ? 'border-[#3E5CFF] ring-2 ring-[#3E5CFF]/50 bg-[#161C2A]'
                      : 'border-gray-800 hover:border-gray-600'
                  }`}
                  style={{
                    left: `${node.x || 100}px`,
                    top: `${node.y || 100}px`
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 uppercase font-semibold">
                      {node.category}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {node.status.split(' ')[0]}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white leading-tight mb-1">{node.name}</h3>
                  <p className="text-[11px] text-gray-400 line-clamp-2 mb-2 font-sans">{node.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1 border-t border-gray-800">
                    <span className="truncate max-w-[120px]">{node.domain}</span>
                    <span className="text-[#3E5CFF] font-semibold">L{node.level}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ZOOM & VIEW CONTROLS (BOTTOM LEFT) */}
          <div className="absolute bottom-6 left-6 flex items-center space-x-2 bg-[#12161F] border border-gray-800 p-1.5 rounded-xl shadow-2xl z-20">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2.5))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg"
              title="Aumentar Zoom (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono text-gray-400 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg"
              title="Diminuir Zoom (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-gray-800 my-auto" />
            <button
              onClick={() => { setZoomLevel(1); setPan({ x: 0, y: 0 }); }}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg flex items-center space-x-1"
              title="Resetar Visualização (0)"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* MINIMAP / BREADCRUMB OVERLAY (BOTTOM RIGHT) */}
          <div className="absolute bottom-6 right-6 bg-[#12161F]/90 border border-gray-800 p-3 rounded-xl shadow-2xl z-20 text-xs font-mono max-w-sm">
            <div className="text-gray-400 mb-1 flex items-center justify-between">
              <span>Navegação do Sistema</span>
              <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">
                {filteredNodes.length} nós ativos
              </span>
            </div>
            <div className="text-white font-semibold flex items-center space-x-1 overflow-x-auto py-1">
              <span>CONDSTORE</span>
              <ChevronRight className="h-3 w-3 text-gray-500 shrink-0" />
              <span className="text-[#3E5CFF] truncate">
                {selectedNode ? selectedNode.name : 'Selecione um nó'}
              </span>
            </div>
          </div>
        </div>

        {/* PROVENANCE DETAIL PANEL (SIDE DRAWER RIGHT) */}
        {selectedNode && (
          <aside className="w-96 bg-[#12161F] border-l border-gray-800 flex flex-col h-full z-30 shrink-0 shadow-2xl overflow-y-auto">

            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-800 flex items-start justify-between bg-[#161C2A]">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#3E5CFF]/20 text-[#3E5CFF] border border-[#3E5CFF]/30 font-semibold">
                    {selectedNode.category.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">
                    {selectedNode.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedNode.name}</h2>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 space-y-5 text-sm">

              {/* Description */}
              <div>
                <h4 className="text-xs font-mono uppercase text-gray-400 mb-1 font-semibold">Descrição do Componente</h4>
                <p className="text-gray-300 leading-relaxed font-sans">{selectedNode.description}</p>
              </div>

              {/* Provenance & Files */}
              <div className="bg-[#1A202C] p-3 rounded-lg border border-gray-800 space-y-2 font-mono text-xs">
                <div className="text-gray-400 font-semibold uppercase text-[10px]">Proveniência & Localização</div>
                <div>
                  <span className="text-gray-500">Path: </span>
                  <span className="text-emerald-400 font-bold break-all">{selectedNode.path}</span>
                </div>
                <div>
                  <span className="text-gray-500">Diretório: </span>
                  <span className="text-gray-300">{selectedNode.directory}</span>
                </div>
                <div>
                  <span className="text-gray-500">Evidência: </span>
                  <span className="text-gray-300">{selectedNode.evidence}</span>
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <h4 className="text-xs font-mono uppercase text-gray-400 mb-2 font-semibold">Responsabilidades Principais</h4>
                <ul className="space-y-1.5">
                  {selectedNode.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-xs text-gray-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Dependencies */}
              <div>
                <h4 className="text-xs font-mono uppercase text-gray-400 mb-2 font-semibold">Depende De ({selectedNode.dependencies.length})</h4>
                {selectedNode.dependencies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.dependencies.map((depId) => {
                      const depNode = ARCHITECTURE_DATA.nodes.find(n => n.id === depId);
                      return (
                        <button
                          key={depId}
                          onClick={() => handleSelectNode(depId)}
                          className="text-xs font-mono px-2 py-1 bg-[#1A202C] border border-gray-700 hover:border-[#3E5CFF] text-gray-300 hover:text-white rounded transition-colors"
                        >
                          {depNode ? depNode.name : depId}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 font-mono">Nenhuma dependência externa declarada.</span>
                )}
              </div>

              {/* Dependents */}
              <div>
                <h4 className="text-xs font-mono uppercase text-gray-400 mb-2 font-semibold">Utilizado Por ({selectedNode.dependents.length})</h4>
                {selectedNode.dependents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.dependents.map((depId) => {
                      const depNode = ARCHITECTURE_DATA.nodes.find(n => n.id === depId);
                      return (
                        <button
                          key={depId}
                          onClick={() => handleSelectNode(depId)}
                          className="text-xs font-mono px-2 py-1 bg-[#1A202C] border border-gray-700 hover:border-[#3E5CFF] text-gray-300 hover:text-white rounded transition-colors"
                        >
                          {depNode ? depNode.name : depId}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 font-mono">Nenhum dependente cadastrado.</span>
                )}
              </div>

              {/* GitHub Code Link */}
              <div className="pt-2">
                <a
                  href={selectedNode.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-[#3E5CFF] hover:bg-[#3E5CFF]/90 text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors"
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
    </div>
  );
}
