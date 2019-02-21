import { LitElement, html, customElement, property } from 'lit-element';
import { Document } from '../types';
import '@vaadin/vaadin-button/theme/material/vaadin-button.js';

@customElement('edit-document')
export class EditDocument extends LitElement {
  @property({ type: Object })
  public document: Document;

  documentContent: string;

  render() {
    return html`
      <div style="display: flex; flex-direction: column; flex: 1;">
        <textarea
          style="height: 300px;"
          .value=${this.document.content}
          @keyup="${e => (this.documentContent = e.target.value)}"
        ></textarea>
        <vaadin-button
          theme="contained"
          @click="${this.saveDocument}"
          ?disabled=${this.documentContent === null}
        >
          Save Changes
        </vaadin-button>
      </div>
    `;
  }

  saveDocument(event) {
    const saveDocument = new CustomEvent('save-document', {
      detail: {
        documentId: this.document.id,
        title: this.document.title,
        content: this.documentContent
      }
    });

    this.dispatchEvent(saveDocument);
  }
}
