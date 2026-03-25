import { LEGACY_CHECKLIST_STATUS_TO_TASK_STATUS } from "@construction-planner/shared/schemas";

// const migrateChecklistItemsToV1 = (oldDoc: Record<string, unknown>) => {
//   const raw = oldDoc.status;
//   const s = typeof raw === "string" ? raw : "";
//   const next = LEGACY_CHECKLIST_STATUS_TO_TASK_STATUS[s] ?? raw;
//   return { ...oldDoc, status: next };
// };

export const collectionSchemas = {
  users: {
    schema: {
      title: "users schema",
      version: 0,
      primaryKey: "id",
      type: "object",
      properties: {
        id: { type: "string", maxLength: 128 },
        userId: { type: "string" },
        name: { type: "string" },
        createdAt: { type: "number" },
        updatedAt: { type: "number" },
        isDeleted: { type: "boolean" },
      },
      required: ["id", "userId", "name", "createdAt", "updatedAt", "isDeleted"],
      attachments: {},
    },
  },
  projects: {
    schema: {
      title: "projects schema",
      version: 0,
      primaryKey: "id",
      type: "object",
      properties: {
        id: { type: "string", maxLength: 128 },
        userId: { type: "string" },
        name: { type: "string" },
        createdAt: { type: "number" },
        updatedAt: { type: "number" },
        isDeleted: { type: "boolean" },
        hasImage: { type: "boolean" },
        imageUpdatedAt: { type: "number" },
      },
      required: [
        "id",
        "userId",
        "name",
        "createdAt",
        "updatedAt",
        "isDeleted",
        "hasImage",
      ],
      attachments: {},
    },
  },
  tasks: {
    schema: {
      title: "tasks schema",
      version: 0,
      primaryKey: "id",
      type: "object",
      properties: {
        id: { type: "string", maxLength: 128 },
        userId: { type: "string" },
        projectId: { type: "string" },
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        createdAt: { type: "number" },
        updatedAt: { type: "number" },
        isDeleted: { type: "boolean" },
      },
      required: [
        "id",
        "userId",
        "projectId",
        "title",
        "x",
        "y",
        "createdAt",
        "updatedAt",
        "isDeleted",
      ],
      attachments: {},
    },
  },
  checklistItems: {
    schema: {
      title: "checklist schema",
      version: 0,
      primaryKey: "id",
      type: "object",
      properties: {
        id: { type: "string", maxLength: 128 },
        userId: { type: "string" },
        taskId: { type: "string" },
        title: { type: "string" },
        status: { type: "string" },
        createdAt: { type: "number" },
        updatedAt: { type: "number" },
        isDeleted: { type: "boolean" },
      },
      required: [
        "id",
        "userId",
        "taskId",
        "title",
        "status",
        "createdAt",
        "updatedAt",
        "isDeleted",
      ],
      attachments: {},
    },
    // migrationStrategies: {
    // 1: migrateChecklistItemsToV1,
    // },
  },
} as const;
