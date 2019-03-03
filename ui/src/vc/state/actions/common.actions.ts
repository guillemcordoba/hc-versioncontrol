import { createHolochainAsyncAction } from '@holochain/hc-redux-middleware';

export const INSTANCE_NAME = 'test-instance';
export const ZOME_NAME = 'vc';

export interface AddressRequest {
  address: string;
}

export const getEntry = createHolochainAsyncAction<{ address: string }, any>(
  INSTANCE_NAME,
  ZOME_NAME,
  'get_entry'
);

