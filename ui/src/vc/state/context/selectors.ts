import { VersionControlState } from '../reducer';

export const selectContexts = (state: VersionControlState) =>
  state.context.ids.map(id => state.context.entities[id]);

export const selectContextById = (contextId: string) => (
  state: VersionControlState
) => state.context.entities[contextId];

export const selectContextBranches = (contextId: string) => (
  state: VersionControlState
) =>
  state.branch.ids
    .map(id => state.branch.entities[id])
    .filter(branch => branch.context_address === contextId);

export const selectDefaultBranch = (contextId: string) => (
  state: VersionControlState
) => {
  const branches = selectContextBranches(contextId)(state);
  return branches.length > 0 ? branches[0] : null;
};
