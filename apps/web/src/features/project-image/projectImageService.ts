import { requestSync } from "@/processes/sync/syncEngine";
import { api } from "@/shared/http";
import { getDatabase } from "@/services/databaseService";
import type { Project } from "@construction-planner/shared/types";

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
    const project = doc.toMutableJSON() as Project;
    return projectImageService.getAttachmentBlobUrlForUser(
      project.userId,
      projectId,
    );
  },
  async getAttachmentBlobUrlForUser(
    userId: string,
    projectId: string,
  ): Promise<string | null> {
    const db = await getDatabase();
    const doc = await db.projects.findOne(projectId).exec();
    if (!doc) return null;
    const project = doc.toMutableJSON() as Project;
    if (project.userId !== userId) return null;
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

    const project = doc.toMutableJSON() as Project;
    const imageUpdatedAt: number | undefined =
      typeof project.imageUpdatedAt === "number" ? project.imageUpdatedAt : undefined;
    const imageSyncedAt: number =
      typeof project.imageSyncedAt === "number" ? project.imageSyncedAt : 0;

    if (!project.hasImage || !imageUpdatedAt) return false;
    if (imageUpdatedAt <= imageSyncedAt) return false;

    const attachment = doc.getAttachment("plan-image");
    if (!attachment) return false;

    const blob = await attachment.getData();
    const attachmentTypeRaw = (attachment as unknown as { type?: unknown }).type;
    const attachmentType = typeof attachmentTypeRaw === "string" ? attachmentTypeRaw : undefined;
    const file = new File([blob], "plan-image", {
      type: blob.type || attachmentType || "image/png",
    });

    const response = await api.upload<{ imageSyncedAt?: number }>(
      `/projects/${projectId}/plan-image`,
      {
      file,
      fields: { imageUpdatedAt },
      },
    );

    const nextSyncedAt =
      typeof response?.imageSyncedAt === "number" ? response.imageSyncedAt : imageUpdatedAt;

    await doc.incrementalPatch({
      imageSyncedAt: nextSyncedAt,
      updatedAt: Date.now(),
    });
    return true;
  },
};
