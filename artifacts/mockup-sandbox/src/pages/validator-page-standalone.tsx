import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownPreview } from "@/components/markdown-preview";
import { mockValidateDoc, mockGenerateDoc } from "@/lib/mock-validation";

export default function ValidatorPageStandalone() {
  const [activeTab, setActiveTab] = useState<"validate" | "generate">("validate");
  const [moduleInput, setModuleInput] = useState("");

  // Validation State
  const [docInput, setDocInput] = useState("");
  const [valResult, setValResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Generation State
  const [cardInput, setCardInput] = useState("");
  const [genResult, setGenResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { toast } = useToast();

  const handleValidate = async () => {
    if (!docInput.trim()) {
      toast({
        title: "Aviso",
        description: "Insira a documentação para validar",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      const result = mockValidateDoc(docInput, moduleInput || undefined);
      setValResult(result);
      toast({
        title: `Validação concluída · Score ${result.score}/100`,
        description: `${result.extractedFields.length} campo${
          result.extractedFields.length > 1 ? "s" : ""
        } identificado${result.extractedFields.length > 1 ? "s" : ""}.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao validar documentação",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerate = async () => {
    if (!cardInput.trim()) {
      toast({
        title: "Aviso",
        description: "Insira o conteúdo para gerar documentação",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = mockGenerateDoc(cardInput, moduleInput || undefined);
      setGenResult(result);
      toast({
        title: "Documentação gerada com sucesso",
        description: `${result.extractedFields.length} campo${
          result.extractedFields.length > 1 ? "s" : ""
        } extraído${result.extractedFields.length > 1 ? "s" : ""}.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao gerar documentação",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Texto copiado para a área de transferência.",
    });
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Validador de Documentação
          </h1>
          <p className="text-muted-foreground">
            Valide e gere documentação de forma offline
          </p>
        </div>

        <Tabs
          defaultValue="validate"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "validate" | "generate")}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="validate">Validar</TabsTrigger>
            <TabsTrigger value="generate">Gerar</TabsTrigger>
          </TabsList>

          {/* Validation Tab */}
          <TabsContent value="validate" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="module">Módulo (opcional)</Label>
                  <Input
                    id="module"
                    placeholder="Ex: usuarios, vendas, produtos"
                    value={moduleInput}
                    onChange={(e) => setModuleInput(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="validation-doc">Documentação</Label>
                  <Textarea
                    id="validation-doc"
                    placeholder="Cole a documentação aqui para validar..."
                    value={docInput}
                    onChange={(e) => setDocInput(e.target.value)}
                    className="mt-2 h-96 resize-none"
                  />
                </div>

                <Button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="w-full"
                  size="lg"
                >
                  {isValidating ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Validar Documentação
                    </>
                  )}
                </Button>
              </div>

              {/* Results Section */}
              <div className="space-y-4">
                {valResult && (
                  <>
                    <Card className="p-4 bg-card/50">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Score de Qualidade</h3>
                          <Badge
                            variant="secondary"
                            className="text-lg px-3 py-1"
                          >
                            {valResult.score}/100
                          </Badge>
                        </div>

                        {/* Extracted Fields */}
                        {valResult.extractedFields.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Campos Extraídos ({valResult.extractedFields.length})
                            </h4>
                            <div className="space-y-2">
                              {valResult.extractedFields.map(
                                (field: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-sm bg-background p-2 rounded"
                                  >
                                    <p className="font-medium">{field.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {field.type} - {field.description}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Issues */}
                        {valResult.issues?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Observações
                            </h4>
                            <div className="space-y-2">
                              {valResult.issues.map((issue: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="text-sm p-2 bg-background rounded flex gap-2"
                                >
                                  {issue.severity === "warning" && (
                                    <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                  )}
                                  {issue.severity === "info" && (
                                    <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                  )}
                                  <span>{issue.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Formatted Doc */}
                        {valResult.formattedDoc && (
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium">
                                Documentação Formatada
                              </h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  copyToClipboard(valResult.formattedDoc)
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="bg-background p-3 rounded text-xs max-h-48 overflow-y-auto">
                              <MarkdownPreview
                                markdown={valResult.formattedDoc}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </>
                )}

                {!valResult && (
                  <Card className="p-8 bg-card/30 flex items-center justify-center min-h-96">
                    <div className="text-center">
                      <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">
                        Os resultados aparecerão aqui
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Generation Tab */}
          <TabsContent value="generate" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="module-gen">Módulo (opcional)</Label>
                  <Input
                    id="module-gen"
                    placeholder="Ex: usuarios, vendas, produtos"
                    value={moduleInput}
                    onChange={(e) => setModuleInput(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="generation-card">Conteúdo do Card/Issue</Label>
                  <Textarea
                    id="generation-card"
                    placeholder="Cole o conteúdo do card, issue ou descrição aqui..."
                    value={cardInput}
                    onChange={(e) => setCardInput(e.target.value)}
                    className="mt-2 h-96 resize-none"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar Documentação
                    </>
                  )}
                </Button>
              </div>

              {/* Results Section */}
              <div className="space-y-4">
                {genResult && (
                  <>
                    <Card className="p-4 bg-card/50">
                      <div className="space-y-4">
                        {/* Inferred Module */}
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Módulo Inferido</h3>
                          <Badge variant="secondary">
                            {genResult.inferredModule}
                          </Badge>
                        </div>

                        {/* Extracted Fields */}
                        {genResult.extractedFields?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Campos Identificados (
                              {genResult.extractedFields.length})
                            </h4>
                            <div className="space-y-2">
                              {genResult.extractedFields.map(
                                (field: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-sm bg-background p-2 rounded"
                                  >
                                    <p className="font-medium">{field.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {field.type} - {field.description}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Generated Doc */}
                        {genResult.documentation && (
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium">
                                Documentação Gerada
                              </h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  copyToClipboard(genResult.documentation)
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="bg-background p-3 rounded text-xs max-h-48 overflow-y-auto">
                              <MarkdownPreview
                                markdown={genResult.documentation}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </>
                )}

                {!genResult && (
                  <Card className="p-8 bg-card/30 flex items-center justify-center min-h-96">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">
                        A documentação gerada aparecerá aqui
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
