import { ChangeEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { queries } from "@/entities/queries";
import { localRepository } from "@/entities/repositories/localRepository";
import { projectImageService } from "@/features/project-image/projectImageService";
import { TaskModal } from "@/widgets/task-modal/TaskModal";
import { SyncStatusBadge } from "@/widgets/sync-status/SyncStatusBadge";
import { useUiStore } from "@/shared/uiStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useTasksForProject } from "@/store/useTasksForProject";
import { startSyncLoop } from "@/processes/sync/syncEngine";

type ProjectItem = { id: string; name: string; hasImage: boolean };

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const [persistHydrated, setPersistHydrated] = useState(() => useTaskStore.persist.hasHydrated());
  const userId = useTaskStore((s) => s.userId);
  const {
    selectedProjectId,
    setSelectedProjectId,
    setSelectedTaskId,
    openTaskModal
  } = useUiStore();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const tasks = useTasksForProject(userId, selectedProjectId);

  useEffect(() => {
    if (persistHydrated) return;
    return useTaskStore.persist.onFinishHydration(() => setPersistHydrated(true));
  }, [persistHydrated]);

  useEffect(() => {
    if (!persistHydrated) return;
    if (!userId) navigate("/");
  }, [navigate, persistHydrated, userId]);

  useEffect(() => {
    const stop = startSyncLoop();
    return stop;
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!userId) return;
    const query = await queries.projectsByUser(userId);
    const docs = await query.exec();
    const mapped = docs.map((d) => ({ id: d.id, name: d.name, hasImage: d.hasImage }));
    setProjects(mapped);
    if (!selectedProjectId && mapped[0]) setSelectedProjectId(mapped[0].id);
  }, [selectedProjectId, setSelectedProjectId, userId]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!selectedProjectId) return;
    projectImageService.getAttachmentBlobUrl(selectedProjectId).then(setImageUrl);
  }, [selectedProjectId, projects]);

  const createProject = async () => {
    if (!userId) return;
    const name = newProjectName.trim() || `Project ${projects.length + 1}`;
    const project = await localRepository.createProject(userId, name);
    setNewProjectName("");
    await refreshProjects();
    setSelectedProjectId(project.id);
  };

  const onImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedProjectId) return;
    const file = event.target.files?.[0];
    if (!file) return;
    await projectImageService.saveAttachment(selectedProjectId, file);
    setImageUrl(await projectImageService.getAttachmentBlobUrl(selectedProjectId));
    if (navigator.onLine) {
      await projectImageService.uploadOnline(selectedProjectId, file);
    }
  };

  const onRightClickPlan = (event: MouseEvent) => {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const y = Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2));
    openTaskModal("create", { x, y });
  };

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  if (!persistHydrated) return null;
  if (!userId) return null;

  return (
    <main className="grid h-full grid-cols-12 gap-3 p-3">
      <header className="col-span-12 flex items-center justify-end gap-2">
        <SyncStatusBadge />
      </header>
      <section className="col-span-2 rounded bg-white p-3 shadow">
        <h2 className="mb-2 font-semibold">Projects</h2>
        <input
          className="mb-2 w-full rounded border p-2"
          value={newProjectName}
          onChange={(event) => setNewProjectName(event.target.value)}
          placeholder={`Project ${projects.length + 1}`}
        />
        <button onClick={createProject} className="mb-3 w-full rounded bg-slate-800 p-2 text-white">
          Add Project
        </button>
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                className={`w-full rounded p-2 text-left ${selectedProjectId === project.id ? "bg-slate-200" : "bg-slate-50"}`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                {project.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="col-span-8 rounded bg-white p-3 shadow" onContextMenu={onRightClickPlan}>
        <h2 className="mb-2 font-semibold">Plan View</h2>
        {!selectedProject && <p>Select or create a project.</p>}
        {selectedProject && !imageUrl && (
          <label className="block cursor-pointer rounded border border-dashed p-6 text-center">
            Upload plan image
            <input className="hidden" type="file" accept="image/*" onChange={onImageUpload} />
          </label>
        )}
        {imageUrl && <img src={imageUrl} alt="Plan" className="max-h-[70vh] w-full object-contain" />}
      </section>

      <section className="col-span-2 rounded bg-white p-3 shadow">
        <p className="mb-2 text-sm text-slate-500">Right-click the plan to create a task.</p>
        <h2 className="mb-2 font-semibold">Tasks</h2>
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="rounded bg-slate-50 p-2">
              <button className="w-full text-left" onClick={() => setSelectedTaskId(task.id)}>
                {task.title}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {selectedProjectId && <TaskModal userId={userId} projectId={selectedProjectId} />}
    </main>
  );
};
