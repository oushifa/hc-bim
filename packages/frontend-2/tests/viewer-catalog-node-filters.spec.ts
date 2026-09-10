import { describe, expect, it } from 'vitest'
import {
  getCatalogNodeFilterState,
  hasSavedCatalogNodeFilterState,
  resolveCatalogNodeFilterState,
  type CatalogNodeFilterState
} from '../lib/viewer/helpers/catalogHelpers'

const savedState: CatalogNodeFilterState = {
  isolatedApplicationIds: ['iso-1'],
  hiddenApplicationIds: ['hidden-1', 'hidden-2']
}

// 新建但从未保存过的目录节点：不带隐藏/隔离字段
const unsavedNode = {
  id: 'catalog-1-node-1',
  title: '未保存节点',
  childrens: []
}

const emptySavedState: CatalogNodeFilterState = {
  isolatedApplicationIds: [],
  hiddenApplicationIds: []
}

describe('viewer catalog node filter state', () => {
  describe('hasSavedCatalogNodeFilterState', () => {
    it('treats a node with filter fields as saved', () => {
      expect(hasSavedCatalogNodeFilterState(savedState)).toBe(true)
      expect(
        hasSavedCatalogNodeFilterState({ hiddenApplicationIds: ['hidden-1'] })
      ).toBe(true)
      expect(hasSavedCatalogNodeFilterState({ isolatedApplicationIds: [] })).toBe(true)
    })

    it('treats a node without filter fields as never saved', () => {
      expect(hasSavedCatalogNodeFilterState(unsavedNode)).toBe(false)
      expect(hasSavedCatalogNodeFilterState({})).toBe(false)
      expect(hasSavedCatalogNodeFilterState(undefined)).toBe(false)
    })
  })

  describe('getCatalogNodeFilterState', () => {
    it('normalizes missing arrays to empty arrays', () => {
      expect(getCatalogNodeFilterState({ hiddenApplicationIds: ['hidden-1'] })).toEqual(
        {
          isolatedApplicationIds: [],
          hiddenApplicationIds: ['hidden-1']
        }
      )
      expect(getCatalogNodeFilterState(undefined)).toEqual({
        isolatedApplicationIds: [],
        hiddenApplicationIds: []
      })
    })
  })

  describe('resolveCatalogNodeFilterState', () => {
    it('uses the node own saved structure when it has been saved', () => {
      expect(resolveCatalogNodeFilterState(savedState, null)).toEqual({
        state: savedState,
        inherited: false
      })
    })

    it('respects an explicitly saved empty structure', () => {
      expect(resolveCatalogNodeFilterState(emptySavedState, savedState)).toEqual({
        state: emptySavedState,
        inherited: false
      })
    })

    it('inherits the previous saved structure for a node that was never saved', () => {
      expect(resolveCatalogNodeFilterState(unsavedNode, savedState)).toEqual({
        state: savedState,
        inherited: true
      })
    })

    it('keeps the current view when nothing was saved yet', () => {
      expect(resolveCatalogNodeFilterState(unsavedNode, null)).toEqual({
        state: null,
        inherited: false
      })
    })
  })
})
