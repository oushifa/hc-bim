import {
  buildDtpIframeSrcEnsured,
  getDtpUIOrigin
} from '~~/composables/useDtpIframeSrc'
import { wdpSave } from '~~/composables/useWdpEditorSave'

/** 团队案例 iframe 路径（host 由 getDtpUIOrigin() 动态获取） */
export const CASE_CREATE_PATH = '/ui/case-create?embed=embed&theme=light'

// 全局 DOM 引用，不使用 useState 避免序列化警告
const globalIframeRef = shallowRef<HTMLIFrameElement | null>(null)

export const useTwinSceneCasesKeeper = () => {
  const route = useRoute()

  const caseCreateIframeSrc = useState<string>(
    'cases_keeper_iframe_src',
    () => ''
  )
  const loadError = useState<boolean>('cases_keeper_load_error', () => false)
  const isEditing = useState<boolean>('cases_keeper_is_editing', () => false)
  const iframeInteracted = useState<boolean>(
    'cases_keeper_iframe_interacted',
    () => false
  )
  const iframeLoaded = useState<boolean>('cases_keeper_iframe_loaded', () => false)
  const currentWorkgroupId = useState<string>(
    'cases_keeper_current_workgroup_id',
    () => ''
  )

  /** 判断当前路由是否处于 cases 页面 */
  const isCasesRoute = computed(() => {
    return /^\/twin-scene\/[^/]+\/cases(?:\/|$|\?)/.test(route.path)
  })

  /** 加载或根据团队刷新 iframe */
  const loadIframe = async (force = false) => {
    const workgroupId = (route.params.workgroupId as string) || ''
    // 若同一团队已加载且没有发生错误，且非强制重新加载，则保持原 iframe 不变
    if (
      !force &&
      caseCreateIframeSrc.value &&
      !loadError.value &&
      currentWorkgroupId.value === workgroupId
    ) {
      return
    }

    loadError.value = false
    const origin = getDtpUIOrigin()
    if (!origin) {
      loadError.value = true
      return
    }
    const src = await buildDtpIframeSrcEnsured(`${origin}${CASE_CREATE_PATH}`)
    if (src) {
      caseCreateIframeSrc.value = src
      currentWorkgroupId.value = workgroupId
      iframeLoaded.value = false
      isEditing.value = false
      iframeInteracted.value = false
    } else {
      loadError.value = true
    }
  }

  /** 保存当前案例编辑器内容 */
  const saveCases = async (timeout = 10000) => {
    const frame = globalIframeRef.value?.contentWindow
    if (!frame) {
      return
    }
    await wdpSave(frame, { timeout })
  }

  return {
    globalIframeRef,
    caseCreateIframeSrc,
    loadError,
    isEditing,
    iframeInteracted,
    iframeLoaded,
    currentWorkgroupId,
    isCasesRoute,
    loadIframe,
    saveCases
  }
}
