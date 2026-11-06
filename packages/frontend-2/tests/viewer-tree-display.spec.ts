import { describe, expect, it } from 'vitest'
import {
  getTreeNodeDisplayName,
  isHiddenTreeNode,
  isHiddenTreeNodeName
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
})
