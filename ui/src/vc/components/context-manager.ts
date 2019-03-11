import { LitElement, html, customElement, property } from 'lit-element';
import { connect } from 'pwa-helpers/connect-mixin';
import '@vaadin/vaadin-button/theme/material/vaadin-button.js';
import '@vaadin/vaadin-text-field/theme/material/vaadin-text-field.js';

import { Branch, Context, Commit, EntryResult } from '../types';
import { store, RootState } from '../../store';

import './branch-manager';
import './context-history';
import { getCheckoutAndContent } from '../state/checkout/actions';
import { selectCheckoutById } from '../state/checkout/selectors';
import { selectVersionControl, VersionControlState } from '../state/reducer';
import {
  selectContextBranches,
  selectContextById,
  selectDefaultBranch
} from '../state/context/selectors';
import { selectBranchHeadId } from '../state/branch/selectors';
import { getCommitAndContent } from '../state/commit/actions';
import { selectObjectFromCommit } from '../state/commit/selectors';
import { createBranch } from '../state/branch/actions';

@customElement('context-manager')
export class ContextManager extends connect(store)(LitElement) {
  @property({ type: String })
  public initialCheckoutId: string;

  @property({ type: String })
  public checkoutBranchId: string;

  @property({ type: Object })
  context: Context;

  @property({ type: Array })
  branches: Branch[];

  @property({ type: String })
  checkoutCommitId: string;

  @property({ type: Boolean })
  loading = true;

  @property({ type: Boolean })
  creatingBranch = false;

  render() {
    return html`
      ${this.loading
        ? html`
            <span>Loading context information...</span>
            <vaadin-progress-bar indeterminate value="0"></vaadin-progress-bar>
          `
        : html`
            <div style="display: flex; flex-direction: column">
              <branch-manager
                .branches=${this.branches}
                .selectedBranchId=${this.checkoutBranchId}
                @branch-selected=${e =>
                  this.checkoutBranchAndDispatch(e.detail.branchId)}
                @create-branch=${e => this.createBranch(e.detail.branchName)}
              ></branch-manager>

              ${this.creatingBranch
                ? html`
                    <span>Creating branch...</span>
                    <vaadin-progress-bar
                      indeterminate
                      value="0"
                    ></vaadin-progress-bar>
                  `
                : html``}

              <context-history
                .context=${this.context}
                .branches=${this.branches}
                .checkoutCommitId=${this.checkoutCommitId}
                @checkout-commit=${e =>
                  this.checkoutCommitAndDispatch(e.detail.commitId)}
              ></context-history>
            </div>
          `}
    `;
  }

  protected firstUpdated() {
    this.loadCheckout();
  }

  loadCheckout() {
    this.loading = true;

    store.dispatch(getCheckoutAndContent(this.initialCheckoutId)).then(() => {
      this.entryLoaded();
      this.loading = false;
    });
  }

  update(changedProperties) {
    // Don't forget this or your element won't render!
    super.update(changedProperties);
    if (changedProperties.get('initialCheckoutId')) {
      this.loadCheckout();
    }
  }

  entryLoaded() {
    const state: VersionControlState = selectVersionControl(<RootState>(
      store.getState()
    ));
    const checkoutEntryResult: EntryResult = selectCheckoutById(
      this.initialCheckoutId
    )(state);

    if (!checkoutEntryResult) return;

    let contextId;
    let checkoutFn;
    switch (checkoutEntryResult.type) {
      case 'context':
        checkoutFn = (id: string) => this.checkoutContext(id);
        contextId = checkoutEntryResult.entry.id;
        break;
      case 'branch':
        checkoutFn = (id: string) => this.checkoutBranch(id);
        contextId = checkoutEntryResult.entry.context_address;
        break;
      case 'commit':
        checkoutFn = (id: string) => this.checkoutCommit(id);
        contextId = checkoutEntryResult.entry.context_address;
        break;
    }

    this.context = selectContextById(contextId)(state);
    this.branches = selectContextBranches(contextId)(state);
    checkoutFn(checkoutEntryResult.entry.id);
  }

  checkoutContext(contextId: string) {
    this.checkoutBranch(
      selectDefaultBranch(contextId)(
        selectVersionControl(<RootState>store.getState())
      ).id
    );
  }

  checkoutBranchAndDispatch(branchId: string) {
    this.checkoutBranch(branchId);
    this.dispatchEvent(
      new CustomEvent('branch-checkout', {
        detail: { branchId: branchId }
      })
    );
  }

  checkoutBranch(branchId: string) {
    this.checkoutCommit(
      selectBranchHeadId(branchId)(
        selectVersionControl(<RootState>store.getState())
      )
    );
  }

  checkoutCommitAndDispatch(commitId: string) {
    this.checkoutCommit(commitId);
    this.dispatchEvent(
      new CustomEvent('commit-checkout', {
        detail: { commitId: commitId }
      })
    );
  }

  checkoutCommit(commitId: string) {
    this.checkoutCommitId = commitId;

    this.dispatchSelectedEntry(null);

    store.dispatch(getCommitAndContent(commitId)).then(() => {
      const object = selectObjectFromCommit(commitId)(
        selectVersionControl(<RootState>store.getState())
      );

      this.dispatchSelectedEntry(object.data);
    });
  }

  createBranch(branchName: string) {
    this.creatingBranch = true;

    store
      .dispatch(
        createBranch.create({
          commit_address: this.checkoutCommitId,
          name: branchName
        })
      )
      .then(() => {
        this.creatingBranch = false;
        this.loadCheckout();
      });
  }

  dispatchSelectedEntry(entryId: string) {
    const event = new CustomEvent('entry-selected', {
      detail: {
        entryId: entryId
      }
    });
    this.dispatchEvent(event);
  }
}
