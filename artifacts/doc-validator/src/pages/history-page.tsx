import { useHistory } from "@/hooks/use-history";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, CheckCircle2, Sparkles, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HistoryPage() {
  const { history, clearHistory } = useHistory();

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            Histórico Recente
          </h1>
          <p className="text-muted-foreground mt-1">Registros de validações e gerações locais.</p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" onClick={clearHistory} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
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
          <p className="text-muted-foreground">Suas atividades recentes aparecerão aqui.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <Card key={entry.id} className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center hover:border-primary/30 transition-colors">
              <div className={`p-3 rounded-xl shrink-0 ${
                entry.type === 'validation' ? 'bg-blue-500/10 text-blue-500' : 'bg-accent/10 text-accent'
              }`}>
                {entry.type === 'validation' ? <CheckCircle2 className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Badge variant="outline" className="font-semibold bg-background">
                    {entry.type === 'validation' ? 'Validação' : 'Geração'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.date), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                <p className="text-sm font-medium mb-1 truncate">
                  Módulo: <span className="text-primary">{entry.module}</span>
                </p>
                <p className="text-sm text-muted-foreground truncate opacity-80">
                  "{entry.preview}"
                </p>
              </div>

              <div className="flex items-center gap-6 shrink-0 mt-4 sm:mt-0 bg-muted/30 p-3 rounded-xl border border-border/50">
                {entry.score !== undefined && (
                  <div className="text-center">
                    <span className="block text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Score</span>
                    <span className={`font-bold text-lg leading-none ${entry.score >= 80 ? 'text-emerald-500' : entry.score >= 50 ? 'text-yellow-500' : 'text-destructive'}`}>
                      {entry.score}
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <span className="block text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Campos</span>
                  <span className="font-bold text-lg leading-none text-foreground">{entry.extractedFieldsCount}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
