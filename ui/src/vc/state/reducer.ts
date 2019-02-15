import { getType } from 'typesafe-actions';
import { AnyAction } from 'redux';

import { Context, Branch, Commit, CommitObject } from '../types';
import { EntityState, createEntityAdapter } from '../utils/entity';
import {
  getContextInfo,
  getCreatedContexts,
  getContextBranches,
  getBranchInfo,
  getCommitInfo,
  SET_BRANCH_HEAD,
  getCommitContent
} from './actions';
import {
  parseEntriesResults,
  parseEntry,
  parseEntryResult
} from '../utils/utils';

export interface VersionControlState {
  contexts: EntityState<Context>;
  branches: EntityState<Branch>;
  commits: EntityState<Commit>;
  objects: EntityState<CommitObject>;
}

const contextsAdapter = createEntityAdapter<Context>();
const branchesAdapter = createEntityAdapter<Branch>();
const commitsAdapter = createEntityAdapter<Commit>();
const objectsAdapter = createEntityAdapter<CommitObject>();

const initialState: VersionControlState = {
  contexts: contextsAdapter.getInitialState(),
  branches: branchesAdapter.getInitialState(),
  commits: commitsAdapter.getInitialState(),
  objects: objectsAdapter.getInitialState()
};

export function versionControlReducer(state = initialState, action: AnyAction) {
  console.log(action);
  switch (action.type) {
    case getType(getCreatedContexts.success):
      return {
        ...state,
        contexts: contextsAdapter.insertMany(
          parseEntriesResults(action.payload),
          state.contexts
        )
      };
    case getType(getContextInfo.success):
      return {
        ...state,
        contexts: contextsAdapter.upsertOne(
          parseEntryResult(action.payload),
          state.contexts
        )
      };
    case getType(getBranchInfo.success):
      return {
        ...state,
        branches: branchesAdapter.upsertOne(
          parseEntryResult(action.payload),
          state.branches
        )
      };
    case SET_BRANCH_HEAD:
      return {
        ...state,
        branches: branchesAdapter.updateOne(
          {
            id: action.payload.branchId,
            changes: {
              branch_head: action.payload.commitId
            }
          },
          state.branches
        )
      };
    case getType(getCommitInfo.success):
      return {
        ...state,
        commits: commitsAdapter.upsertOne(
          parseEntryResult(action.payload),
          state.commits
        )
      };
    case getType(getCommitContent.success):
      return {
        ...state,
        objects: objectsAdapter.upsertOne(
          parseEntryResult(action.payload),
          state.objects
        )
      };

    default:
      return state;
  }
}
