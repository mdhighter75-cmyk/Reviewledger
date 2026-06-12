import { useState, useRef } from "react";
import Papa from "papaparse";
import { AlertCircle, Upload, FileText, TrendingUp, TrendingDown, Lightbulb, ArrowRight, Loader2 } from "lucide-react";

const ACCENT = "#C45D3E"; // burnt sienna - warm, "shopkeeper's ledger" feel
const INK = "#2B2622";
const PAPER = "#FAF6EF";
const PAPER_DEEP = "#F1EADD";
const LINE = "#E2D8C8";

const FREE_REVIEW_LIMIT = 50;
const PRO_REVIEW_LIMIT = 500;

function checkIsPro() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") === "success") {
    localStorage.setItem("reviewledger_pro", "true");
  }
  return localStorage.getItem("reviewledger_pro") === "true";
}

export default function App() {
  const [stage, setStage] = useState("landing"); // landing | uploaded | loading | report | error
  const [fileName, setFileName] = useState("");
  const [reviews, setReviews] = useState([]);
  const [totalParsed, setTotalParsed] = useState(0);
  const [report, setReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPro] = useState(checkIsPro);
  const fileInputRef = useRef(null);

  const limit = isPro ? PRO_REVIEW_LIMIT : FREE_REVIEW_LIMIT;
  const isUpgradePage = typeof window !== "undefined" && window.location.pathname === "/upgrade";

  async function startCheckout() {
    try {
      const res = await fetch("/api/create-checkout-session", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Checkout isn't set up yet. Add your Stripe keys in Vercel project settings.");
      }
    } catch {
      alert("Checkout isn't set up yet. Add your Stripe keys in Vercel project settings.");
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Try to find a column that looks like review text
        const fields = results.meta.fields || [];
        const textField =
          fields.find((f) => /review|comment|body|text|feedback/i.test(f)) ||
          fields[0];
        const ratingField = fields.find((f) => /rating|star|score/i.test(f));

        const allParsed = results.data
          .map((row) => ({
            text: (row[textField] || "").toString().trim(),
            rating: ratingField ? row[ratingField] : null,
          }))
          .filter((r) => r.text.length > 3);

        const parsed = allParsed.slice(0, limit);

        if (parsed.length === 0) {
          setErrorMsg(
            "Couldn't find any review text in that file. Make sure it has a column with review content."
          );
          setStage("error");
          return;
        }
        setReviews(parsed);
        setTotalParsed(allParsed.length);
        setStage("uploaded");
      },
      error: () => {
        setErrorMsg("Couldn't read that file. Please upload a CSV export of your reviews.");
        setStage("error");
      },
    });
  }

  async function runAnalysis() {
    setStage("loading");
    try {
      const reviewBlock = reviews
        .map((r, i) => `${i + 1}. ${r.rating ? `[${r.rating}★] ` : ""}${r.text}`)
        .join("\n");

      const prompt = `You are analyzing customer reviews for a small e-commerce seller. Below are ${reviews.length} reviews.

Return ONLY valid JSON (no markdown, no preamble) matching this exact shape:
{
  "summary": "2-3 sentence plain-English overview of overall sentiment",
  "totalReviews": ${reviews.length},
  "sentimentScore": <integer 0-100, overall positivity score>,
  "topPraises": [{"theme": "short theme name", "detail": "1 sentence detail", "count": <approx number of reviews mentioning this>}],
  "topComplaints": [{"theme": "short theme name", "detail": "1 sentence detail", "count": <approx number of reviews mentioning this>}],
  "swot": {
    "strengths": ["short bullet", "short bullet"],
    "weaknesses": ["short bullet", "short bullet"],
    "opportunities": ["short bullet", "short bullet"],
    "threats": ["short bullet", "short bullet"]
  },
  "actionItems": ["specific, concrete recommendation", "..."]
}

Provide 3-5 items for topPraises and topComplaints, 2-4 bullets per SWOT category, and 3-5 action items. Be specific and reference actual patterns from the reviews, not generic advice.

REVIEWS:
${reviewBlock}`;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Analysis request failed");
      }

      const data = await response.json();
      const cleaned = data.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setReport(parsed);
      setStage("report");
    } catch (err) {
      setErrorMsg("Something went wrong analyzing your reviews. Please try again.");
      setStage("error");
    }
  }

  function reset() {
    setStage("landing");
    setFileName("");
    setReviews([]);
    setTotalParsed(0);
    setReport(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div
      style={{ background: PAPER, color: INK, fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif" }}
      className="min-h-screen w-full"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Source+Sans+3:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .display-font { font-family: 'Fraunces', serif; }
        .mono-font { font-family: 'JetBrains Mono', monospace; }
        .ledger-line {
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 31px,
            ${LINE} 31px,
            ${LINE} 32px
          );
        }
      `}</style>

      <Header />

      {isUpgradePage && <UpgradePage onCheckout={startCheckout} isPro={isPro} />}

      {!isUpgradePage && stage === "landing" && (
        <Landing onFile={handleFile} fileInputRef={fileInputRef} />
      )}

      {!isUpgradePage && stage === "uploaded" && (
        <UploadedState
          fileName={fileName}
          count={reviews.length}
          totalParsed={totalParsed}
          limit={limit}
          isPro={isPro}
          onAnalyze={runAnalysis}
          onReset={reset}
        />
      )}

      {!isUpgradePage && stage === "loading" && <LoadingState count={reviews.length} />}

      {!isUpgradePage && stage === "error" && <ErrorState message={errorMsg} onReset={reset} />}

      {!isUpgradePage && stage === "report" && report && (
        <ReportView report={report} fileName={fileName} onReset={reset} />
      )}

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b" style={{ borderColor: LINE }}>
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-sm display-font font-semibold text-lg"
            style={{ background: ACCENT, color: PAPER }}
          >
            R
          </div>
          <span className="display-font text-xl font-semibold tracking-tight">
            Reviewledger
          </span>
        </div>
        <span className="mono-font text-xs uppercase tracking-widest" style={{ color: "#9C8F7C" }}>
          Review intelligence for small sellers
        </span>
      </div>
    </header>
  );
}

function Landing({ onFile, fileInputRef }) {
  return (
    <main className="max-w-5xl mx-auto px-6">
      <section className="py-20 md:py-28 grid md:grid-cols-[1.3fr_1fr] gap-12 items-center">
        <div>
          <p className="mono-font text-xs uppercase tracking-widest mb-4" style={{ color: ACCENT }}>
            Upload reviews → Get the verdict
          </p>
          <h1 className="display-font text-4xl md:text-6xl font-semibold leading-[1.05] mb-6">
            Your customers already told you what's wrong.
            <span style={{ color: ACCENT }}> Nobody read it.</span>
          </h1>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "#5C5347", maxWidth: "46ch" }}>
            Drop in a CSV export of your product reviews. Get back a plain-English
            report on what customers love, what's driving complaints, and exactly
            what to fix first — in under a minute.
          </p>
          <UploadButton onFile={onFile} fileInputRef={fileInputRef} />
          <p className="mono-font text-xs mt-4" style={{ color: "#9C8F7C" }}>
            Works with exports from Amazon Seller Central, Shopify, Etsy, or any CSV with a review-text column.
          </p>
        </div>
        <LedgerIllustration />
      </section>

      <section className="py-16 border-t" style={{ borderColor: LINE }}>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<TrendingUp size={20} />}
            title="What's working"
            text="Surface the praises customers repeat most — so you know what to protect and promote."
          />
          <FeatureCard
            icon={<TrendingDown size={20} />}
            title="What's costing you"
            text="Group complaints into themes, ranked by how often they show up — not buried in a pile of one-stars."
          />
          <FeatureCard
            icon={<Lightbulb size={20} />}
            title="What to do next"
            text="Specific, prioritized action items based on the patterns in your own reviews."
          />
        </div>
      </section>
    </main>
  );
}

function UploadButton({ onFile, fileInputRef }) {
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={onFile}
        className="hidden"
        id="review-upload"
      />
      <label
        htmlFor="review-upload"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-sm font-medium cursor-pointer transition-transform hover:-translate-y-0.5"
        style={{ background: INK, color: PAPER }}
      >
        <Upload size={18} />
        Upload review CSV
      </label>
    </div>
  );
}

function LedgerIllustration() {
  return (
    <div
      className="ledger-line rounded-sm border p-6 hidden md:block"
      style={{ borderColor: LINE, background: PAPER_DEEP, minHeight: "280px" }}
    >
      <div className="mono-font text-xs space-y-3" style={{ color: "#8A7E6D" }}>
        <Row label="Shipping was slow" tag="complaint" count="14×" />
        <Row label="Great build quality" tag="praise" count="22×" />
        <Row label="Sizing runs small" tag="complaint" count="9×" />
        <Row label="Fast, friendly support" tag="praise" count="11×" />
        <Row label="Packaging arrived damaged" tag="complaint" count="6×" />
        <Row label="Color matches photos" tag="praise" count="8×" />
      </div>
    </div>
  );
}

function Row({ label, tag, count }) {
  const isComplaint = tag === "complaint";
  return (
    <div className="flex items-center justify-between py-1">
      <span style={{ color: INK }}>{label}</span>
      <div className="flex items-center gap-3">
        <span
          className="px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider"
          style={{
            background: isComplaint ? "#F4DCD3" : "#DCEAE0",
            color: isComplaint ? "#A14A2E" : "#3F7D5C",
          }}
        >
          {tag}
        </span>
        <span>{count}</span>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div>
      <div className="mb-3" style={{ color: ACCENT }}>
        {icon}
      </div>
      <h3 className="display-font text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "#5C5347" }}>
        {text}
      </p>
    </div>
  );
}

function UploadedState({ fileName, count, totalParsed, limit, isPro, onAnalyze, onReset }) {
  const wasCapped = totalParsed > count;

  return (
    <main className="max-w-2xl mx-auto px-6 py-24 text-center">
      <FileText size={32} style={{ color: ACCENT, margin: "0 auto 1.5rem" }} />
      <h2 className="display-font text-3xl font-semibold mb-3">{fileName}</h2>
      <p className="text-base mb-2" style={{ color: "#5C5347" }}>
        Found <strong>{totalParsed}</strong> reviews with usable text.
      </p>
      {wasCapped && (
        <div className="mb-6 p-4 rounded-sm border text-sm" style={{ borderColor: LINE, background: PAPER_DEEP, color: "#5C5347" }}>
          The free plan analyzes up to <strong>{limit} reviews</strong> per report.
          We'll analyze the first {count} of {totalParsed}.{" "}
          <a href="/upgrade" className="underline font-medium" style={{ color: ACCENT }}>
            Upgrade for up to {PRO_REVIEW_LIMIT}
          </a>
          .
        </div>
      )}
      {!wasCapped && <div className="mb-6" />}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onAnalyze}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-sm font-medium transition-transform hover:-translate-y-0.5"
          style={{ background: ACCENT, color: PAPER }}
        >
          Generate report
          <ArrowRight size={18} />
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-sm font-medium border"
          style={{ borderColor: LINE, color: "#5C5347" }}
        >
          Choose different file
        </button>
      </div>
    </main>
  );
}

function LoadingState({ count }) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-32 text-center">
      <Loader2 size={32} className="animate-spin" style={{ color: ACCENT, margin: "0 auto 1.5rem" }} />
      <h2 className="display-font text-2xl font-semibold mb-2">Reading {count} reviews…</h2>
      <p className="text-sm" style={{ color: "#9C8F7C" }}>
        This usually takes 15–30 seconds.
      </p>
    </main>
  );
}

function ErrorState({ message, onReset }) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-24 text-center">
      <AlertCircle size={32} style={{ color: ACCENT, margin: "0 auto 1.5rem" }} />
      <h2 className="display-font text-2xl font-semibold mb-3">That didn't work</h2>
      <p className="text-base mb-8" style={{ color: "#5C5347" }}>{message}</p>
      <button
        onClick={onReset}
        className="px-6 py-3 rounded-sm font-medium"
        style={{ background: INK, color: PAPER }}
      >
        Try again
      </button>
    </main>
  );
}

function ReportView({ report, fileName, onReset }) {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-2">
        <p className="mono-font text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
          Report — {fileName}
        </p>
        <button onClick={onReset} className="mono-font text-xs underline" style={{ color: "#9C8F7C" }}>
          New report
        </button>
      </div>

      <h1 className="display-font text-3xl md:text-4xl font-semibold mb-4 leading-tight">
        Here's what your {report.totalReviews} reviews are telling you
      </h1>

      <div className="flex items-center gap-4 mb-8 p-5 rounded-sm border" style={{ borderColor: LINE, background: PAPER_DEEP }}>
        <div
          className="display-font text-3xl font-semibold w-16 h-16 flex items-center justify-center rounded-full shrink-0"
          style={{ background: scoreColor(report.sentimentScore), color: PAPER }}
        >
          {report.sentimentScore}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#5C5347" }}>{report.summary}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <ThemeList title="Top praises" icon={<TrendingUp size={18} />} items={report.topPraises} positive />
        <ThemeList title="Top complaints" icon={<TrendingDown size={18} />} items={report.topComplaints} />
      </div>

      <div className="mb-10">
        <h2 className="display-font text-xl font-semibold mb-4">SWOT summary</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <SwotBox label="Strengths" items={report.swot.strengths} />
          <SwotBox label="Weaknesses" items={report.swot.weaknesses} />
          <SwotBox label="Opportunities" items={report.swot.opportunities} />
          <SwotBox label="Threats" items={report.swot.threats} />
        </div>
      </div>

      <div>
        <h2 className="display-font text-xl font-semibold mb-4 flex items-center gap-2">
          <Lightbulb size={20} style={{ color: ACCENT }} />
          What to do next
        </h2>
        <ol className="space-y-3">
          {report.actionItems.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed" style={{ color: "#3D362E" }}>
              <span className="mono-font shrink-0" style={{ color: ACCENT }}>{String(i + 1).padStart(2, "0")}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

function ThemeList({ title, icon, items, positive }) {
  return (
    <div>
      <h3 className="display-font text-lg font-semibold mb-3 flex items-center gap-2">
        <span style={{ color: positive ? "#3F7D5C" : ACCENT }}>{icon}</span>
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-sm border" style={{ borderColor: LINE }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{item.theme}</span>
              <span className="mono-font text-xs" style={{ color: "#9C8F7C" }}>~{item.count} mentions</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#5C5347" }}>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SwotBox({ label, items }) {
  return (
    <div className="p-4 rounded-sm border" style={{ borderColor: LINE, background: PAPER_DEEP }}>
      <p className="mono-font text-xs uppercase tracking-widest mb-2" style={{ color: ACCENT }}>{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-snug" style={{ color: "#3D362E" }}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function scoreColor(score) {
  if (score >= 70) return "#3F7D5C";
  if (score >= 40) return "#C49A3E";
  return ACCENT;
}

function UpgradePage({ onCheckout, isPro }) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20">
      <p className="mono-font text-xs uppercase tracking-widest mb-4" style={{ color: ACCENT }}>
        Reviewledger Pro
      </p>
      <h1 className="display-font text-4xl font-semibold mb-6 leading-tight">
        For sellers who get hundreds of reviews a month
      </h1>

      {isPro ? (
        <div className="p-5 rounded-sm border" style={{ borderColor: LINE, background: PAPER_DEEP }}>
          <p className="text-sm" style={{ color: "#3F7D5C" }}>
            You're on the Pro plan. Thanks for supporting Reviewledger — head back to the
            homepage to run a report with up to {PRO_REVIEW_LIMIT} reviews.
          </p>
          <a href="/" className="inline-block mt-4 underline mono-font text-xs" style={{ color: ACCENT }}>
            ← Back to Reviewledger
          </a>
        </div>
      ) : (
        <>
          <div className="p-6 rounded-sm border mb-8" style={{ borderColor: LINE, background: PAPER_DEEP }}>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="display-font text-4xl font-semibold">$19</span>
              <span className="mono-font text-sm" style={{ color: "#9C8F7C" }}>/month</span>
            </div>
            <ul className="space-y-2 text-sm" style={{ color: "#3D362E" }}>
              <li>• Analyze up to {PRO_REVIEW_LIMIT} reviews per report (vs {FREE_REVIEW_LIMIT} on free)</li>
              <li>• Unlimited reports per month</li>
              <li>• Priority processing</li>
            </ul>
          </div>
          <button
            onClick={onCheckout}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-sm font-medium transition-transform hover:-translate-y-0.5"
            style={{ background: ACCENT, color: PAPER }}
          >
            Upgrade to Pro
          </button>
          <p className="mono-font text-xs mt-4" style={{ color: "#9C8F7C" }}>
            Secure checkout via Stripe. Cancel anytime.
          </p>
          <a href="/" className="inline-block mt-8 underline mono-font text-xs" style={{ color: "#9C8F7C" }}>
            ← Back to Reviewledger
          </a>
        </>
      )}
    </main>
  );
}

function Footer() {
  return (
    <footer className="border-t mt-12" style={{ borderColor: LINE }}>
      <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between mono-font text-xs" style={{ color: "#9C8F7C" }}>
        <span>Reviewledger — built for sellers, not analysts</span>
        <span>Your data isn't stored or shared</span>
      </div>
    </footer>
  );
}
