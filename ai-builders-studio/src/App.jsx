import { useState } from "react";
import { Crown, Download, RotateCcw, CheckCircle2 } from "lucide-react";
import TeamRoster from "./components/TeamRoster.jsx";
import MissionForm from "./components/MissionForm.jsx";
import SectionCard from "./components/SectionCard.jsx";
import { packageToMarkdown, downloadTextFile, slugify } from "./lib/downloadPackage.js";

export default function App() {
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mission, setMission] = useState("");

  async function runMission(newMission) {
    setMission(newMission);
    setStatus("running");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mission: newMission }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "The Orchestrator hit an error.");
      }
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(String(err.message || err));
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setError(null);
    setMission("");
  }

  function handleDownload() {
    if (!result) return;
    const markdown = packageToMarkdown(result);
    downloadTextFile(`${slugify(result.brief?.name)}-package.md`, markdown);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-3">
          <span className="rounded-xl bg-indigo-600 p-2 text-white">
            <Crown size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Empire Orchestrator</h1>
            <p className="text-sm text-slate-500">One idea in. One finished package out.</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-4">
          <TeamRoster />
          {status !== "done" && <MissionForm onSubmit={runMission} isRunning={status === "running"} />}
        </section>

        {status === "running" && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
            Chat is breaking "{mission}" into tasks and routing each one to the right specialist. This runs several
            AI calls in parallel and usually takes 15–40 seconds…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {status === "done" && result && (
          <section className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{result.brief?.name}</h2>
                  <p className="text-slate-600">{result.brief?.tagline}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    <Download size={16} /> Download package
                  </button>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw size={16} /> New mission
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">Audience:</span> {result.brief?.audience} ·{" "}
                <span className="font-medium text-slate-700">Tone:</span> {result.brief?.tone}
              </p>
              {result.qc && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <p>
                    <span className="font-semibold">Quality control:</span> {result.qc}
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4">
              {result.sections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
