import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useListFields, useCreateField, useDeleteField } from "@workspace/api-client-react";
import { Network, Plus, Trash2, Search, LayoutGrid, CheckSquare, Square, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// ──────────────────────────────────────────────
// Custom Node Components
// ──────────────────────────────────────────────
const ModuleNode = ({ data }: { data: Record<string, unknown> }) => (
  <div className="px-5 py-3 rounded-2xl border-2 border-primary bg-primary/20 backdrop-blur-md shadow-xl min-w-[140px] text-center">
    <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    <div className="text-sm font-bold text-primary uppercase tracking-widest">{data.label as string}</div>
    <div className="text-xs text-primary/70 mt-0.5">{data.count as number} campos</div>
  </div>
);

const TabNode = ({ data }: { data: Record<string, unknown> }) => (
  <div className="px-4 py-2 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 backdrop-blur-md shadow-md min-w-[120px] text-center">
    <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">{data.label as string}</div>
  </div>
);

const FieldNode = ({ data }: { data: Record<string, unknown> }) => (
  <div className="rounded-lg border border-border/60 bg-card/90 backdrop-blur-md shadow px-3 py-2 min-w-[140px] max-w-[200px] text-left">
    <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    <div className="font-mono text-xs font-bold text-foreground truncate">{data.label as string}</div>
    {data.tableName && (
      <div className="text-[10px] text-muted-foreground/60 mt-0.5 truncate font-mono">{data.tableName as string}</div>
    )}
  </div>
);

const nodeTypes = { module: ModuleNode, tab: TabNode, field: FieldNode };

// ──────────────────────────────────────────────
// Layout builder: Módulo > Aba > Campo
// ──────────────────────────────────────────────
function buildTreeLayout(
  fields: Array<{ id: number; fieldName: string; tableName: string; module: string; description?: string | null; fieldType?: string | null }>
) {
  const FIELD_W = 170;
  const FIELD_GAP = 16;
  const TAB_GAP = 24;
  const MODULE_GAP = 60;
  const LEVEL_H = 110;

  // Group: module → tab → fields
  const tree = new Map<string, Map<string, typeof fields>>();
  for (const f of fields) {
    if (!tree.has(f.module)) tree.set(f.module, new Map());
    const tabs = tree.get(f.module)!;
    if (!tabs.has(f.tableName)) tabs.set(f.tableName, []);
    tabs.get(f.tableName)!.push(f);
  }

  const nodes: Array<{id: string; type: string; position: {x: number; y: number}; data: Record<string, unknown>}> = [];
  const edges: Array<{id: string; source: string; target: string; animated: boolean; style: object; markerEnd: object}> = [];

  const edgeStyle = { stroke: "hsl(var(--primary))", strokeWidth: 1.5, opacity: 0.5 };
  const marker = { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" };

  let moduleX = 0;
  const moduleY = 0;

  for (const [moduleName, tabs] of tree) {
    // Calculate total width of this module's sub-tree
    let moduleWidth = 0;
    for (const tabFields of tabs.values()) {
      moduleWidth += tabFields.length * (FIELD_W + FIELD_GAP) - FIELD_GAP + TAB_GAP;
    }
    moduleWidth = Math.max(moduleWidth - TAB_GAP, FIELD_W);

    const moduleCenterX = moduleX + moduleWidth / 2;
    const moduleId = `mod-${moduleName}`;
    nodes.push({
      id: moduleId,
      type: "module",
      position: { x: moduleCenterX - 70, y: moduleY },
      data: { label: moduleName, count: [...tabs.values()].flat().length },
    });

    let tabX = moduleX;
    const tabY = moduleY + LEVEL_H;

    for (const [tabName, tabFields] of tabs) {
      const tabWidth = tabFields.length * (FIELD_W + FIELD_GAP) - FIELD_GAP;
      const tabCenterX = tabX + Math.max(tabWidth, FIELD_W) / 2;
      const tabId = `tab-${moduleName}-${tabName}`;

      nodes.push({
        id: tabId,
        type: "tab",
        position: { x: tabCenterX - 60, y: tabY },
        data: { label: tabName },
      });
      edges.push({ id: `e-${moduleId}-${tabId}`, source: moduleId, target: tabId, animated: true, style: edgeStyle, markerEnd: marker });

      const fieldY = tabY + LEVEL_H;
      tabFields.forEach((f, fi) => {
        const fieldX = tabX + fi * (FIELD_W + FIELD_GAP);
        const fieldId = `field-${f.id}`;
        nodes.push({
          id: fieldId,
          type: "field",
          position: { x: fieldX, y: fieldY },
          data: { label: f.fieldName, tableName: f.tableName, fieldType: f.fieldType ?? undefined, description: f.description ?? undefined },
        });
        edges.push({ id: `e-${tabId}-${fieldId}`, source: tabId, target: fieldId, animated: false, style: edgeStyle, markerEnd: marker });
      });

      tabX += Math.max(tabWidth, FIELD_W) + TAB_GAP;
    }

    moduleX += moduleWidth + MODULE_GAP;
  }

  return { nodes, edges };
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export default function MindmapPage() {
  const { data: fieldsList, isLoading } = useListFields();
  const createFieldMutation = useCreateField();
  const deleteFieldMutation = useDeleteField();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModule, setFilterModule] = useState("Todos");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newField, setNewField] = useState({ fieldName: "", tableName: "", module: "", description: "", fieldType: "" });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // All unique modules for filter
  const allModules = useMemo(() => {
    const mods = new Set((fieldsList ?? []).map(f => f.module));
    return ["Todos", ...Array.from(mods).sort()];
  }, [fieldsList]);

  // Filtered list for sidebar
  const filteredFields = useMemo(() => {
    return (fieldsList ?? []).filter(f => {
      const matchesSearch =
        f.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.module.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMod = filterModule === "Todos" || f.module === filterModule;
      return matchesSearch && matchesMod;
    });
  }, [fieldsList, searchTerm, filterModule]);

  // Select all visible
  const toggleAll = useCallback(() => {
    const allVisible = filteredFields.map(f => f.id);
    const allSelected = allVisible.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allVisible.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allVisible.forEach(id => next.add(id));
        return next;
      });
    }
  }, [filteredFields, selectedIds]);

  const toggleField = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Rebuild graph whenever selection changes
  useEffect(() => {
    const selected = (fieldsList ?? []).filter(f => selectedIds.has(f.id));
    if (selected.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const { nodes: n, edges: e } = buildTreeLayout(selected);
    setNodes(n as Parameters<typeof setNodes>[0]);
    setEdges(e as Parameters<typeof setEdges>[0]);
  }, [selectedIds, fieldsList]);

  const handleAddField = async () => {
    if (!newField.fieldName || !newField.tableName || !newField.module) {
      toast({ title: "Campos obrigatórios", description: "Preencha Nome, Aba e Módulo.", variant: "destructive" });
      return;
    }
    try {
      const created = await createFieldMutation.mutateAsync({ data: newField });
      toast({ title: "Campo adicionado", description: `${newField.fieldName} salvo com sucesso.` });
      setIsAddOpen(false);
      setNewField({ fieldName: "", tableName: "", module: "", description: "", fieldType: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/fields"] });
      // Auto-select newly created field
      if (created?.id) setSelectedIds(prev => new Set([...prev, created.id]));
    } catch {
      toast({ title: "Erro", description: "Falha ao criar campo.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteFieldMutation.mutateAsync({ id });
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      queryClient.invalidateQueries({ queryKey: ["/api/fields"] });
      toast({ title: "Removido", description: "Campo excluído." });
    } catch {
      toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    }
  };

  const allVisibleSelected = filteredFields.length > 0 && filteredFields.every(f => selectedIds.has(f.id));

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* ── React Flow Canvas ── */}
      <div className="flex-1 relative border-r border-border/50">
        {nodes.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
            <Network className="w-12 h-12 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">Nenhum campo selecionado</p>
              <p className="text-xs opacity-60 mt-1">Selecione campos no painel ao lado para visualizá-los no mapa</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            colorMode="dark"
            className="bg-transparent"
          >
            <Background color="hsl(var(--muted-foreground))" gap={24} size={1} opacity={0.15} />
            <Controls className="bg-card border-border" />
            <MiniMap
              nodeColor={(n) =>
                n.type === "module" ? "hsl(var(--primary))" :
                n.type === "tab" ? "#10b981" : "hsl(var(--card))"
              }
              className="bg-card/80 border border-border rounded-xl overflow-hidden"
            />
          </ReactFlow>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-3 z-10">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
            <span className="w-3 h-3 rounded-sm bg-primary/60 border border-primary inline-block" /> Módulo
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/60 inline-block" /> Aba
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
            <span className="w-3 h-3 rounded-sm bg-card border border-border inline-block" /> Campo
          </span>
        </div>
      </div>

      {/* ── Right Sidebar ── */}
      <div className="w-96 bg-card/50 backdrop-blur-xl flex flex-col h-full shadow-2xl">

        {/* Header */}
        <div className="p-5 border-b border-border/50 space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Network className="w-4 h-4 text-primary" />
              Dicionário de Campos
            </h2>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 rounded-lg gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Novo campo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Campo</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do Campo *</Label>
                    <Input value={newField.fieldName} onChange={e => setNewField({ ...newField, fieldName: e.target.value })} placeholder="ex: valor_baixado" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aba * <span className="text-muted-foreground font-normal">(seção/tela onde aparece)</span></Label>
                    <Input value={newField.tableName} onChange={e => setNewField({ ...newField, tableName: e.target.value })} placeholder="ex: Recebimentos" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Módulo *</Label>
                    <Input value={newField.module} onChange={e => setNewField({ ...newField, module: e.target.value })} placeholder="ex: Financeiro" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descrição</Label>
                    <Input value={newField.description} onChange={e => setNewField({ ...newField, description: e.target.value })} placeholder="Para que serve este campo?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Input value={newField.fieldType} onChange={e => setNewField({ ...newField, fieldType: e.target.value })} placeholder="ex: Número, Data, Texto..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddField} disabled={createFieldMutation.isPending} className="w-full">
                    Salvar Campo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar campos ou abas..."
              className="pl-9 h-8 text-xs bg-background/50"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Module filter */}
          <div className="flex gap-1.5 flex-wrap">
            {allModules.map(m => (
              <button
                key={m}
                onClick={() => setFilterModule(m)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                  filterModule === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Select all / count */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {allVisibleSelected
                ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                : <Square className="w-3.5 h-3.5" />
              }
              {allVisibleSelected ? "Desmarcar todos" : "Selecionar todos"}
            </button>
            <Badge variant="secondary" className="text-[10px] h-5">
              {selectedIds.size} no mapa
            </Badge>
          </div>
        </div>

        {/* Fields list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-xs">Carregando...</div>
          ) : filteredFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LayoutGrid className="w-7 h-7 mx-auto mb-2 opacity-20" />
              <p className="text-xs">Nenhum campo encontrado</p>
            </div>
          ) : (
            filteredFields.map(field => {
              const isSelected = selectedIds.has(field.id);
              return (
                <div
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className={`group p-3 rounded-xl border cursor-pointer transition-all select-none ${
                    isSelected
                      ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10"
                      : "border-border/40 bg-background/40 hover:border-border hover:bg-card/60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox */}
                    <div className="mt-0.5 flex-shrink-0">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">
                          {field.module}
                        </Badge>
                        <span className="text-[10px] text-emerald-400 font-medium">{field.tableName}</span>
                      </div>
                      <div className="font-mono text-xs font-semibold truncate">{field.fieldName}</div>
                      {field.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{field.description}</p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(field.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-border/30 text-[11px] text-muted-foreground/50 text-center flex-shrink-0">
          Clique em um campo para adicionar/remover do mapa
        </div>
      </div>
    </div>
  );
}
