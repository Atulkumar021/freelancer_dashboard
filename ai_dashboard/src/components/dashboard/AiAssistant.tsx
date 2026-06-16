import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "Why did profit drop?",
  "Show overdue customers.",
  "Show cash forecast.",
  "Explain working capital.",
  "Show business risks.",
];

/* Short, structured, business-focused canned answers (demo). */
const ANSWERS: Record<string, string> = {
  "Why did profit drop?":
    "Profit is actually up 8% MoM. The only drag was marketing spend, which ran ₹1.44 L (12%) over budget. Net margin still improved to 16.3%.",
  "Show overdue customers.":
    "47 invoices (₹24.75 L) are overdue. Top 3: Apex Textiles ₹1.92 L (95 days), Meridian Retail ₹0.92 L (84 days), Galaxy Exports ₹1.45 L (71 days).",
  "Show cash forecast.":
    "Cash on hand covers ~45 days of obligations. If the 3 APAC receivables (₹28 L) clear by 15 May, OD utilisation stays under 80%.",
  "Explain working capital.":
    "Net working capital is ₹6.84 Cr. Cash conversion cycle is 38 days (target <45). The main lever right now is collections — debtor days rose to 62.",
  "Show business risks.":
    "Two priority risks: (1) 90+ day receivables of ₹38.4 L across 12 accounts, (2) GST return due in 4 days. Both are flagged in Today's Priorities.",
};

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! I'm your AI CFO. Ask me about profit, cash, collections, compliance or risks." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function ask(q: string) {
    const question = q.trim();
    if (!question) return;
    const answer = ANSWERS[question] ??
      "I've noted that. In the live version I'll pull this straight from your Tally data and reply with a short, structured answer.";
    setMessages((m) => [...m, { role: "user", text: question }, { role: "ai", text: answer }]);
    setInput("");
  }

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-full
                     bg-accent text-accent-foreground font-semibold text-[12px] shadow-md
                     hover:bg-accent/90 active:scale-[0.98] transition-all"
        >
          <Sparkles className="size-3.5" /> AI CFO Assistant
        </button>
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

        <aside
          className={cn(
            "absolute right-0 top-0 h-full w-full max-w-[400px] bg-card border-l border-border flex flex-col shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 h-14 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <Sparkles className="size-4 text-accent" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">AI CFO Assistant</p>
                <p className="text-[10px] text-muted-foreground">Business insights, instantly</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                  m.role === "user"
                    ? "bg-accent text-accent-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm",
                )}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Suggested questions */}
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Suggested</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)}
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-border
                             text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors">
                  {s} <ArrowRight className="size-3" />
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            className="flex items-center gap-2 p-3 border-t border-border shrink-0"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your AI CFO…"
              className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-sm
                         placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            />
            <button type="submit"
              className="size-10 shrink-0 rounded-lg bg-accent text-accent-foreground flex items-center justify-center hover:bg-accent/90 active:scale-95 transition-all">
              <Send className="size-4" />
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
