import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface TOCItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export interface TOCOptions {
  levels: number[];
  scrollBehavior: ScrollBehavior;
}

export const tocPluginKey = new PluginKey("tableOfContents");

export const TOCExtension = Extension.create<TOCOptions>({
  name: "tableOfContents",

  addOptions() {
    return {
      levels: [1, 2, 3, 4],
      scrollBehavior: "smooth",
    };
  },

  addStorage() {
    return {
      items: [] as TOCItem[],
    };
  },

  addProseMirrorPlugins() {
    const { levels } = this.options;

    return [
      new Plugin({
        key: tocPluginKey,
        state: {
          init() {
            return {
              items: [] as TOCItem[],
              decorations: DecorationSet.empty,
            };
          },
          apply(tr, _oldState) {
            const { doc } = tr;
            const items: TOCItem[] = [];
            const decorations: Decoration[] = [];
            let headingCount = 1;

            doc.descendants((node, pos) => {
              if (
                node.type.name === "heading" &&
                levels.includes(node.attrs.level)
              ) {
                const id = `heading-${headingCount}`;
                headingCount++;
                const text = node.textContent;
                const level = node.attrs.level;

                items.push({
                  id,
                  level,
                  text,
                  pos,
                });

                // Add data-toc-id attribute to heading nodes for scrolling
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    "data-toc-id": id,
                  }),
                );
              }
            });

            return {
              items,
              decorations: DecorationSet.create(doc, decorations),
            };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});

// Helper function to get TOC items from editor
export function getTOCItems(editor: any): TOCItem[] {
  if (!editor) return [];
  const pluginState = tocPluginKey.getState(editor.state);
  return pluginState?.items || [];
}

// Helper function to get scrollBehavior from editor
export function getScrollBehavior(editor: any): ScrollBehavior {
  if (!editor) return "smooth";
  const pluginState = tocPluginKey.getState(editor.state);
  return pluginState?.scrollBehavior || "smooth";
}

export default TOCExtension;
