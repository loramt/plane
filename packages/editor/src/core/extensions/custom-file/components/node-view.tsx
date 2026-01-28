import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useMemo, useEffect, useState } from "react";
// local imports
import type { CustomFileExtensionType, TCustomFileAttributes } from "../types";
import { CustomFileBlock } from "./block";
import { CustomFileUploader } from "./uploader";

export type CustomFileNodeViewProps = Omit<NodeViewProps, "extension" | "updateAttributes"> & {
  extension: CustomFileExtensionType;
  node: NodeViewProps["node"] & {
    attrs: TCustomFileAttributes;
  };
  updateAttributes: (attrs: Partial<TCustomFileAttributes>) => void;
};

export function CustomFileNodeView(props: CustomFileNodeViewProps) {
  const { editor, extension, node } = props;
  const { src: fileNodeSrc } = node.attrs;

  const isUploaded = useMemo(() => !!fileNodeSrc, [fileNodeSrc]);
  const [resolvedDownloadSrc, setResolvedDownloadSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!fileNodeSrc) {
      // Reset happens on unmount via cancelled flag or naturally when effect re-runs
      return;
    }

    let cancelled = false;
    setResolvedDownloadSrc(undefined);

    const getFileDownloadSource = async () => {
      try {
        const downloadUrl = await extension.options.getFileDownloadSource?.(fileNodeSrc);
        if (!cancelled) {
          setResolvedDownloadSrc(downloadUrl);
        }
      } catch (error) {
        console.error("Error fetching file download source:", error);
      }
    };
    void getFileDownloadSource();

    return () => {
      cancelled = true;
      setResolvedDownloadSrc(undefined);
    };
  }, [fileNodeSrc, extension.options]);

  return (
    <NodeViewWrapper>
      <div className="p-0 mx-0 my-2" data-drag-handle>
        {isUploaded ? (
          <CustomFileBlock downloadSrc={resolvedDownloadSrc} {...props} />
        ) : (
          <CustomFileUploader
            maxFileSize={(editor.storage.fileComponent as { maxFileSize?: number } | undefined)?.maxFileSize}
            {...props}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}
