import { useState, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MarkerType,
  Handle,
  Position,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useListFields, useCreateField, useDeleteField } from "@workspace/api-client-react";
import { Network, Plus, Trash2, Search, LayoutGrid, CheckSquare, Square, Download, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type ModuleRecord = { id: number; name: string; description?: string | null; createdAt: string };

// ──────────────────────────────────────────────
// API hooks for modules
// ──────────────────────────────────────────────
const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

function useModules() {
  return useQuery<ModuleRecord[]>({
    queryKey: ["/api/modules"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/modules`);
      if (!res.ok) throw new Error("Failed to fetch modules");
      return res.json();
    },
  });
}

function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch(`${API_BASE}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create module");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/modules"] }),
  });
}

function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API_BASE}/modules/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/modules"] }),
  });
}

// ──────────────────────────────────────────────
// Custom Node Components
// ──────────────────────────────────────────────
const ModuleNode = ({ data }: { data: Record<string, unknown> }) => {
  const isEmpty = (data.count as number) === 0;
  return (
    <div className={`px-5 py-3 rounded-2xl border-2 shadow-xl min-w-[140px] text-center transition-all ${
      isEmpty
        ? "border-primary/30 bg-primary/5 opacity-60"
        : "border-primary bg-primary/20 backdrop-blur-md"
    }`}>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className={`text-sm font-bold uppercase tracking-widest ${isEmpty ? "text-primary/50" : "text-primary"}`}>
        {data.label as string}
      </div>
      <div className={`text-xs mt-0.5 ${isEmpty ? "text-primary/30" : "text-primary/70"}`}>
        {isEmpty ? "sem campos" : `${data.count as number} campos`}
      </div>
    </div>
  );
};

const TabNode = ({ data }: { data: Record<string, unknown> }) => (
  <div className="px-4 py-2 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 backdrop-blur-md shadow-md min-w-[120px] text-center">
    <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">{data.label as string}</div>
  </div>
);

const SectionNode = ({ data }: { data: Record<string, unknown> }) => (
  <div className="px-3 py-1.5 rounded-lg border border-amber-400/50 bg-amber-400/10 backdrop-blur-md shadow-sm min-w-[100px] text-center">
    <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    <div className="text-[11px] font-medium text-amber-300 tracking-wide">{data.label as string}</div>
  </div>
);

const FieldNode = ({ data }: { data: Record<string, unknown> }) => (
  <div className="rounded-lg border border-border/60 bg-card/90 backdrop-blur-md shadow px-3 py-2 text-left">
    <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    <div className="font-mono text-xs font-bold text-foreground whitespace-nowrap">{data.label as string}</div>
    {data.tableName && (
      <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono whitespace-nowrap">{data.tableName as string}</div>
    )}
  </div>
);

const nodeTypes = { module: ModuleNode, tab: TabNode, section: SectionNode, field: FieldNode };

// ──────────────────────────────────────────────
// Layout builder: registeredModules + Aba > Seção? > Campo
// ──────────────────────────────────────────────
type FieldItem = {
  id: number;
  fieldName: string;
  tableName: string;
  sectionName?: string | null;
  module: string;
  description?: string | null;
  fieldType?: string | null;
};

