import { LitElement, html, customElement, property } from 'lit-element';
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../../store';
import { createNote, getMyNotes } from '../state/actions';
import { Note } from '../types';

@customElement('note-list')
export class NoteList extends connect(store)(LitElement) {
  @property({type: Object})
  private notes: Array<Note>;

  render() {
    return html`
      <div>
        ${this.notes.map(note => html`
          <note-component .note="${note}"></note-component>
        `)}
      </div>
    `;
  }
  protected firstUpdated() {
    store.dispatch(
      getMyNotes.create({})
    );
  }

  stateChanged(state: RootState) {
    this.notes = state.notes.notes;
  }
}
