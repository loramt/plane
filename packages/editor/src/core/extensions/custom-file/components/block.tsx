import { FileUp } from "lucide-react";
import { useCallback } from "react";
// local imports
import { formatFileSize } from "../utils";
import type { CustomFileNodeViewProps } from "./node-view";

type CustomFileBlockProps = CustomFileNodeViewProps & {
  downloadSrc: string | undefined;
};

export function CustomFileBlock(props: CustomFileBlockProps) {
  const { downloadSrc, node } = props;
  const { fileName, fileSize } = node.attrs;

  const displayName = fileName || "Untitled file";
  const displaySize = formatFileSize(fileSize);

  const handleClick = useCallback(() => {
    if (downloadSrc) {
      window.open(downloadSrc, "_blank");
    }
  }, [downloadSrc]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className="file-component inline-flex items-center gap-1.5 py-1 px-1.5 -mx-1.5 rounded cursor-pointer transition-colors hover:bg-layer-1-hover"
      contentEditable={false}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <FileUp className="size-5 text-tertiary flex-shrink-0" />
      <span className="text-sm text-primary">
        {displayName}
      </span>
      {displaySize && <span className="text-sm text-tertiary">{displaySize}</span>}
    </div>
  );
}
