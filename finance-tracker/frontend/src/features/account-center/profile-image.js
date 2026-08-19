export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const PROFILE_IMAGE_FORMAT_GUIDANCE = "JPEG, PNG, or WebP up to 5 MB. Images are resized to 1024 pixels and stripped of metadata.";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

export function validateProfileImage(file) {
  if (!file) return "Choose an image to upload.";
  if (file.size > PROFILE_IMAGE_MAX_BYTES) return "Profile images must be 5 MB or smaller.";
  const extension = (file.name?.match(/\.[^.]+$/)?.[0] || "").toLowerCase();
  if (!allowedTypes.has(file.type) || !extensionTypes.has(extension)) return "Use a JPEG, PNG, or WebP image.";
  if (extensionTypes.get(extension) !== file.type) return "The file extension does not match the image type.";
  return "";
}
