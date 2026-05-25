import { err, ok } from 'true-myth/result'
import {
  ProjectNoAccessError,
  ProjectNotEnoughPermissionsError,
  ProjectNotFoundError,
  SavedViewGroupNotFoundError,
  SavedViewNoAccessError,
  SavedViewNotFoundError,
  ServerNoAccessError,
  ServerNoSessionError,
  ServerNotEnoughPermissionsError,
  UngroupedSavedViewGroupLockError,
  WorkspaceNoAccessError,
  WorkspaceNotEnoughPermissionsError,
  WorkspacePlanNoFeatureAccessError,
  WorkspaceReadOnlyError,
  WorkspacesNotEnabledError,
  WorkspaceSsoSessionNoAccessError
} from '../domain/authErrors.js'
import {
  MaybeUserContext,
  ProjectContext,
  SavedViewContext,
  SavedViewGroupContext
} from '../domain/context.js'
import { Loaders } from '../domain/loaders.js'
import { AuthPolicyEnsureFragment } from '../domain/policies.js'
import { SavedViewVisibility } from '../domain/savedViews/types.js'
import {
  ensureCanUseProjectWorkspacePlanFeatureFragment,
  ensureImplicitProjectMemberWithWriteAccessFragment
} from './projects.js'
import { Roles } from '../../core/constants.js'
import { WorkspacePlanFeatures } from '../../workspaces/index.js'
import { isUngroupedGroup } from '../../saved-views/index.js'
import { StringEnum, StringEnumValues, throwUncoveredError } from '../../core/index.js'
import { ensureMinimumServerRoleFragment } from './server.js'

export const WriteTypes = StringEnum([
  'UpdateGeneral',
  'MoveView',
  'EditTitle',
  'EditDescription',
  'SetHomeView'
])
export type WriteTypes = StringEnumValues<typeof WriteTypes>

/**
 * Ensure the user can access the view
 */
export const ensureCanAccessSavedViewFragment: AuthPolicyEnsureFragment<
  | typeof Loaders.getSavedView
  | typeof Loaders.getProject
  | typeof Loaders.getEnv
  | typeof Loaders.getServerRole
  | typeof Loaders.getWorkspaceRole
  | typeof Loaders.getWorkspace
  | typeof Loaders.getWorkspacePlan
  | typeof Loaders.getWorkspaceSsoProvider
  | typeof Loaders.getWorkspaceSsoSession
  | typeof Loaders.getAdminOverrideEnabled
  | typeof Loaders.getProjectRole,
  MaybeUserContext &
    ProjectContext &
    SavedViewContext & {
      access: 'read' | WriteTypes
      /**
       * In some cases we want to just ignore a view being non-existant, instead of throwing
       */
      allowNonExistent?: boolean
    },
  InstanceType<
    | typeof SavedViewNotFoundError
    | typeof SavedViewNoAccessError
    | typeof ProjectNotFoundError
    | typeof ServerNoAccessError
    | typeof ServerNoSessionError
    | typeof ProjectNoAccessError
    | typeof WorkspaceNoAccessError
    | typeof WorkspaceSsoSessionNoAccessError
    | typeof ServerNotEnoughPermissionsError
    | typeof ProjectNotEnoughPermissionsError
    | typeof WorkspaceNotEnoughPermissionsError
    | typeof WorkspacesNotEnabledError
    | typeof WorkspaceReadOnlyError
    | typeof WorkspacePlanNoFeatureAccessError
  >
> =
  (loaders) =>
  async ({ userId, projectId, savedViewId, access, allowNonExistent }) => {
    const ensuredServerRole = await ensureMinimumServerRoleFragment(loaders)({
      userId,
      role: Roles.Server.User
    })
    if (ensuredServerRole.isErr) return err(ensuredServerRole.error)

    const canUseSavedViews = await ensureCanUseProjectWorkspacePlanFeatureFragment(
      loaders
    )({
      projectId,
      feature: WorkspacePlanFeatures.SavedViews,
      allowUnworkspaced: true
    })
    if (canUseSavedViews.isErr) return err(canUseSavedViews.error)

    const savedView = await loaders.getSavedView({ projectId, savedViewId })
    if (!savedView) {
      if (allowNonExistent) return ok()
      return err(new SavedViewNotFoundError())
    }
    // Validate read access
    if (access === 'read') {
      return ok()
    }

    switch (access) {
      case WriteTypes.UpdateGeneral:
      case WriteTypes.MoveView:
      case WriteTypes.EditTitle:
      case WriteTypes.EditDescription:
      case WriteTypes.SetHomeView:
        return ok()
      default:
        throwUncoveredError(access)
    }
  }

/**
 * Ensure the user can access the view group
 */
export const ensureCanAccessSavedViewGroupFragment: AuthPolicyEnsureFragment<
  | typeof Loaders.getSavedViewGroup
  | typeof Loaders.getProject
  | typeof Loaders.getEnv
  | typeof Loaders.getServerRole
  | typeof Loaders.getWorkspaceRole
  | typeof Loaders.getWorkspace
  | typeof Loaders.getWorkspacePlan
  | typeof Loaders.getWorkspaceSsoProvider
  | typeof Loaders.getWorkspaceSsoSession
  | typeof Loaders.getProjectRole,
  MaybeUserContext &
    ProjectContext &
    SavedViewGroupContext & {
      access: 'read' | 'write'
    },
  InstanceType<
    | typeof SavedViewGroupNotFoundError
    | typeof ProjectNotFoundError
    | typeof ServerNoAccessError
    | typeof ServerNoSessionError
    | typeof ProjectNoAccessError
    | typeof WorkspaceNoAccessError
    | typeof WorkspaceSsoSessionNoAccessError
    | typeof ServerNotEnoughPermissionsError
    | typeof ProjectNotEnoughPermissionsError
    | typeof WorkspaceNotEnoughPermissionsError
    | typeof WorkspacesNotEnabledError
    | typeof WorkspaceReadOnlyError
    | typeof WorkspacePlanNoFeatureAccessError
    | typeof UngroupedSavedViewGroupLockError
  >
> =
  (loaders) =>
  async ({ userId, projectId, savedViewGroupId, access }) => {
    const ensuredServerRole = await ensureMinimumServerRoleFragment(loaders)({
      userId,
      role: Roles.Server.User
    })
    if (ensuredServerRole.isErr) return err(ensuredServerRole.error)

    const canUseSavedViews = await ensureCanUseProjectWorkspacePlanFeatureFragment(
      loaders
    )({
      projectId,
      feature: WorkspacePlanFeatures.SavedViews,
      allowUnworkspaced: true
    })
    if (canUseSavedViews.isErr) return err(canUseSavedViews.error)

    const savedViewGroup = await loaders.getSavedViewGroup({
      projectId,
      groupId: savedViewGroupId
    })
    if (!savedViewGroup) return err(new SavedViewGroupNotFoundError())

    if (access === 'read') {
      return ok() // read access available to everyone who has access to project
    }

    // Prevent default group updates (as it doesnt exist)
    if (isUngroupedGroup(savedViewGroup.id)) {
      return err(new UngroupedSavedViewGroupLockError())
    }

    return ok()
  }
