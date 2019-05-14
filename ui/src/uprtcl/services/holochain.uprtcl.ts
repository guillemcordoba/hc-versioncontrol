import {
  HolochainConnection,
  EntryResult
} from '../../services/holochain.connection';
import { Perspective, Commit, Context } from '../types';
import { UprtclService } from './uprtcl.service';
import { LinkResolver } from '../../services/resolver';

export class HolochainUprtcl implements UprtclService, LinkResolver {
  uprtclZome: HolochainConnection;

  constructor() {
    this.uprtclZome = new HolochainConnection('test-instance', 'uprtcl');
  }

  getEntry(entryId): Promise<EntryResult> {
    return this.uprtclZome
      .call('get_entry', { address: entryId })
      .then(entry => this.uprtclZome.parseEntryResult(entry));
  }

  getRootContext() {
    return this.uprtclZome
      .call('get_root_context', {})
      .then(result => result.entry);
  }

  getContextId(context: Context) {
    return this.uprtclZome.call('get_context_address', context);
  }

  getContext(contextId: string) {
    return this.getEntry(contextId).then(result => result.entry);
  }

  getPerspective(perspectiveId: string) {
    return Promise.all([
      this.getEntry(perspectiveId),
      this.uprtclZome.call('get_perspective_head', {
        perspective_address: perspectiveId
      })
    ]).then(([result, headAddress]: [EntryResult<Perspective>, string]) => {
      const perspective: Perspective = result.entry;
      perspective.head = headAddress;
      return perspective;
    });
  }

  getCommit(commitId: string) {
    return this.getEntry(commitId).then(result => result.entry);
  }

  getContextPerspectives(contextId: string) {
    return this.uprtclZome.call('get_context_perspective', {
      context_address: contextId
    });
  }

  createContext(): Promise<string> {
    return this.uprtclZome.call('create_context', { timestamp: Date.now() });
  }

  createPerspective(
    contextId: string,
    commitId: string,
    name: string
  ): Promise<string> {
    return this.uprtclZome.call('create_perspective', {
      context_address: contextId,
      commit_address: commitId,
      name: name
    });
  }

  createPerspectiveAndContent(
    context: Context,
    name: string,
    commit: Commit
  ): Promise<string> {
    return this.uprtclZome.call('create_perspective_and_content', {
      context_address: context,
      name: name,
      commit_address: commit
    });
  }

  createCommit(
    perspectiveId: string,
    message: string,
    contentAddress: string
  ): Promise<string> {
    return this.uprtclZome.call('create_commit', {
      perspective_address: perspectiveId,
      message: message,
      timestamp: Date.now(),
      content_address: contentAddress
    });
  }

  resolve(link: string) {
    return this.getEntry(link).then(result => result.entry);
  }
}
