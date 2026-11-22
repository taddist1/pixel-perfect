import ReactMarkdown from "react-markdown";
import { articleUrlTransform } from "@/lib/article-markdown";

export function ArticleContent({ content }: { content: string }) {
  return (
    <div className="space-y-6 break-words">
      <ReactMarkdown
        skipHtml
        urlTransform={articleUrlTransform}
        components={{
          h1: ({ children }) => <h2 className="text-2xl font-black text-primary">{children}</h2>,
          h2: ({ children }) => <h2 className="text-xl font-black text-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold text-primary">{children}</h3>,
          p: ({ children }) => <p className="whitespace-pre-wrap leading-8">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-2 pr-6 leading-8">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-2 pr-6 leading-8">{children}</ol>,
          a: ({ href, children }) => <a href={href} className="text-primary underline" rel="noopener noreferrer">{children}</a>,
          img: ({ src, alt }) => <img src={src} alt={alt ?? ""} loading="lazy" className="mx-auto my-4 block h-auto max-w-full rounded-lg border border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}