function buildTreeLayout(fields: FieldItem[], registeredModules: string[]) {
  const FIELD_W = 170;
  const FIELD_GAP = 16;
  const SEC_GAP = 20;
  const TAB_GAP = 28;
  const MODULE_GAP = 80;
  const MODULE_EMPTY_W = 180;
  const LEVEL_H = 110;

  type SectionMap = Map<string, FieldItem[]>;
  type AbaMap = Map<string, SectionMap>;
  type ModuleMap = Map<string, AbaMap>;

  const tree: ModuleMap = new Map();

  // Always include all registered modules (even if empty)
  for (const modName of registeredModules) {
    tree.set(modName, new Map());
  }

  for (const f of fields) {
    if (!tree.has(f.module)) tree.set(f.module, new Map());
    const abas = tree.get(f.module)!;
    if (!abas.has(f.tableName)) abas.set(f.tableName, new Map());
    const sections = abas.get(f.tableName)!;
    const secKey = f.sectionName?.trim() || "_";
    if (!sections.has(secKey)) sections.set(secKey, []);
    sections.get(secKey)!.push(f);
  }

  const nodes: Array<{id: string; type: string; position: {x: number; y: number}; data: Record<string, unknown>}> = [];
  const edges: Array<{id: string; source: string; target: string; animated: boolean; style: object; markerEnd: object}> = [];

  const edgeStyle = { stroke: "hsl(var(--primary))", strokeWidth: 1.5, opacity: 0.5 };
  const marker = { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" };

  function abaWidth(sections: SectionMap): number {
    let w = 0;
    for (const sFields of sections.values()) {
      w += sFields.length * (FIELD_W + FIELD_GAP) - FIELD_GAP + SEC_GAP;
    }
    return Math.max(w - SEC_GAP, FIELD_W);
  }

  let moduleX = 0;
  const moduleY = 0;

  for (const [moduleName, abas] of tree) {
    const isEmpty = abas.size === 0;

    let moduleWidth = MODULE_EMPTY_W;
    if (!isEmpty) {
      moduleWidth = 0;
      for (const sections of abas.values()) {
        moduleWidth += abaWidth(sections) + TAB_GAP;
      }
      moduleWidth = Math.max(moduleWidth - TAB_GAP, MODULE_EMPTY_W);
    }

    const moduleCenterX = moduleX + moduleWidth / 2;
    const moduleId = `mod-${moduleName}`;
    const fieldCount = [...abas.values()].flatMap(s => [...s.values()]).flat().length;

    nodes.push({
      id: moduleId,
      type: "module",
      position: { x: moduleCenterX - 70, y: moduleY },
      data: { label: moduleName, count: fieldCount },
    });

    if (!isEmpty) {
      let abaX = moduleX;
      const abaY = moduleY + LEVEL_H;

      for (const [tabName, sections] of abas) {
        const aw = abaWidth(sections);
        const abaCenterX = abaX + aw / 2;
        const tabId = `tab-${moduleName}-${tabName}`;

        nodes.push({
          id: tabId,
          type: "tab",
          position: { x: abaCenterX - 60, y: abaY },
          data: { label: tabName },
        });
        edges.push({ id: `e-${moduleId}-${tabId}`, source: moduleId, target: tabId, animated: true, style: edgeStyle, markerEnd: marker });

        const sectionKeys = Array.from(sections.keys());
        const hasRealSections = sectionKeys.some(k => k !== "_");

        let secX = abaX;
        const sectionY = abaY + LEVEL_H;

        if (!hasRealSections) {
          const allFields = sections.get("_") ?? [];
          allFields.forEach((f, fi) => {
            const fieldX = abaX + fi * (FIELD_W + FIELD_GAP);
            const fieldId = `field-${f.id}`;
            nodes.push({
              id: fieldId,
              type: "field",
              position: { x: fieldX, y: sectionY },
              data: { label: f.fieldName, tableName: f.tableName, fieldType: f.fieldType ?? undefined },
            });
            edges.push({ id: `e-${tabId}-${fieldId}`, source: tabId, target: fieldId, animated: false, style: edgeStyle, markerEnd: marker });
          });
        } else {
          for (const [secKey, secFields] of sections) {
            const secWidth = secFields.length * (FIELD_W + FIELD_GAP) - FIELD_GAP;
            const secCenterX = secX + Math.max(secWidth, FIELD_W) / 2;

            if (secKey === "_") {
              secFields.forEach((f, fi) => {
                const fieldX = secX + fi * (FIELD_W + FIELD_GAP);
                const fieldId = `field-${f.id}`;
                nodes.push({
                  id: fieldId,
                  type: "field",
                  position: { x: fieldX, y: sectionY + LEVEL_H },
                  data: { label: f.fieldName, tableName: f.tableName, fieldType: f.fieldType ?? undefined },
                });
                edges.push({ id: `e-${tabId}-${fieldId}`, source: tabId, target: fieldId, animated: false, style: edgeStyle, markerEnd: marker });
              });
              secX += Math.max(secWidth, FIELD_W) + SEC_GAP;
              continue;
            }

            const secId = `sec-${moduleName}-${tabName}-${secKey}`;
            nodes.push({
              id: secId,
              type: "section",
              position: { x: secCenterX - 50, y: sectionY },
              data: { label: secKey },
            });
            edges.push({ id: `e-${tabId}-${secId}`, source: tabId, target: secId, animated: true, style: { ...edgeStyle, strokeDasharray: "4 2" }, markerEnd: marker });

            const fieldY = sectionY + LEVEL_H;
            secFields.forEach((f, fi) => {
              const fieldX = secX + fi * (FIELD_W + FIELD_GAP);
              const fieldId = `field-${f.id}`;
              nodes.push({
                id: fieldId,
                type: "field",
                position: { x: fieldX, y: fieldY },
                data: { label: f.fieldName, tableName: f.tableName, fieldType: f.fieldType ?? undefined },
              });
              edges.push({ id: `e-${secId}-${fieldId}`, source: secId, target: fieldId, animated: false, style: edgeStyle, markerEnd: marker });
            });
            secX += Math.max(secWidth, FIELD_W) + SEC_GAP;
          }
        }

        abaX += aw + TAB_GAP;
      }
    }

    moduleX += moduleWidth + MODULE_GAP;
  }

  return { nodes, edges };
}

// ──────────────────────────────────────────────
// PNG Export button
// ──────────────────────────────────────────────
function ExportPngButton() {
  const { getNodes } = useReactFlow();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    const flowEl = document.querySelector(".react-flow") as HTMLElement | null;
    if (!flowEl) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(flowEl, {
        backgroundColor: "#0f0f11",
        quality: 1,
        pixelRatio: 2,
        filter: (node) => {
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__controls")) return false;
          return true;
        },
      });
      const link = document.createElement("a");
      link.download = `mapa-campos-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "PNG exportado", description: "Imagem pronta para colar no Outline." });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [getNodes, toast]);

  return (
    <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs" onClick={handleExport} disabled={exporting}>
      <Download className="w-3.5 h-3.5" />
      {exporting ? "Exportando..." : "Exportar PNG"}
    </Button>
  );
}

// ──────────────────────────────────────────────
// Module selector component
// ──────────────────────────────────────────────
function ModuleSelect({ value, onChange, modules }: { value: string; onChange: (v: string) => void; modules: ModuleRecord[] }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const handleSelect = (name: string) => { onChange(name); setOpen(false); };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm hover:border-primary/50 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || "Selecione um módulo..."}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 top-10 left-0 right-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-1 space-y-0.5 max-h-48 overflow-y-auto">
            {modules.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-primary/10 hover:text-primary transition-colors ${value === m.name ? "bg-primary/10 text-primary font-medium" : ""}`}
              >
                {m.name}
                {m.description && <span className="text-xs text-muted-foreground ml-2">— {m.description.slice(0, 40)}...</span>}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-border/50">
            <div className="flex gap-1.5">
              <Input
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="Outro módulo..."
                className="h-7 text-xs"
                onKeyDown={e => { if (e.key === "Enter" && custom.trim()) { handleSelect(custom.trim()); setCustom(""); } }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 flex-shrink-0"
                onClick={() => { if (custom.trim()) { handleSelect(custom.trim()); setCustom(""); } }}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Inner component
// ──────────────────────────────────────────────
function MindmapInner() {
  const { data: fieldsList, isLoading } = useListFields();
  const { data: modulesList = [] } = useModules();
  const createFieldMutation = useCreateField();
  const deleteFieldMutation = useDeleteField();
  const createModuleMutation = useCreateModule();
  const deleteModuleMutation = useDeleteModule();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModule, setFilterModule] = useState("Todos");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [newField, setNewField] = useState({ fieldName: "", tableName: "", sectionName: "", module: "", description: "", fieldType: "" });
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");


  const registeredModuleNames = useMemo(() => modulesList.map(m => m.name), [modulesList]);

  const allModules = useMemo(() => {
    const fromFields = new Set((fieldsList ?? []).map(f => f.module));
    const fromRegistered = new Set(registeredModuleNames);
    return ["Todos", ...Array.from(new Set([...fromRegistered, ...fromFields])).sort()];
  }, [fieldsList, registeredModuleNames]);

  const filteredFields = useMemo(() => {
    return (fieldsList ?? []).filter(f => {
      const matchesSearch =
        f.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.sectionName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.module.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMod = filterModule === "Todos" || f.module === filterModule;
      return matchesSearch && matchesMod;
    });
  }, [fieldsList, searchTerm, filterModule]);

  const toggleAll = useCallback(() => {
    const allVisible = filteredFields.map(f => f.id);
    const allSelected = allVisible.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); allVisible.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); allVisible.forEach(id => n.add(id)); return n; });
    }
  }, [filteredFields, selectedIds]);

  const toggleField = useCallback((id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  // Compute graph nodes/edges reactively — no setState needed
  const { nodes, edges } = useMemo(() => {
    const selected = (fieldsList ?? []).filter(f => selectedIds.has(f.id));
    return buildTreeLayout(selected, registeredModuleNames);
  }, [selectedIds, fieldsList, registeredModuleNames]);

  const handleAddField = async () => {
    if (!newField.fieldName || !newField.tableName || !newField.module) {
      toast({ title: "Campos obrigatórios", description: "Preencha Nome, Aba e Módulo.", variant: "destructive" });
      return;
    }
    try {
      const payload = { ...newField, sectionName: newField.sectionName || undefined };
      const created = await createFieldMutation.mutateAsync({ data: payload });
      toast({ title: "Campo adicionado", description: `${newField.fieldName} salvo com sucesso.` });
      setIsAddOpen(false);
      setNewField({ fieldName: "", tableName: "", sectionName: "", module: "", description: "", fieldType: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/fields"] });
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

  const handleAddModule = async () => {
    if (!newModuleName.trim()) return;
    try {
      await createModuleMutation.mutateAsync({ name: newModuleName.trim(), description: newModuleDesc.trim() || undefined });
      toast({ title: "Módulo adicionado", description: `${newModuleName} cadastrado.` });
      setNewModuleName("");
      setNewModuleDesc("");
    } catch {
      toast({ title: "Erro", description: "Falha ao criar módulo.", variant: "destructive" });
    }
  };

  const allVisibleSelected = filteredFields.length > 0 && filteredFields.every(f => selectedIds.has(f.id));

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* ── React Flow Canvas ── */}
      <div className="flex-1 relative border-r border-border/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
              n.type === "tab" ? "#10b981" :
              n.type === "section" ? "#f59e0b" : "hsl(var(--card))"
            }
            className="bg-card/80 border border-border rounded-xl overflow-hidden"
          />
        </ReactFlow>

        {/* Legend + Export */}
        <div className="absolute bottom-4 left-4 flex gap-2 z-10 flex-wrap items-center">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
            <span className="w-3 h-3 rounded-sm bg-primary/60 border border-primary inline-block" /> Módulo
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/60 inline-block" /> Aba
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
            <span className="w-3 h-3 rounded-sm bg-amber-400/20 border border-amber-400/50 inline-block" /> Seção
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50">
            <span className="w-3 h-3 rounded-sm bg-card border border-border inline-block" /> Campo
          </span>
          <ExportPngButton />
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
            <div className="flex gap-1.5">
              {/* Manage modules */}
              <Dialog open={isModulesOpen} onOpenChange={setIsModulesOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs">
                    Módulos
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[440px] rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Módulos cadastrados</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-1">
                    {/* Add new module */}
                    <div className="flex gap-2">
                      <Input value={newModuleName} onChange={e => setNewModuleName(e.target.value)} placeholder="Nome do módulo..." className="h-8 text-xs" />
                      <Button size="sm" className="h-8 px-3 text-xs flex-shrink-0" onClick={handleAddModule} disabled={!newModuleName.trim() || createModuleMutation.isPending}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <Input value={newModuleDesc} onChange={e => setNewModuleDesc(e.target.value)} placeholder="Descrição (opcional)..." className="h-8 text-xs" />
                    {/* Modules list */}
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {modulesList.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background/50">
                          <div>
                            <div className="text-sm font-semibold text-primary">{m.name}</div>
                            {m.description && <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>}
                          </div>
                          <button
                            onClick={() => deleteModuleMutation.mutate(m.id)}
                            className="p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Add field */}
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 rounded-lg gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Campo
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
                      <Label className="text-xs">Módulo *</Label>
                      <ModuleSelect value={newField.module} onChange={v => setNewField({ ...newField, module: v })} modules={modulesList} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Aba * <span className="text-muted-foreground font-normal">(tela/seção principal)</span></Label>
                      <Input value={newField.tableName} onChange={e => setNewField({ ...newField, tableName: e.target.value })} placeholder="ex: Recebimentos" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Seção <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input value={newField.sectionName} onChange={e => setNewField({ ...newField, sectionName: e.target.value })} placeholder="ex: Dados Bancários" />
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
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar campos, abas ou seções..."
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

        {/* Registered modules quick view */}
        {filteredFields.length === 0 && !searchTerm && (
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <p className="text-[11px] text-muted-foreground/60 mb-2 uppercase tracking-wider font-medium">Módulos cadastrados</p>
            <div className="space-y-1.5">
              {modulesList.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5">
                  <span className="w-2 h-2 rounded-full bg-primary/40 flex-shrink-0" />
                  <span className="text-xs font-semibold text-primary">{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fields list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-xs">Carregando...</div>
          ) : filteredFields.length === 0 && searchTerm ? (
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
                    <div className="mt-0.5 flex-shrink-0">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary">
                          {field.module}
                        </Badge>
                        <span className="text-[10px] text-emerald-400 font-medium">{field.tableName}</span>
                        {field.sectionName && (
                          <span className="text-[10px] text-amber-400/80 font-medium">› {field.sectionName}</span>
                        )}
                      </div>
                      <div className="font-mono text-xs font-semibold truncate">{field.fieldName}</div>
                      {field.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{field.description}</p>
                      )}
                    </div>
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

        <div className="px-4 py-3 border-t border-border/30 text-[11px] text-muted-foreground/50 text-center flex-shrink-0">
          Mapa compartilhado — alimentado por todos os usuários
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Exported page
// ──────────────────────────────────────────────
export default function MindmapPage() {
  return (
    <ReactFlowProvider>
      <MindmapInner />
    </ReactFlowProvider>
  );
}
