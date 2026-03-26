import { useState, useMemo } from "react";
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGetMindmap, useListFields, useCreateField, useDeleteField } from "@workspace/api-client-react";
import { Network, Plus, Trash2, Database, Search, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Custom Node Component for a polished look
const CustomNode = ({ data, type }: any) => {
  const isModule = type === 'module';
  const isTable = type === 'table';
  
  const bg = isModule ? 'bg-primary border-primary/50' : 
             isTable ? 'bg-emerald-500/20 border-emerald-500/50' : 
             'bg-card border-border';
             
  const text = isModule ? 'text-primary-foreground' : 
               isTable ? 'text-emerald-500 dark:text-emerald-400' : 
               'text-foreground';

  return (
    <div className={`px-4 py-2 shadow-lg rounded-xl border-2 backdrop-blur-md min-w-[120px] text-center ${bg} ${text}`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 opacity-0" />
      <div className="font-semibold text-sm">{data.label}</div>
      {data.description && <div className="text-xs opacity-70 mt-1 max-w-[150px] truncate">{data.description}</div>}
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 opacity-0" />
    </div>
  );
};

const nodeTypes = {
  module: CustomNode,
  table: CustomNode,
  field: CustomNode,
};

export default function MindmapPage() {
  const { data: mindmapData, isLoading: isLoadingMap } = useGetMindmap();
  const { data: fieldsList } = useListFields();
  const createFieldMutation = useCreateField();
  const deleteFieldMutation = useDeleteField();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newField, setNewField] = useState({ fieldName: '', tableName: '', module: '', description: '', fieldType: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Process data for React Flow
  const initialNodes = useMemo(() => {
    if (!mindmapData) return [];
    
    // Auto-layout logic (very basic grid layout for demo purposes since we don't have dagre)
    const modules = mindmapData.nodes.filter(n => n.type === 'module');
    const tables = mindmapData.nodes.filter(n => n.type === 'table');
    const fields = mindmapData.nodes.filter(n => n.type === 'field');

    return mindmapData.nodes.map((node) => {
      let x = 0;
      let y = 0;

      if (node.type === 'module') {
        const idx = modules.findIndex(m => m.id === node.id);
        x = idx * 300;
        y = 50;
      } else if (node.type === 'table') {
        const idx = tables.findIndex(m => m.id === node.id);
        x = (idx * 200) - 100;
        y = 200;
      } else {
        const idx = fields.findIndex(m => m.id === node.id);
        x = (idx * 150) - 200;
        y = 350;
      }

      return {
        id: node.id,
        type: node.type,
        position: { x, y },
        data: { label: node.label, description: node.data?.description },
      };
    });
  }, [mindmapData]);

  const initialEdges = useMemo(() => {
    if (!mindmapData) return [];
    return mindmapData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, opacity: 0.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
    }));
  }, [mindmapData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when data loads
  useMemo(() => {
    if (initialNodes.length > 0) setNodes(initialNodes);
    if (initialEdges.length > 0) setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const handleAddField = async () => {
    if (!newField.fieldName || !newField.tableName || !newField.module) {
      toast({ title: "Aviso", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    try {
      await createFieldMutation.mutateAsync({ data: newField });
      toast({ title: "Sucesso", description: "Campo adicionado ao mapa." });
      setIsAddOpen(false);
      setNewField({ fieldName: '', tableName: '', module: '', description: '', fieldType: '' });
      queryClient.invalidateQueries({ queryKey: ["/api/fields/mindmap"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fields"] });
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao criar campo.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteFieldMutation.mutateAsync({ id });
      toast({ title: "Removido", description: "Campo excluído com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["/api/fields/mindmap"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fields"] });
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    }
  };

  const filteredFields = fieldsList?.filter(f => 
    f.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.module.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none mix-blend-screen">
        <img src={`${import.meta.env.BASE_URL}images/hero-bg.png`} alt="Abstract bg" className="w-full h-full object-cover" />
      </div>

      {/* Main React Flow Area */}
      <div className="flex-1 relative z-10 border-r border-border/50">
        {isLoadingMap ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Network className="w-8 h-8 animate-pulse" />
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            className="bg-transparent"
            colorMode="dark"
          >
            <Background color="hsl(var(--muted-foreground))" gap={20} size={1} opacity={0.2} />
            <Controls className="bg-card border-border fill-foreground" />
          </ReactFlow>
        )}
      </div>

      {/* Right Sidebar - Fields List */}
      <div className="w-96 bg-card/50 backdrop-blur-xl z-20 flex flex-col h-full shadow-2xl">
        <div className="p-6 border-b border-border/50 flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Dicionário
            </h2>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="icon" className="w-8 h-8 rounded-full shadow-md">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Adicionar Novo Campo</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome do Campo *</Label>
                    <Input className="rounded-xl" value={newField.fieldName} onChange={e => setNewField({...newField, fieldName: e.target.value})} placeholder="ex: status_cliente" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tabela *</Label>
                    <Input className="rounded-xl" value={newField.tableName} onChange={e => setNewField({...newField, tableName: e.target.value})} placeholder="ex: clientes" />
                  </div>
                  <div className="space-y-2">
                    <Label>Módulo *</Label>
                    <Input className="rounded-xl" value={newField.module} onChange={e => setNewField({...newField, module: e.target.value})} placeholder="ex: Cadastros" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input className="rounded-xl" value={newField.description} onChange={e => setNewField({...newField, description: e.target.value})} placeholder="Para que serve?" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo (opcional)</Label>
                    <Input className="rounded-xl" value={newField.fieldType} onChange={e => setNewField({...newField, fieldType: e.target.value})} placeholder="ex: VARCHAR(50)" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddField} disabled={createFieldMutation.isPending} className="rounded-xl w-full">
                    Salvar no Mapa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar campos, tabelas..." 
              className="pl-9 rounded-xl bg-background/50 border-border"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredFields.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              <LayoutGrid className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhum campo encontrado.</p>
            </div>
          ) : (
            filteredFields.map(field => (
              <div key={field.id} className="group p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-card hover:border-primary/30 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary">
                    {field.module}
                  </span>
                  <button 
                    onClick={() => handleDelete(field.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="font-mono text-sm font-semibold mb-1 truncate">
                  <span className="text-emerald-500">{field.tableName}</span>
                  <span className="text-muted-foreground">.</span>
                  <span>{field.fieldName}</span>
                </div>
                {field.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{field.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
