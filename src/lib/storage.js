// Project persistence layer.
//
// This is intentionally a thin, swappable interface: every function here is
// the contract a future backend (e.g. a real database behind /api routes)
// would need to implement. For now it's backed by localStorage so projects
// survive closing the tab, with zero server/infra required.

const PROJECTS_KEY = "ecf.projects.v1";
const CURRENT_KEY = "ecf.currentProjectId.v1";

function readAll() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function listProjects() {
  const projects = readAll();
  return Object.values(projects).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getProject(id) {
  const projects = readAll();
  return projects[id] || null;
}

export function saveProject(project) {
  const projects = readAll();
  const next = { ...project, updatedAt: Date.now() };
  projects[project.id] = next;
  writeAll(projects);
  return next;
}

export function deleteProject(id) {
  const projects = readAll();
  delete projects[id];
  writeAll(projects);
  if (getCurrentProjectId() === id) setCurrentProjectId(null);
}

export function createProject({ name }) {
  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const project = {
    id,
    name: name || "Untitled Project",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: { text: "", fileName: "" },
    meta: { brandVoice: "", audience: "" },
    selectedOutputs: [],
    status: "draft", // draft | building | ready
    stageStatus: {}, // stageId -> idle | running | done | error
    stageErrors: {}, // stageId -> error message
    analysis: null,
    strategy: null,
    assets: {}, // outputId -> { content, updatedAt, edited, error }
  };
  saveProject(project);
  return project;
}

export function getCurrentProjectId() {
  return localStorage.getItem(CURRENT_KEY);
}

export function setCurrentProjectId(id) {
  if (id) localStorage.setItem(CURRENT_KEY, id);
  else localStorage.removeItem(CURRENT_KEY);
}
