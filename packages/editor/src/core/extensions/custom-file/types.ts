import type { Node } from "@tiptap/core";
// types
import type { TFileHandler } from "@/types";

export enum ECustomFileAttributeNames {
  ID = "id",
  SOURCE = "src",
  FILE_NAME = "fileName",
  FILE_SIZE = "fileSize",
  FILE_TYPE = "fileType",
  STATUS = "status",
}

export enum ECustomFileStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  UPLOADED = "uploaded",
}

export type TCustomFileAttributes = {
  [ECustomFileAttributeNames.ID]: string | null;
  [ECustomFileAttributeNames.SOURCE]: string | null;
  [ECustomFileAttributeNames.FILE_NAME]: string | null;
  [ECustomFileAttributeNames.FILE_SIZE]: number | null;
  [ECustomFileAttributeNames.FILE_TYPE]: string | null;
  [ECustomFileAttributeNames.STATUS]: ECustomFileStatus;
};

export type UploadEntity = ({ event: "insert" } | { event: "drop"; file: File }) & { hasOpenedFileInputOnce?: boolean };

export type InsertFileComponentProps = {
  file?: File;
  pos?: number;
  event: "insert" | "drop";
};

export type CustomFileExtensionOptions = {
  getFileDownloadSource: TFileHandler["getAssetDownloadSrc"];
  getFileSource: TFileHandler["getAssetSrc"];
  uploadFile?: TFileHandler["upload"];
};

export type CustomFileExtensionStorage = {
  fileMap: Map<string, UploadEntity>;
  deletedFileSet: Map<string, boolean>;
  maxFileSize: number;
};

export type CustomFileExtensionType = Node<CustomFileExtensionOptions, CustomFileExtensionStorage>;
