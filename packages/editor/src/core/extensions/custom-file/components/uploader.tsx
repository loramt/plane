import { Paperclip, X } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
// plane imports
import { cn } from "@plane/utils";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// helpers
import type { EFileError } from "@/helpers/file";
// hooks
import { useUploader, useDropZone, uploadFirstFileAndInsertRemaining } from "@/hooks/use-file-upload";
import { useEditorState } from "@tiptap/react";
// local imports
import { ECustomFileAttributeNames, ECustomFileStatus } from "../types";
import { formatFileSize, getFileComponentFileMap } from "../utils";
import type { CustomFileNodeViewProps } from "./node-view";
import { FileUploadProgress } from "./upload-progress";

type CustomFileUploaderProps = CustomFileNodeViewProps & {
  maxFileSize: number | undefined;
};

export function CustomFileUploader(props: CustomFileUploaderProps) {
  const { editor, extension, getPos, node, selected, updateAttributes } = props;
  // refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTriggeredFilePickerRef = useRef(false);
  const hasTriedUploadingOnMountRef = useRef(false);
  const { id: fileEntityId } = node.attrs;
  // derived values
  const fileComponentFileMap = useMemo(() => getFileComponentFileMap(editor), [editor]);
  const isTouchDevice = !!(editor.storage.utility as { isTouchDevice?: boolean } | undefined)?.isTouchDevice;
  const maxFileSize = props.maxFileSize;

  // Get upload progress percentage
  const uploadProgress = useEditorState({
    editor,
    selector: ({ editor }) =>
      (editor.storage.utility as { assetsUploadStatus?: Record<string, number> } | undefined)?.assetsUploadStatus?.[
        fileEntityId ?? ""
      ],
  });

  // Get file info from fileMap
  const fileInfo = useMemo(() => {
    if (!fileEntityId) return null;
    const meta = fileComponentFileMap?.get(fileEntityId);
    if (meta && meta.event === "drop" && "file" in meta) {
      return { name: meta.file.name, size: meta.file.size };
    }
    return null;
  }, [fileEntityId, fileComponentFileMap]);

  const onUpload = useCallback(
    (url: string, file: File) => {
      if (url) {
        if (!fileEntityId) return;
        updateAttributes({
          [ECustomFileAttributeNames.SOURCE]: url,
          [ECustomFileAttributeNames.FILE_NAME]: file.name,
          [ECustomFileAttributeNames.FILE_SIZE]: file.size,
          [ECustomFileAttributeNames.FILE_TYPE]: file.type,
          [ECustomFileAttributeNames.STATUS]: ECustomFileStatus.UPLOADED,
        });
        fileComponentFileMap?.delete(fileEntityId);

        const pos = getPos();
        const getCurrentSelection = editor.state.selection;
        const currentNode = editor.state.doc.nodeAt(getCurrentSelection.from);

        if (
          currentNode &&
          currentNode.type.name === node.type.name &&
          (currentNode.attrs as { src?: string }).src === url &&
          pos !== undefined
        ) {
          const nextNode = editor.state.doc.nodeAt(pos + 1);
          if (nextNode && nextNode.type.name === CORE_EXTENSIONS.PARAGRAPH) {
            editor.commands.setTextSelection(pos + 1);
          } else {
            editor.commands.createParagraphNear();
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fileComponentFileMap, fileEntityId, updateAttributes, getPos]
  );

  const uploadFileEditorCommand = useCallback(
    async (file: File) => {
      updateAttributes({ [ECustomFileAttributeNames.STATUS]: ECustomFileStatus.UPLOADING });
      return await extension.options.uploadFile?.(fileEntityId ?? "", file);
    },
    [extension.options, fileEntityId, updateAttributes]
  );

  const handleProgressStatus = useCallback(
    (isUploading: boolean) => {
      (editor.storage.utility as { uploadInProgress?: boolean }).uploadInProgress = isUploading;
    },
    [editor]
  );

  const handleInvalidFile = useCallback((_error: EFileError, _file: File, message: string) => {
    alert(message);
  }, []);

  // hooks - accept all file types (empty array = no MIME filtering)
  const { isUploading: isFileBeingUploaded, uploadFile } = useUploader({
    acceptedMimeTypes: [],
    editorCommand: uploadFileEditorCommand,
    handleProgressStatus,
    maxFileSize: maxFileSize ?? 0,
    onInvalidFile: handleInvalidFile,
    onUpload,
  });

  const { draggedInside, onDrop, onDragEnter, onDragLeave } = useDropZone({
    editor,
    getPos,
    type: "attachment",
    uploader: uploadFile,
  });

  useEffect(() => {
    if (hasTriedUploadingOnMountRef.current) return;

    const meta = fileComponentFileMap?.get(fileEntityId ?? "");
    if (meta) {
      if (meta.event === "drop" && "file" in meta) {
        hasTriedUploadingOnMountRef.current = true;
        void uploadFile(meta.file);
      } else if (meta.event === "insert" && fileInputRef.current && !hasTriggeredFilePickerRef.current) {
        if (meta.hasOpenedFileInputOnce) return;
        if (!isTouchDevice) {
          fileInputRef.current.click();
        }
        hasTriggeredFilePickerRef.current = true;
        fileComponentFileMap?.set(fileEntityId ?? "", { ...meta, hasOpenedFileInputOnce: true });
      }
    } else {
      hasTriedUploadingOnMountRef.current = true;
    }
  }, [fileEntityId, isTouchDevice, uploadFile, fileComponentFileMap]);

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      const filesList = e.target.files;
      const pos = getPos();
      if (!filesList || pos === undefined) {
        return;
      }
      void uploadFirstFileAndInsertRemaining({
        editor,
        filesList,
        pos,
        type: "attachment",
        uploader: uploadFile,
      });
    },
    [uploadFile, editor, getPos]
  );

  // Handle cancel upload - delete the node
  const handleCancelUpload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const pos = getPos();
      if (pos !== undefined) {
        editor.commands.deleteRange({ from: pos, to: pos + 1 });
      }
    },
    [editor, getPos]
  );

  // Show uploading state with same layout as block
  if (isFileBeingUploaded && fileEntityId && fileInfo) {
    const progressPercent = uploadProgress ?? 0;
    const uploadedBytes = Math.floor((progressPercent / 100) * fileInfo.size);
    const progressText = `${formatFileSize(uploadedBytes)} / ${formatFileSize(fileInfo.size)}`;

    return (
      <div
        className={cn(
          "file-component flex items-center gap-3 py-2.5 px-3 rounded-lg bg-layer-3 border border-subtle transition-all duration-200 ease-in-out",
          {
            "ring-2 ring-accent-strong/20": selected && editor.isEditable,
          }
        )}
        contentEditable={false}
      >
        <FileUploadProgress editor={editor} nodeId={fileEntityId} />
        <div className="flex-1 min-w-0">
          <div className="text-14 font-medium text-primary truncate">{fileInfo.name}</div>
          <div className="text-12 text-tertiary">{progressText}</div>
        </div>
        <button
          type="button"
          onClick={handleCancelUpload}
          className="flex items-center justify-center size-8 rounded hover:bg-layer-3-hover transition-colors flex-shrink-0"
          title="Cancel upload"
        >
          <X className="size-4 text-secondary" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "file-upload-component flex items-center justify-start gap-2 py-3 px-2 rounded-lg text-tertiary bg-layer-3 border border-dashed transition-all duration-200 ease-in-out cursor-default",
        {
          "border-subtle": !(selected && editor.isEditable),
          "hover:text-secondary hover:bg-layer-3-hover cursor-pointer": editor.isEditable,
          "bg-layer-3-hover text-secondary": draggedInside && editor.isEditable,
          "text-accent-secondary bg-accent-primary/10 hover:bg-accent-primary/10 hover:text-accent-secondary":
            selected && editor.isEditable,
        }
      )}
      role="button"
      tabIndex={0}
      onDrop={onDrop}
      onDragOver={onDragEnter}
      onDragLeave={onDragLeave}
      contentEditable={false}
      onClick={() => editor.isEditable && fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && editor.isEditable) {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
    >
      <Paperclip className="size-4" />
      <div className="text-14 font-medium flex-1">
        {draggedInside && editor.isEditable ? "Drop file here" : "Add a file"}
      </div>
      <input
        className="size-0 overflow-hidden"
        ref={fileInputRef}
        hidden
        type="file"
        onChange={onFileChange}
      />
    </div>
  );
}
