import { useEffect, useRef, useState } from "react";
import { Factory, Loader2, CreditCard } from "lucide-react";
import Dashboard from "./components/Dashboard.jsx";
import ProcessingScreen from "./components/ProcessingScreen.jsx";
import ResultsScreen from "./components/ResultsScreen.jsx";
import ProjectSwitcher from "./components/ProjectSwitcher.jsx";
import PaywallScreen from "./components/PaywallScreen.jsx";
import * as store from "./lib/storage.js";
import { buildStageList, runPipeline, regenerateOutput } from "./lib/pipeline.js";
import { buildProjectZip, downloadAsset } from "./lib/zipExport.js";
import {
  getStoredAccess,
  setStoredAccess,
  clearStoredAccess,
  verifyCheckoutSession,
  checkSubscription,
  createPortalSession,
} from "./lib/subscription.js";

function freshView(project) {
  if (!project) return "dashboard";
  if (project.status === "building") return "processing";
  if (project.status === "ready") return "results";
  return "dashboard";
}

export default function App() {
  const [projects, setProjects] = useState(() => store.listProjects());
  const [project, setProject] = useState(() => {
    const currentId = store.getCurrentProjectId();
    const existing = currentId ? store.getProject(currentId) : null;
    if (existing) return existing;
    const created = store.createProject({ name: "" });
    store.setCurrentProjectId(created.id);
    return created;
  });
  const [view, setView] = useState(() => freshView(project));
  const projectRef = useRef(project);
  projectRef.current = project;

  // --- Subscription paywall -------------------------------------------
  // Gates everything below. Runs once on mount: verifies a fresh Stripe
  // Checkout redirect if present, otherwise re-checks any cached access
  // flag against Stripe before trusting it (so a cancellation or failed
  // payment revokes access on the next visit instead of trusting
  // localStorage forever).
  const [access, setAccess] = useState(null); // { customerId, subscriptionId, status }
  const [accessState, setAccessState] = useState("checking"); // checking | locked | unlocked
  const [accessError, setAccessError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");

      if (sessionId) {
        try {
          const result = await verifyCheckoutSession(sessionId);
          if (!cancelled) {
            if (result.active) {
              const next = { customerId: result.customerId, subscriptionId: result.subscriptionId, status: result.status };
              setStoredAccess(next);
              setAccess(next);
              setAccessState("unlocked");
            } else {
              clearStoredAccess();
              setAccessState("locked");
            }
          }
        } catch (err) {
          if (!cancelled) {
            setAccessError(err.message || "Could not verify checkout session");
            setAccessState("locked");
          }
        } finally {
          params.delete("session_id");
          const rest = params.toString();
          window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
        }
        return;
      }

      const stored = getStoredAccess();
      if (!stored?.customerId) {
        if (!cancelled) setAccessState("locked");
        return;
      }

      try {
        const result = await checkSubscription(stored.customerId);
        if (cancelled) return;
        if (result.active) {
          const next = { customerId: stored.customerId, subscriptionId: result.subscriptionId, status: result.status };
          setStoredAccess(next);
          setAccess(next);
          setAccessState("unlocked");
        } else {
          clearStoredAccess();
          setAccessState("locked");
        }
      } catch (err) {
        // A network hiccup shouldn't instantly lock out an already-verified
        // subscriber - fall back to the cached flag, but only if it was
        // last confirmed active.
        if (cancelled) return;
        if (stored.status === "active") {
          setAccess(stored);
          setAccessState("unlocked");
        } else {
          setAccessState("locked");
        }
      }
    }

    verifyAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleManageSubscription() {
    if (!access?.customerId) return;
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession(access.customerId);
      window.location.href = url;
    } catch (err) {
      setPortalLoading(false);
      alert(err.message || "Could not open billing portal");
    }
  }
  // --- End subscription paywall ----------------------------------------

  function persist(next) {
    projectRef.current = next;
    setProject(next);
    store.saveProject(next);
    setProjects(store.listProjects());
  }

  function updateProject(patch) {
    persist({ ...projectRef.current, ...patch });
  }

  function selectProject(id) {
    const p = store.getProject(id);
    if (!p) return;
    store.setCurrentProjectId(id);
    projectRef.current = p;
    setProject(p);
    setView(freshView(p));
  }

  function createProject() {
    const p = store.createProject({ name: "" });
    store.setCurrentProjectId(p.id);
    projectRef.current = p;
    setProject(p);
    setProjects(store.listProjects());
    setView("dashboard");
  }

  function deleteProject(id) {
    store.deleteProject(id);
    const remaining = store.listProjects();
    setProjects(remaining);
    if (id === project.id) {
      if (remaining[0]) {
        selectProject(remaining[0].id);
      } else {
        createProject();
      }
    }
  }

  const stages = buildStageList(project.selectedOutputs);
  const buildDisabled = !project.source.text.trim() || project.selectedOutputs.length === 0;
  const [pipelineSettled, setPipelineSettled] = useState(true);

  async function handleBuild() {
    const started = {
      ...projectRef.current,
      status: "building",
      stageStatus: {},
      stageErrors: {},
    };
    persist(started);
    setView("processing");
    setPipelineSettled(false);

    await runPipeline(started, {
      onStageStart(stageId) {
        const next = {
          ...projectRef.current,
          stageStatus: { ...projectRef.current.stageStatus, [stageId]: "running" },
        };
        persist(next);
      },
      onStageUpdate(stageId, { status, error, assets, analysis, strategy }) {
        const next = { ...projectRef.current };
        next.stageStatus = { ...next.stageStatus, [stageId]: status };
        if (error) next.stageErrors = { ...next.stageErrors, [stageId]: error };
        if (assets) next.assets = { ...next.assets, ...assets };
        if (analysis) next.analysis = analysis;
        if (strategy) next.strategy = strategy;
        persist(next);
      },
    });

    persist({ ...projectRef.current, status: "ready" });
    setPipelineSettled(true);
  }

  async function handleRegenerate(outputId) {
    try {
      const result = await regenerateOutput(projectRef.current, outputId);
      const next = { ...projectRef.current };
      next.assets = {
        ...next.assets,
        [outputId]: { content: result.content, updatedAt: Date.now(), edited: false },
      };
      if (result.analysis) next.analysis = result.analysis;
      if (result.strategy) next.strategy = result.strategy;
      next.stageErrors = { ...next.stageErrors };
      delete next.stageErrors[outputId];
      persist(next);
    } catch (err) {
      const next = { ...projectRef.current };
      next.stageErrors = { ...next.stageErrors, [outputId]: err.message };
      persist(next);
    }
  }

  function handleSaveAsset(outputId, content) {
    const next = { ...projectRef.current };
    next.assets = { ...next.assets, [outputId]: { ...next.assets[outputId], content, updatedAt: Date.now(), edited: true } };
    persist(next);
  }

  const hasAnyAsset = Object.values(project.assets || {}).some((a) => a?.content);

  if (accessState === "checking") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] bg-grid flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-400" size={28} />
      </div>
    );
  }

  if (accessState === "locked") {
    return <PaywallScreen initialError={accessError} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] bg-grid">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => setView(freshView(project))} className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Factory size={16} className="text-white" />
            </span>
            <span className="font-semibold text-white tracking-tight">Empire Content Factory</span>
          </button>
          <div className="flex items-center gap-3">
            {project.status === "ready" && (
              <nav className="hidden sm:flex items-center gap-1 rounded-full bg-white/5 p-1">
                <button
                  onClick={() => setView("dashboard")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    view === "dashboard" ? "bg-white text-black" : "text-white/60 hover:text-white"
                  }`}
                >
                  Setup
                </button>
                <button
                  onClick={() => setView("results")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    view === "results" ? "bg-white text-black" : "text-white/60 hover:text-white"
                  }`}
                >
                  Results
                </button>
              </nav>
            )}
            {access?.customerId && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                title="Manage Subscription"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-50"
              >
                {portalLoading ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                Manage Subscription
              </button>
            )}
            <ProjectSwitcher
              projects={projects}
              currentId={project.id}
              onSelect={selectProject}
              onCreate={createProject}
              onDelete={deleteProject}
            />
          </div>
        </div>
      </header>

      <main className="pb-24">
        {view === "dashboard" && (
          <Dashboard project={project} onUpdate={updateProject} onBuild={handleBuild} buildDisabled={buildDisabled} />
        )}
        {view === "processing" && (
          <ProcessingScreen
            stages={stages}
            stageStatus={project.stageStatus}
            stageErrors={project.stageErrors}
            allSettled={pipelineSettled}
            hasAnyAsset={hasAnyAsset}
            onViewResults={() => setView("results")}
            onBack={() => setView("dashboard")}
          />
        )}
        {view === "results" && (
          <ResultsScreen
            project={project}
            onSaveAsset={handleSaveAsset}
            onRegenerate={handleRegenerate}
            onDownloadAsset={(id) => downloadAsset(id, project.assets[id]?.content || "")}
            onDownloadAll={() => buildProjectZip(project)}
            onEditSettings={() => setView("dashboard")}
          />
        )}
      </main>
    </div>
  );
}
