import { mergeAttributes, Node } from "@tiptap/core";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// local imports
import { ECustomFileAttributeNames } from "./types";
import type {
  CustomFileExtensionOptions,
  TCustomFileAttributes,
  CustomFileExtensionType,
  CustomFileExtensionStorage,
  InsertFileComponentProps,
} from "./types";
import { DEFAULT_CUSTOM_FILE_ATTRIBUTES } from "./utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    [CORE_EXTENSIONS.CUSTOM_FILE]: {
      insertFileComponent: ({ file, pos, event }: InsertFileComponentProps) => ReturnType;
    };
  }
  interface Storage {
    [CORE_EXTENSIONS.CUSTOM_FILE]: CustomFileExtensionStorage;
  }
}

export const CustomFileExtensionConfig: CustomFileExtensionType = Node.create<
  CustomFileExtensionOptions,
  CustomFileExtensionStorage
>({
  name: CORE_EXTENSIONS.CUSTOM_FILE,
  group: "block",
  atom: true,

  addAttributes() {
    return Object.values(ECustomFileAttributeNames).reduce(
      (acc, value) => {
        acc[value] = {
          default: DEFAULT_CUSTOM_FILE_ATTRIBUTES[value],
        };
        return acc;
      },
      {} as Record<ECustomFileAttributeNames, { default: TCustomFileAttributes[ECustomFileAttributeNames] }>
    );
  },

  parseHTML() {
    return [
      {
        tag: "file-component",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["file-component", mergeAttributes(HTMLAttributes)];
  },
});
