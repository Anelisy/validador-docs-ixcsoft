import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none 
      prose-headings:font-display prose-headings:tracking-tight
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-muted/50 prose-code:text-accent-foreground
      prose-pre:bg-muted/30 prose-pre:border prose-pre:border-border
      prose-blockquote:border-l-primary prose-blockquote:bg-muted/20 prose-blockquote:py-1
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || "*Nenhum conteúdo para exibir*"}
      </ReactMarkdown>
    </div>
  );
}
