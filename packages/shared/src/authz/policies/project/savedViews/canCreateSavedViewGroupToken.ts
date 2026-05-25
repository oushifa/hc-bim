import { Roles } from '../../../../core/constants.js'
import {
  ProjectNoAccessError,
  ProjectNotEnoughPermissionsError,
  ProjectNotFoundError,
  SavedViewGroupNotFoundError,
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
} from '../../../domain/authErrors.js'
import {
  MaybeUserContext,
  ProjectContext,
  SavedViewGroupContext
} from '../../../domain/context.js'
import { Loaders } from '../../../domain/loaders.js'
import { AuthPolicy } from '../../../domain/policies.js'
import { ensureCanAccessSavedViewGroupFragment } from '../../../fragments/savedViews.js'
import { err, ok } from 'true-myth/result'
import { ensureMinimumServerRoleFragment } from '../../../fragments/server.js'

export const canCreateSavedViewGroupTokenPolicy: AuthPolicy<
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
  MaybeUserContext & ProjectContext & SavedViewGroupContext,
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
  async ({ userId, projectId, savedViewGroupId }) => {
    const ensuredServerRole = await ensureMinimumServerRoleFragment(loaders)({
      userId,
      role: Roles.Server.User
    })
    if (ensuredServerRole.isErr) return err(ensuredServerRole.error)

    const canUseSavedViews = await ensureCanAccessSavedViewGroupFragment(loaders)({
      userId,
      projectId,
      savedViewGroupId,
      access: 'write'
    })

    if (canUseSavedViews.isErr) return err(canUseSavedViews.error)
    return ok()
  }
