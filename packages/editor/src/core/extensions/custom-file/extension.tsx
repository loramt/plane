import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
// helpers
import { isFileValid } from "@/helpers/file";
import { insertEmptyParagraphAtNodeBoundaries } from "@/helpers/insert-empty-paragraph-at-node-boundary";
// types
import type { TFileHandler } from "@/types";
// local imports
import type { CustomFileNodeViewProps } from "./components/node-view";
import { CustomFileNodeView } from "./components/node-view";
import { CustomFileExtensionConfig } from "./extension-config";
import type { CustomFileExtensionOptions, CustomFileExtensionStorage, UploadEntity } from "./types";
import { ECustomFileAttributeNames, ECustomFileStatus } from "./types";

type Props = {
  fileHandler: TFileHandler;
  isEditable: boolean;
};

export function CustomFileExtension(props: Props) {
  const { fileHandler, isEditable } = props;
  // derived values
  const { getAssetSrc, getAssetDownloadSrc } = fileHandler;

  return CustomFileExtensionConfig.extend<CustomFileExtensionOptions, CustomFileExtensionStorage>({
    selectable: false,
    draggable: isEditable,

    addOptions() {
      const upload = "upload" in fileHandler ? fileHandler.upload : undefined;
      return {
        ...this.parent?.(),
        getFileDownloadSource: getAssetDownloadSrc,
        getFileSource: getAssetSrc,
        uploadFile: upload,
      };
    },

    addStorage() {
      const maxFileSize = "validation" in fileHandler ? fileHandler.validation?.maxFileSize : 0;

      return {
        fileMap: new Map(),
        deletedFileSet: new Map<string, boolean>(),
        maxFileSize,
        // escape markdown for files
        markdown: {
          serialize() {},
        },
      };
    },

    addCommands() {
      return {
        insertFileComponent:
          (props) =>
          ({ commands }) => {
            // Early return if there's an invalid file being dropped
            // Empty acceptedMimeTypes array = accept all file types
            if (
              props?.file &&
              !isFileValid({
                acceptedMimeTypes: [],
                file: props.file,
                maxFileSize: this.storage.maxFileSize,
                onError: (_error, message) => alert(message),
              })
            ) {
              return false;
            }

            // generate a unique id for the file to keep track of dropped
            // files' file data
            const fileId = uuidv4();

            const fileComponentFileMap = this.storage.fileMap as Map<string, UploadEntity>;

            if (fileComponentFileMap) {
              if (props?.event === "drop" && props.file) {
                fileComponentFileMap.set(fileId, {
                  file: props.file,
                  event: props.event,
                });
              } else if (props.event === "insert") {
                fileComponentFileMap.set(fileId, {
                  event: props.event,
                  hasOpenedFileInputOnce: false,
                });
              }
            }

            const attributes = {
              [ECustomFileAttributeNames.ID]: fileId,
              [ECustomFileAttributeNames.STATUS]: ECustomFileStatus.PENDING,
            };

            if (props.pos) {
              return commands.insertContentAt(props.pos, {
                type: this.name,
                attrs: attributes,
              });
            }
            return commands.insertContent({
              type: this.name,
              attrs: attributes,
            });
          },
      };
    },

    addKeyboardShortcuts() {
      return {
        ArrowDown: insertEmptyParagraphAtNodeBoundaries("down", this.name),
        ArrowUp: insertEmptyParagraphAtNodeBoundaries("up", this.name),
      };
    },

    addNodeView() {
      return ReactNodeViewRenderer((props) => (
        <CustomFileNodeView {...props} node={props.node as CustomFileNodeViewProps["node"]} />
      ));
    },
  });
}
