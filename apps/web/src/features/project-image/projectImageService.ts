import { requestSync } from "@/processes/sync/syncEngine";
import { api } from "@/shared/http";
import { getDatabase } from "@/services/databaseService";

export const projectImageService = {
  async saveAttachment(projectId: string, file: File) {
    const db = await getDatabase();
    const doc = await db.projects.findOne(projectId).exec();
    if (!doc) throw new Error("Project not found");

    await doc.putAttachment({
      id: "plan-image",
      data: file,
      type: file.type || "image/png"
    });

    const ts = Date.now();
    await doc.incrementalPatch({
      hasImage: true,
      imageUpdatedAt: ts,
      updatedAt: ts
    });
    requestSync();
  },
  async removePlanAttachment(projectId: string): Promise<void> {
    const db = await getDatabase();
    const doc = await db.projects.findOne(projectId).exec();
    if (!doc) return;
    const attachment = doc.getAttachment("plan-image");
    if (attachment) {
      await attachment.remove();
    }
    await doc.incrementalPatch({
      hasImage: false,
      updatedAt: Date.now(),
    });
    requestSync();
  },
  async getAttachmentBlobUrl(projectId: string): Promise<string | null> {
    const db = await getDatabase();
    const doc = await db.projects.findOne(projectId).exec();
    if (!doc) return null;
    const attachment = doc.getAttachment("plan-image");
    if (!attachment) return null;
    const blob = await attachment.getData();
    return URL.createObjectURL(blob);
  },
  async uploadOnline(projectId: string, file: File, imageUpdatedAt?: number) {
    await api.upload(`/projects/${projectId}/plan-image`, {
      file,
      fields: { imageUpdatedAt: imageUpdatedAt ?? Date.now() },
    });
  },
  async uploadPendingFromLocal(projectId: string): Promise<boolean> {
    const db = await getDatabase();
    const doc = await db.projects.findOne(projectId).exec();
    if (!doc) return false;

    const project = doc.toMutableJSON() as any;
    const imageUpdatedAt: number | undefined =
      typeof project.imageUpdatedAt === "number" ? project.imageUpdatedAt : undefined;
    const imageSyncedAt: number =
      typeof project.imageSyncedAt === "number" ? project.imageSyncedAt : 0;

    if (!project.hasImage || !imageUpdatedAt) return false;
    if (imageUpdatedAt <= imageSyncedAt) return false;

    const attachment = doc.getAttachment("plan-image");
    if (!attachment) return false;

    const blob = await attachment.getData();
    const file = new File([blob], "plan-image", {
      type: blob.type || (attachment as any).type || "image/png",
    });

    const response = (await api.upload(`/projects/${projectId}/plan-image`, {
      file,
      fields: { imageUpdatedAt },
    })) as any;

    const nextSyncedAt =
      typeof response?.imageSyncedAt === "number" ? response.imageSyncedAt : imageUpdatedAt;

    await doc.incrementalPatch({
      imageSyncedAt: nextSyncedAt,
      updatedAt: Date.now(),
    });
    return true;
  },
};
