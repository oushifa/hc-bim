import { describe, expect, it } from 'vitest'
import {
  getTreeNodeDisplayName,
  isHiddenTreeNode,
  isHiddenTreeNodeName,
  isViewerDefaultHiddenNode,
  isViewerDefaultHiddenNodeName
} from '../lib/viewer/helpers/treeDisplay'

describe('viewer tree display tweaks', () => {
  describe('getTreeNodeDisplayName', () => {
    it('renames the Revit "No Level" collection to OTHER', () => {
      expect(getTreeNodeDisplayName('No Level')).toBe('OTHER')
    })

    it('matches case-insensitively and trims whitespace', () => {
      expect(getTreeNodeDisplayName('no level')).toBe('OTHER')
      expect(getTreeNodeDisplayName('NO LEVEL')).toBe('OTHER')
      expect(getTreeNodeDisplayName(' No Level ')).toBe('OTHER')
    })

    it('leaves every other name untouched', () => {
      expect(getTreeNodeDisplayName('Level 1')).toBe('Level 1')
      expect(getTreeNodeDisplayName('Roof Level')).toBe('Roof Level')
      expect(getTreeNodeDisplayName('definitionGeometry')).toBe('definitionGeometry')
      expect(getTreeNodeDisplayName('')).toBe('')
    })
  })

  describe('isHiddenTreeNodeName', () => {
    it('hides definitionGeometry', () => {
      expect(isHiddenTreeNodeName('definitionGeometry')).toBe(true)
      expect(isHiddenTreeNodeName('definitiongeometry')).toBe(true)
      expect(isHiddenTreeNodeName(' definitionGeometry ')).toBe(true)
    })

    it('does not hide levels or anything else', () => {
      expect(isHiddenTreeNodeName('Level 1')).toBe(false)
      expect(isHiddenTreeNodeName('No Level')).toBe(false)
      expect(isHiddenTreeNodeName('')).toBe(false)
      expect(isHiddenTreeNodeName(undefined)).toBe(false)
      expect(isHiddenTreeNodeName(42)).toBe(false)
    })
  })

  describe('isHiddenTreeNode', () => {
    it('hides nodes whose raw name (or Name) is definitionGeometry', () => {
      expect(isHiddenTreeNode({ raw: { name: 'definitionGeometry' } })).toBe(true)
      expect(isHiddenTreeNode({ raw: { Name: 'definitionGeometry' } })).toBe(true)
    })

    it('keeps the "No Level" collection in the tree', () => {
      expect(isHiddenTreeNode({ raw: { name: 'No Level' } })).toBe(false)
    })

    it('handles nodes without raw data', () => {
      expect(isHiddenTreeNode({})).toBe(false)
      expect(isHiddenTreeNode()).toBe(false)
    })
  })

  describe('isViewerDefaultHiddenNodeName', () => {
    it('matches the OTHER collection and its original "No Level" name', () => {
      expect(isViewerDefaultHiddenNodeName('No Level')).toBe(true)
      expect(isViewerDefaultHiddenNodeName('no level')).toBe(true)
      expect(isViewerDefaultHiddenNodeName(' No Level ')).toBe(true)
      expect(isViewerDefaultHiddenNodeName('OTHER')).toBe(true)
      expect(isViewerDefaultHiddenNodeName('other')).toBe(true)
    })

    it('does not match anything else', () => {
      expect(isViewerDefaultHiddenNodeName('Level 1')).toBe(false)
      expect(isViewerDefaultHiddenNodeName('definitionGeometry')).toBe(false)
      expect(isViewerDefaultHiddenNodeName('')).toBe(false)
      expect(isViewerDefaultHiddenNodeName(undefined)).toBe(false)
      expect(isViewerDefaultHiddenNodeName(42)).toBe(false)
    })
  })

  describe('isViewerDefaultHiddenNode', () => {
    it('matches nodes whose raw name (or Name) is the OTHER collection', () => {
      expect(isViewerDefaultHiddenNode({ raw: { name: 'No Level' } })).toBe(true)
      expect(isViewerDefaultHiddenNode({ raw: { Name: 'OTHER' } })).toBe(true)
    })

    it('handles nodes without raw data', () => {
      expect(isViewerDefaultHiddenNode({ raw: { name: 'Level 1' } })).toBe(false)
      expect(isViewerDefaultHiddenNode({})).toBe(false)
      expect(isViewerDefaultHiddenNode()).toBe(false)
    })
  })
})
