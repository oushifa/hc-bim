/**
 * Pure front-end display tweaks for the viewer's model tree.
 *
 * The Revit sender groups elements into `Speckle.Core.Models.Collection` objects,
 * including a "No Level" collection (elements that have no level assigned) and a
 * "definitionGeometry" collection (family instance definition geometry). Neither
 * reads well inside the tree, so:
 *
 * - "No Level" is renamed to "OTHER" for display
 * - "definitionGeometry" (and its subtree) is not rendered at all
 *
 * On top of that, the "OTHER" collection (and anything literally named "OTHER") is
 * hidden in the 3D viewer by default. Its row is kept in the tree - it simply shows up
 * as hidden and can be toggled back on by the user.
 *
 * These are display-only rules: the loaded objects, their ids and their 3D geometry
 * are untouched, so selection, filtering and isolation keep working as before.
 */

/** Collection/node names that are not rendered in the tree (case-insensitive) */
export const HIDDEN_TREE_NODE_NAMES = new Set(['definitiongeometry'])

/** Display name overrides for tree rows, keyed by lowercased original name */
export const TREE_NODE_DISPLAY_NAMES: Record<string, string> = {
  'no level': 'OTHER'
}

/** Collection names that are hidden in the 3D viewer by default (case-insensitive) */
export const VIEWER_DEFAULT_HIDDEN_NODE_NAMES = new Set(['no level', 'other'])

const normalizeName = (name: string) => name.trim().toLowerCase()

/**
 * Whether a node name should be hidden from the tree
 */
export function isHiddenTreeNodeName(name: unknown): boolean {
  return typeof name === 'string' && HIDDEN_TREE_NODE_NAMES.has(normalizeName(name))
}

/**
 * Whether a tree node should be hidden from the tree (by its raw object name)
 */
export function isHiddenTreeNode(node?: { raw?: { name?: unknown; Name?: unknown } }) {
  const raw = node?.raw
  if (!raw) return false

  return isHiddenTreeNodeName(raw.name) || isHiddenTreeNodeName(raw.Name)
}

/**
 * Whether a node name should be hidden in the 3D viewer by default
 */
export function isViewerDefaultHiddenNodeName(name: unknown): boolean {
  return (
    typeof name === 'string' &&
    VIEWER_DEFAULT_HIDDEN_NODE_NAMES.has(normalizeName(name))
  )
}

/**
 * Whether a tree node's objects should be hidden in the 3D viewer by default
 * (by its raw object name)
 */
export function isViewerDefaultHiddenNode(node?: {
  raw?: { name?: unknown; Name?: unknown }
}) {
  const raw = node?.raw
  if (!raw) return false

  return (
    isViewerDefaultHiddenNodeName(raw.name) || isViewerDefaultHiddenNodeName(raw.Name)
  )
}

/**
 * Maps an original tree row header to the name that should actually be shown
 */
export function getTreeNodeDisplayName(header: string): string {
  if (!header) return header

  return TREE_NODE_DISPLAY_NAMES[normalizeName(header)] ?? header
}
