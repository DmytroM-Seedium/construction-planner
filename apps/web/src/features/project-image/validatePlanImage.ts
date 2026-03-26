const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const extOk = (name: string): boolean => {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp")
  );
};

export function validatePlanImage(file: File): { ok: true } | { ok: false; message: string } {
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return {
      ok: false,
      message: "Only JPEG, PNG, or WebP images are allowed.",
    };
  }
  if (!extOk(file.name)) {
    return {
      ok: false,
      message: "File must end with .jpg, .jpeg, .png, or .webp.",
    };
  }
  return { ok: true };
}

export const PLAN_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
