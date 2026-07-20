import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/home/Footer";
import { LegalDoc, LegalBlock, TERMS_DOC, PRIVACY_DOC, HOUSERULES_DOC } from "@/content/legal";

/**
 * Renders the official legal documents (/terms, /privacy, /house-rules).
 * Text comes from src/content/legal.ts, generated from the founder's
 * source documents - the docx files remain the source of truth.
 */
const DOCS_BY_PATH: Record<string, LegalDoc> = {
  "/terms": TERMS_DOC,
  "/privacy": PRIVACY_DOC,
  "/house-rules": HOUSERULES_DOC,
};

function renderBlocks(body: LegalBlock[]) {
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key} className="list-disc pl-6 space-y-2 text-sm leading-relaxed text-foreground/80">
        {listBuffer.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  body.forEach((block, i) => {
    if (block.t === "li") {
      listBuffer.push(block.x);
      return;
    }
    flushList(`list-${i}`);
    if (block.t === "h") {
      nodes.push(
        <h2 key={i} className="text-xl font-bold mt-8 mb-3 text-foreground">
          {block.x}
        </h2>,
      );
    } else {
      nodes.push(
        <p key={i} className="text-sm leading-relaxed text-foreground/80 mb-4">
          {block.x}
        </p>,
      );
    }
  });
  flushList("list-end");
  return nodes;
}

export default function Legal() {
  const location = useLocation();
  const doc = DOCS_BY_PATH[location.pathname] || TERMS_DOC;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">
            Dorm Made Inc.
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-2">{doc.title}</h1>
          {doc.updated && <p className="text-sm text-muted-foreground mb-8">{doc.updated}</p>}

          {renderBlocks(doc.body)}
        </div>
      </main>

      <Footer />
    </div>
  );
}
