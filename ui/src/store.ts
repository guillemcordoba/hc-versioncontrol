
declare global {
  interface Window {
    process?: Object;
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

import {
  createStore,
  compose,
  applyMiddleware,
  combineReducers,
  Reducer,
  StoreEnhancer,
  Action
} from 'redux';
import { lazyReducerEnhancer } from 'pwa-helpers/lazy-reducer-enhancer.js';

import { connect } from '@holochain/hc-web-client/dist/index.js';
import { holochainMiddleware } from '@holochain/hc-redux-middleware/build/main/lib/middleware';

import { NotesState, notesReducer } from './notes/state/reducer';

// Overall state extends static states and partials lazy states.
export interface RootState {
  notes: NotesState;
}

// this url should use the same port set up the holochain container
const url = 'ws:localhost:3000';
const hcWc = connect(url);

const middleware = holochainMiddleware(hcWc);

// Sets up a Chrome extension for time travel debugging.
// See https://github.com/zalmoxisus/redux-devtools-extension for more information.
const devCompose: <Ext0, Ext1, StateExt0, StateExt1>(
  f1: StoreEnhancer<Ext0, StateExt0>,
  f2: StoreEnhancer<Ext1, StateExt1>
) => StoreEnhancer<Ext0 & Ext1, StateExt0 & StateExt1> =
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore(
  state => state as Reducer<RootState, Action<any>>,
  devCompose(lazyReducerEnhancer(combineReducers), applyMiddleware(middleware))
);

// Initially loaded reducers.
store.addReducers({
  notesReducer
});
