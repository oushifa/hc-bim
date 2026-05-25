import { Roles } from '../../../../core/constants.js'
import { WorkspacePlanFeatures } from '../../../../workspaces/index.js'
import {
  ProjectNoAccessError,
  ProjectNotEnoughPermissionsError,
  ProjectNotFoundError,
  ServerNoAccessError,
  ServerNoSessionError,
  ServerNotEnoughPermissionsError,
  WorkspaceNoAccessError,
  WorkspaceNotEnoughPermissionsError,
  WorkspacePlanNoFeatureAccessError,
  WorkspaceReadOnlyError,
  WorkspacesNotEnabledError,
  WorkspaceSsoSessionNoAccessError
} from '../../../domain/authErrors.js'
import { MaybeUserContext, ProjectContext } from '../../../domain/context.js'
import { Loaders } from '../../../domain/loaders.js'
import { AuthPolicy } from '../../../domain/policies.js'
import {
  ensureCanUseProjectWorkspacePlanFeatureFragment
} from '../../../fragments/projects.js'
import { err, ok } from 'true-myth/result'
import { ensureMinimumServerRoleFragment } from '../../../fragments/server.js'

export const canCreateSavedViewPolicy: AuthPolicy<
  | typeof Loaders.getProject
  | typeof Loaders.getEnv
  | typeof Loaders.getServerRole
  | typeof Loaders.getWorkspaceRole
  | typeof Loaders.getWorkspace
  | typeof Loaders.getWorkspaceSsoProvider
  | typeof Loaders.getWorkspacePlan
  | typeof Loaders.getWorkspaceSsoSession
  | typeof Loaders.getProjectRole,
  MaybeUserContext & ProjectContext,
  InstanceType<
    | typeof ProjectNotFoundError
    | typeof ServerNoAccessError
    | typeof ServerNoSessionError
    | typeof ProjectNoAccessError
    | typeof WorkspaceNoAccessError
    | typeof WorkspaceSsoSessionNoAccessError
    | typeof ServerNotEnoughPermissionsError
    | typeof ProjectNotEnoughPermissionsError
    | typeof WorkspaceNotEnoughPermissionsError
    | typeof WorkspacePlanNoFeatureAccessError
    | typeof WorkspaceReadOnlyError
    | typeof WorkspacesNotEnabledError
  >
> =
  (loaders) =>
  async ({ userId, projectId }) => {
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

    return ok()
  }
