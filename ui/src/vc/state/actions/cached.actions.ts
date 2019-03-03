import { selectVersionControl } from '../reducer';
import { getEntry } from './common.actions';
import { parseEntryResult } from '../../utils/utils';
import { EntryResult } from '../../types';
import { selectExistingEntry } from '../selectors/common';

/**
 * Tries to find the given entry in the given entityTypes, and executes getEntry if it doesn't exist
 * @param entryAddress the address we are looking for
 * @param entityTypes the possible types of entity that the entry can have
 * @param selectState a state selector from the redux's root state, default to selectVersionControl
 */
export function getCachedEntry(
  entryAddress: string,
  entityTypes: string[],
  selectState: (state) => any = selectVersionControl
) {
  return (dispatch, getState): Promise<EntryResult> => {
    const entryResult = selectExistingEntry(entryAddress, entityTypes)(
      selectState(getState())
    );
    if (!entryResult) {
      return dispatch(getEntry.create({ address: entryAddress })).then(entry =>
        parseEntryResult(entry)
      );
    } else {
      return Promise.resolve(entryResult);
    }
  };
}
