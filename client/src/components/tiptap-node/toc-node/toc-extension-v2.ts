import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";
import type { Mapping } from "@tiptap/pm/transform";

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

export const tocV2PluginKey = new PluginKey("tableOfContentsV2");

interface TOCPluginState {
  items: TOCItem[];
  decorations: DecorationSet;
  /** Maps current node start-position → stable runtime ID */
  idMap: Map<number, string>;
  /** Per-instance monotonic counter; ensures uniqueness within an editor. */
  seq: number;
}

/**
 * Builds fresh plugin state from the document.
 *
 * - `prev`: the previous plugin state (null on first init).
 * - `mapping`: the ProseMirror step mapping from the transaction (null on
 *   first init).  Used to translate old positions to new positions so that
 *   existing headings keep their IDs even when surrounding content changes.
 */
function buildTOCState(
  doc: Node,
  levels: number[],
  prev: TOCPluginState | null,
  mapping: Mapping | null,
): TOCPluginState {
  // Translate every old position → new position so we can look up stable IDs.
  const mappedIds = new Map<number, string>();
  if (prev && mapping) {
    prev.idMap.forEach((id, oldPos) => {
      const newPos = mapping.map(oldPos);
      mappedIds.set(newPos, id);
    });
  }

  let seq = prev?.seq ?? 0;

  const items: TOCItem[] = [];
  const decorations: Decoration[] = [];
  const idMap = new Map<number, string>();

  doc.descendants((node: Node, pos: number) => {
    if (node.type.name === "heading" && levels.includes(node.attrs.level)) {
      // Reuse the stable ID when the heading survived from the previous state.
      let id = mappedIds.get(pos);
      if (!id) {
        id = `toc-${++seq}`;
      }

      idMap.set(pos, id);
      items.push({ id, level: node.attrs.level, text: node.textContent, pos });
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, { "data-toc-id": id }),
      );
    }
  });

  return { items, decorations: DecorationSet.create(doc, decorations), idMap, seq };
}

export const TOCExtensionV2 = Extension.create<TOCOptions>({
  name: "tableOfContentsV2",

  addOptions() {
    return {
      levels: [1, 2, 3, 4],
      scrollBehavior: "smooth",
    };
  },

  addStorage() {
    return {
      items: [] as TOCItem[],
      scrollBehavior: "smooth" as ScrollBehavior,
    };
  },

  onCreate() {
    this.storage.scrollBehavior = this.options.scrollBehavior;
  },

  addProseMirrorPlugins() {
    const { levels } = this.options;

    return [
      new Plugin({
        key: tocV2PluginKey,
        state: {
          init(_, state) {
            return buildTOCState(state.doc, levels, null, null);
          },
          apply(tr, old) {
            // Only rebuild when the document actually changed.
            if (!tr.docChanged) return old;
            return buildTOCState(tr.doc, levels, old, tr.mapping);
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

// ---------------------------------------------------------------------------
// Helpers (same API shape as toc-extension.ts for easy adoption)
// ---------------------------------------------------------------------------

export function getTOCItemsV2(editor: Editor): TOCItem[] {
  if (!editor) return [];
  const pluginState = tocV2PluginKey.getState(editor.state) as
    | TOCPluginState
    | undefined;
  return pluginState?.items ?? [];
}

export function getScrollBehaviorV2(editor: Editor): ScrollBehavior {
  if (!editor) return "smooth";
  return (
    ((editor.storage as Record<string, any>).tableOfContentsV2
      ?.scrollBehavior as ScrollBehavior) ?? "smooth"
  );
}

export default TOCExtensionV2;
