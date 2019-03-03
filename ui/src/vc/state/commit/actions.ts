import { INSTANCE_NAME, ZOME_NAME } from '../actions/common.actions';
import { createHolochainAsyncAction } from '@holochain/hc-redux-middleware';
import { adapters, selectVersionControl } from '../reducer';
import { getCachedEntry } from '../actions/cached.actions';
import { getObjectEntries } from '../object/actions';
import { CommitObject } from '../../types';

export const createCommit = createHolochainAsyncAction<
  { branch_address: string; message: string; content: any },
  string
>(INSTANCE_NAME, ZOME_NAME, 'create_commit');

export function getCommitInfo(commitAddress: string) {
  return dispatch =>
    dispatch(getCachedEntry(commitAddress, ['commit'])).then(
      result => result.entry
    );
}

/**
 * Gets the commit object and
 */
export function getCommitContent(commitAddress: string) {
  return (dispatch, getState) => {
    const commit = adapters.commit.selectById(commitAddress)(
      selectVersionControl(getState()).commit
    );
    return dispatch(getCachedEntry(commit.object_address, ['object'])).then(
      result => result.entry
    );
  };
}

export function getCommitAndContent(commitAddress: string) {
  return dispatch =>
    dispatch(getCommitInfo(commitAddress)).then(() =>
      dispatch(getCommitContent(commitAddress)).then(
        (commitObject: CommitObject) =>
          dispatch(getObjectEntries(commitObject.id))
      )
    );
}
