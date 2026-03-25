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

    await doc.incrementalPatch({
      hasImage: true,
      imageUpdatedAt: Date.now(),
      updatedAt: Date.now()
    });
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
  async uploadOnline(projectId: string, file: File) {
    await api.upload(`/projects/${projectId}/plan-image`, file);
  }
};
