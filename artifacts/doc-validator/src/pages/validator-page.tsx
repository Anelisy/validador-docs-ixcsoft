import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  Info, 
  XCircle, 
  Copy, 
  Search, 
  Database,
  Network,
  Link,
  Loader2,
  X,
} from "lucide-react";
import { useValidateDoc, useGenerateDoc } from "@workspace/api-client-react";
import type { ValidationResult, GeneratedDoc } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useHistory } from "@/hooks/use-history";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownPreview } from "@/components/markdown-preview";

export default function ValidatorPage() {
  const [activeTab, setActiveTab] = useState<"validate" | "generate">("validate");
  const [moduleInput, setModuleInput] = useState("");
  
  // Validation State
  const [docInput, setDocInput] = useState("");
  const [valResult, setValResult] = useState<ValidationResult | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  
  // Generation State
  const [cardInput, setCardInput] = useState("");
  const [genResult, setGenResult] = useState<GeneratedDoc | null>(null);

  const { toast } = useToast();
  const { addEntry } = useHistory();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const validateMutation = useValidateDoc();
  const generateMutation = useGenerateDoc();

  const invalidateFields = () => queryClient.invalidateQueries({ queryKey: ["/api/fields"] });

  const handleValidate = async () => {
    if (!docInput.trim()) {
      toast({ title: "Aviso", description: "Insira a documentação para validar", variant: "destructive" });
      return;
    }

    try {
      const result = await validateMutation.mutateAsync({
        data: { documentation: docInput, module: moduleInput || undefined }
      });
      setValResult(result);
      invalidateFields();
      
      addEntry({
        type: "validation",
        module: moduleInput || "Desconhecido",
        score: result.score,
        preview: docInput.substring(0, 100) + "...",
        extractedFieldsCount: result.extractedFields.length,
        fullContent: result.formattedDoc ?? undefined,
      });

      const saved = (result as any).savedFieldsCount ?? 0;
      toast({
        title: `Validação concluída · Score ${result.score}/100`,
        description: saved > 0
          ? `${saved} campo${saved > 1 ? "s" : ""} adicionado${saved > 1 ? "s" : ""} automaticamente ao Mapa de Campos.`
          : "Nenhum campo novo identificado.",
      });
    } catch {
      toast({ title: "Erro", description: "Falha ao validar documentação", variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!cardInput.trim()) {
      toast({ title: "Aviso", description: "Insira o conteúdo do card do Jira", variant: "destructive" });
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        data: { cardContent: cardInput, module: moduleInput || undefined }
      });
      setGenResult(result);
      invalidateFields();
      
      addEntry({
        type: "generation",
        module: result.inferredModule || moduleInput || "Desconhecido",
        preview: cardInput.substring(0, 100) + "...",
        extractedFieldsCount: result.extractedFields.length,
        fullContent: result.documentation,
      });

      const saved = (result as any).savedFieldsCount ?? 0;
      toast({
        title: "Documentação gerada com sucesso",
        description: saved > 0
          ? `${saved} campo${saved > 1 ? "s" : ""} adicionado${saved > 1 ? "s" : ""} automaticamente ao Mapa de Campos.`
          : "Documentação pronta para revisão.",
      });
    } catch {
      toast({ title: "Erro", description: "Falha ao gerar documentação", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Texto copiado para a área de transferência." });
  };

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast({ title: "URL inválida", description: "A URL deve começar com http:// ou https://", variant: "destructive" });
      return;
    }
    setIsFetchingUrl(true);
    setFetchedTitle(null);
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const res = await fetch(`${BASE}/api/validator/fetch-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao buscar URL");
      setDocInput(data.text);
      setFetchedTitle(data.title);
      toast({ title: "Página carregada", description: `${data.charCount.toLocaleString()} caracteres extraídos.` });
    } catch (err: any) {
      toast({ title: "Erro ao buscar URL", description: err.message, variant: "destructive" });
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Analisador de Conteúdo
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Valide documentações existentes ou gere novas a partir de cards do Jira com IA.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/50">
            <TabsTrigger value="validate" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Validar Existente
            </TabsTrigger>
            <TabsTrigger value="generate" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar com IA
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 max-w-xs relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Módulo do sistema (opcional)" 
              className="pl-9 bg-card/50 border-border/50 rounded-xl focus-visible:ring-primary/20 h-11"
              value={moduleInput}
              onChange={(e) => setModuleInput(e.target.value)}
            />
          </div>
        </div>

        {/* VALIDATE TAB */}
        <TabsContent value="validate" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Documentação Atual</Label>

              {/* URL Fetch Bar */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cole um link da Wiki para buscar o conteúdo..."
                    className="pl-9 h-10 rounded-xl bg-card/30 border-border/50 text-sm focus-visible:ring-primary/20"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
                  />
                  {urlInput && (
                    <button
                      onClick={() => { setUrlInput(""); setFetchedTitle(null); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleFetchUrl}
                  disabled={isFetchingUrl || !urlInput.trim()}
                  size="sm"
                  variant="outline"
                  className="h-10 px-4 rounded-xl shrink-0"
                >
                  {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>

              {/* Fetched page indicator */}
              {fetchedTitle && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Conteúdo carregado: <strong>{fetchedTitle}</strong></span>
                </div>
              )}

              <Textarea 
                placeholder="Cole aqui a documentação redigida... ou busque via link acima."
                className="min-h-[340px] resize-y rounded-2xl bg-card/30 border-border/50 p-6 text-base leading-relaxed focus-visible:ring-primary/20"
                value={docInput}
                onChange={(e) => setDocInput(e.target.value)}
              />
              <Button 
                onClick={handleValidate} 
                disabled={validateMutation.isPending}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-semibold text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {validateMutation.isPending ? "Analisando com IA..." : "Validar Conteúdo"}
              </Button>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Resultado da Análise</Label>
              <Card className="min-h-[400px] rounded-2xl border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col">
                {!valResult && !validateMutation.isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 opacity-50" />
                    </div>
                    <p>O resultado da validação aparecerá aqui.</p>
                  </div>
                )}
                
                {validateMutation.isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-primary p-8 text-center animate-pulse">
                    <Sparkles className="w-12 h-12 mb-4 animate-spin" />
                    <p className="font-medium">Lendo e validando documentação...</p>
                  </div>
                )}

                {valResult && (
                  <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                      {/* Score Section */}
                      <div className="flex items-center gap-6 p-5 rounded-2xl bg-card border border-border shadow-sm">
                        <div className="relative flex items-center justify-center w-20 h-20">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/50" />
                            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent"
                              strokeDasharray={`${2 * Math.PI * 36}`}
                              strokeDashoffset={`${2 * Math.PI * 36 * (1 - valResult.score / 100)}`}
                              className={valResult.score >= 80 ? "text-emerald-500" : valResult.score >= 50 ? "text-yellow-500" : "text-destructive"}
                            />
                          </svg>
                          <span className="absolute text-xl font-bold">{valResult.score}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold">
                            {valResult.score >= 80 ? "Excelente" : valResult.score >= 50 ? "Precisa de Ajustes" : "Crítico"}
                          </h3>
                          <p className="text-muted-foreground mt-1">
                            {valResult.isValid ? "A documentação atende aos padrões mínimos." : "Há problemas estruturais que precisam ser corrigidos."}
                          </p>
                        </div>
                      </div>

                      {/* Suggestions */}
                      {valResult.suggestions.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Sugestões de Melhoria</h4>
                          {valResult.suggestions.map((s, i) => (
                            <div key={i} className={`p-4 rounded-xl border flex gap-4 items-start
                              ${s.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 
                                s.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 
                                'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'}
                            `}>
                              {s.type === 'error' ? <XCircle className="w-5 h-5 shrink-0 mt-0.5" /> :
                               s.type === 'warning' ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> :
                               <Info className="w-5 h-5 shrink-0 mt-0.5" />}
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">{s.message}</p>
                                {s.suggestion && <p className="text-sm opacity-90">{s.suggestion}</p>}
                                <Badge variant="outline" className="mt-2 bg-background/50">{s.section}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Extracted Fields */}
                      {valResult.extractedFields.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Campos Identificados</h4>
                            <Button size="sm" variant="ghost" className="gap-1.5 text-primary" onClick={() => navigate("/mindmap")}>
                              <Network className="w-3.5 h-3.5" /> Ver no Mapa
                            </Button>
                          </div>
                          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2 text-xs text-emerald-400 mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Campos salvos automaticamente no Mapa de Campos
                          </div>
                          <div className="grid gap-2">
                            {valResult.extractedFields.map((f, i) => (
                              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                                <div className="flex items-center gap-3">
                                  <Database className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-mono text-sm">{f.tableName}.<strong>{f.fieldName}</strong></span>
                                </div>
                                <Badge variant="secondary">{f.module}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formatted Doc */}
                      {valResult.formattedDoc && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Documentação Formatada</h4>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(valResult.formattedDoc!)}>
                              <Copy className="w-3 h-3 mr-2" /> Copiar
                            </Button>
                          </div>
                          <div className="p-5 rounded-2xl bg-card border border-border">
                            <MarkdownPreview content={valResult.formattedDoc} />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>


        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-5 space-y-4">
              <Label className="text-base font-semibold">Resolução do Dev (Card Jira)</Label>
              <Textarea 
                placeholder="Cole aqui o que o desenvolvedor relatou no card. Ex: Corrigido bug na tela de cadastro, adicionado campo 'status_cliente' na tabela 'clientes'..."
                className="min-h-[500px] resize-y rounded-2xl bg-card/30 border-border/50 p-6 text-base leading-relaxed focus-visible:ring-primary/20"
                value={cardInput}
                onChange={(e) => setCardInput(e.target.value)}
              />
              <Button 
                onClick={handleGenerate} 
                disabled={generateMutation.isPending}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white font-semibold text-base shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {generateMutation.isPending ? "Gerando com IA..." : "Gerar Documentação"}
              </Button>
            </div>

            <div className="xl:col-span-7 space-y-4">
              <Label className="text-base font-semibold">Documentação Gerada (Formato Outline)</Label>
              <Card className="min-h-[500px] rounded-2xl border-border/50 bg-card/30 backdrop-blur-sm flex flex-col overflow-hidden">
                {!genResult && !generateMutation.isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 opacity-50" />
                    </div>
                    <p>A documentação formatada aparecerá aqui.</p>
                  </div>
                )}
                
                {generateMutation.isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-accent p-8 text-center animate-pulse">
                    <Sparkles className="w-12 h-12 mb-4 animate-spin" />
                    <p className="font-medium">Estruturando informações e gerando textos...</p>
                  </div>
                )}

                {genResult && (
                  <>
                    <div className="border-b border-border p-4 bg-card flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                          Módulo: {genResult.inferredModule || moduleInput || 'N/A'}
                        </Badge>
                        {genResult.extractedFields.length > 0 && (
                          <Badge variant="outline">{genResult.extractedFields.length} campos detectados</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {genResult.extractedFields.length > 0 && (
                          <Button size="sm" variant="ghost" className="gap-1.5 text-primary rounded-lg" onClick={() => navigate("/mindmap")}>
                            <Network className="w-3.5 h-3.5" /> Ver no Mapa
                          </Button>
                        )}
                        <Button size="sm" onClick={() => copyToClipboard(genResult.documentation)} className="rounded-lg">
                          <Copy className="w-4 h-4 mr-2" /> Copiar Tudo
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-8">
                        <MarkdownPreview content={genResult.documentation} />
                      </div>
                    </ScrollArea>
                  </>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
