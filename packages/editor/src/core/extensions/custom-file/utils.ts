import type { Editor } from "@tiptap/core";
// local imports
import { ECustomFileAttributeNames, ECustomFileStatus } from "./types";
import type { TCustomFileAttributes, UploadEntity } from "./types";

export const DEFAULT_CUSTOM_FILE_ATTRIBUTES: TCustomFileAttributes = {
  [ECustomFileAttributeNames.SOURCE]: null,
  [ECustomFileAttributeNames.ID]: null,
  [ECustomFileAttributeNames.FILE_NAME]: null,
  [ECustomFileAttributeNames.FILE_SIZE]: null,
  [ECustomFileAttributeNames.FILE_TYPE]: null,
  [ECustomFileAttributeNames.STATUS]: ECustomFileStatus.PENDING,
};

export const getFileComponentFileMap = (editor: Editor): Map<string, UploadEntity> | undefined =>
  (editor.storage.fileComponent as { fileMap?: Map<string, UploadEntity> } | undefined)?.fileMap;

export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes == null || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const getFileTypeCategory = (mimeType: string | null | undefined): string => {
  if (!mimeType) return "generic";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/rtf"
  )
    return "document";
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/csv"
  )
    return "spreadsheet";
  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return "presentation";
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-rar-compressed" ||
    mimeType === "application/x-tar" ||
    mimeType === "application/gzip"
  )
    return "archive";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/xml") return "text";
  return "generic";
};
