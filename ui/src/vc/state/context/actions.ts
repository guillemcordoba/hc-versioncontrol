import { ZOME_NAME, INSTANCE_NAME } from '../actions/common.actions';
import { createHolochainZomeCallAsyncAction } from '@holochain/hc-redux-middleware';
import { CommitObject } from '../../types';
import { getCachedEntry } from '../actions/cached.actions';
import { parseEntriesResults } from '../../utils/utils';
import { getBranchInfo, getBranchContent, getBranchAndContent } from '../branch/actions';

/** Holochain actions */

export const createContext = createHolochainZomeCallAsyncAction<
  { name: string },
  string
>(INSTANCE_NAME, ZOME_NAME, 'create_context');

export const createContextAndCommit = createHolochainZomeCallAsyncAction<
  { name: string; message: string; content: CommitObject },
  string
>(INSTANCE_NAME, ZOME_NAME, 'create_context_and_commit');

export const getCreatedContexts = createHolochainZomeCallAsyncAction<{}, any>(
  INSTANCE_NAME,
  ZOME_NAME,
  'get_created_contexts'
);

export const getAllContexts = createHolochainZomeCallAsyncAction<{}, any>(
  INSTANCE_NAME,
  ZOME_NAME,
  'get_all_contexts'
);

export const getContextBranches = createHolochainZomeCallAsyncAction<
  { context_address: string },
  any
>(INSTANCE_NAME, ZOME_NAME, 'get_context_branches');

export const getContextHistory = createHolochainZomeCallAsyncAction<
  { context_address: string },
  string
>(INSTANCE_NAME, ZOME_NAME, 'get_context_history');

/** Helper actions */

export function getContextInfo(contextAddress: string) {
  return dispatch =>
    dispatch(getCachedEntry(contextAddress, ['context'])).then(
      result => result.entry
    );
}

export function getContextContent(contextAddress: string) {
  return dispatch =>
    dispatch(
      getContextBranches.create({ context_address: contextAddress })
    ).then(addressesResult =>
      Promise.all(
        addressesResult.addresses.map((branchAddress: string) =>
          dispatch(getBranchAndContent(branchAddress))
        )
      )
    );
}

export function getContextAndContent(contextAddress: string) {
  return dispatch =>
    dispatch(getContextInfo(contextAddress)).then(() =>
      dispatch(getContextContent(contextAddress))
    );
}

export function getCreatedContextsAndContents() {
  return dispatch => {
    dispatch(getCreatedContexts.create({})).then(response =>
      Promise.all([
        parseEntriesResults(response).map(result =>
          getContextContent(result.entry.id)
        )
      ])
    );
  };
}
