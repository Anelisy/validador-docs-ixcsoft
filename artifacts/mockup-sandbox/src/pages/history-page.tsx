import { useState } from "react";
import { useHistory } from "@/hooks/use-history";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  History,
  CheckCircle2,
  Sparkles,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownPreview } from "@/components/markdown-preview";
import { useToast } from "@/hooks/use-toast";

export default function HistoryPage() {
  const { history, clearHistory } = useHistory();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast({ title: "Copiado!", description: "Documentação copiada para a área de transferência." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            Histórico Recente
          </h1>
          <p className="text-muted-foreground mt-1">Registros de validações e gerações desta sessão.</p>
        </div>
        {history.length > 0 && (
          <Button
            variant="outline"
            onClick={clearHistory}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Histórico
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-transparent shadow-none">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <History className="w-8 h-8 opacity-20" />
          </div>
          <h3 className="text-lg font-semibold">Nenhum registro encontrado</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Suas validações e gerações recentes aparecerão aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const hasContent = !!entry.fullContent;

            return (
              <Card
                key={entry.id}
                className={`overflow-hidden transition-all border ${
                  isExpanded ? "border-primary/30 shadow-md shadow-primary/5" : "hover:border-border"
                }`}
              >
                {/* Header row */}
                <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Icon */}
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      entry.type === "validation"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {entry.type === "validation" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold bg-background"
                      >
                        {entry.type === "validation" ? "Validação" : "Geração"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.date), "dd 'de' MMM, yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                      <span className="text-xs font-medium text-primary">
                        {entry.module}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate opacity-70">
                      "{entry.preview}"
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 shrink-0 bg-muted/30 px-3 py-2 rounded-xl border border-border/50">
                    {entry.score !== undefined && (
                      <div className="text-center">
                        <span className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                          Score
                        </span>
                        <span
                          className={`font-bold text-base leading-none ${
                            entry.score >= 80
                              ? "text-emerald-500"
                              : entry.score >= 50
                              ? "text-yellow-500"
                              : "text-destructive"
                          }`}
                        >
                          {entry.score}
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <span className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                        Campos
                      </span>
                      <span className="font-bold text-base leading-none">
                        {entry.extractedFieldsCount}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasContent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => handleCopy(entry.id, entry.fullContent!)}
                      >
                        {copiedId === entry.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Copiar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={hasContent ? "outline" : "ghost"}
                      className="gap-1.5 text-xs h-8"
                      onClick={() => toggleExpand(entry.id)}
                      disabled={!hasContent}
                    >
                      {!hasContent ? (
                        <>
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Sem conteúdo</span>
                        </>
                      ) : isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Recolher
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Ver resposta
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && entry.fullContent && (
                  <div className="border-t border-border/50">
                    <div className="flex items-center justify-between px-5 py-3 bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Documentação gerada
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => handleCopy(entry.id, entry.fullContent!)}
                      >
                        {copiedId === entry.id ? (
                          <><Check className="w-3 h-3 text-emerald-500" /> Copiado!</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copiar tudo</>
                        )}
                      </Button>
                    </div>
                    <ScrollArea className="max-h-[560px]">
                      <div className="p-6">
                        <MarkdownPreview content={entry.fullContent} />
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
