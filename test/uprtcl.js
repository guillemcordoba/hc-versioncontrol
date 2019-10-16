// Utils variables to facilitate testing code
const {
  getEntry,
  buildPerspective,
  getContextPerspectives,
  getPerspectiveHead,
  updatePerspectiveHead,
  updatePerspectiveContext,
  createCommitInPerspective,
  createContextPerspectiveAndCommit,
  cloneCommit,
  clonePerspective,
  buildCommit,
  buildProof,
  getSourceName,
  parseEntryResult,
  CREATOR_ADDRESS
} = require('./utils');

const SAMPLE_ADDRESS1 = 'QmXA9hq87xLVqs4EgrzVZ5hRmaaiYUxpUB9J77GeQ5A2en';
const SAMPLE_ADDRESS2 = 'QmePeufDdo28ZcPnXhMJqCEEPPwDqq5yeqnCErQfd37UgE';

module.exports = scenario => {
  scenario(
    'create perspective with proxy addresses',
    async (s, t, { alice }) => {
      // Create perspective pointing proxy addresses
      const perspectiveAddress = await clonePerspective(
        buildPerspective('develop')
      )(alice);
      // Check that context has a perspective associated
      t.equal(perspectiveAddress.startsWith('Qm'), true);

      // Update perspective context
      let result = await updatePerspectiveContext(perspectiveAddress, 'proxy1')(
        alice
      );
      t.equal(Object.keys(result).includes('Ok'), true);

      // Update perspective head
      result = await updatePerspectiveHead(perspectiveAddress, 'proxy2')(alice);
      t.equal(Object.keys(result).includes('Ok'), true);
    }
  );

  scenario(
    'create two commits in master perspective',
    async (s, t, { alice }) => {
      // Create new context, perspective and commit
      const {
        context,
        perspectiveAddress,
        commitAddress
      } = await createContextPerspectiveAndCommit(
        'Commit message',
        SAMPLE_ADDRESS1,
        'master'
      )(alice);

      // Check that the context has one perspective named master
      const perspectives = await getContextPerspectives(context)(alice);
      t.equal(perspectives.length, 1);
      t.equal(perspectives[0].payload.name, 'master');

      const masterAddress = perspectives[0].id;

      // Check that the perspective points to the previously defined commit
      const perspectiveHead = await getPerspectiveHead(masterAddress)(alice);
      // ... and check the commit's structure
      const commitInfo = await getEntry(perspectiveHead)(alice);
      t.equal(commitInfo.payload.parentsIds.length, 0);
      t.equal(commitInfo.payload.creatorId, CREATOR_ADDRESS);
      t.equal(commitInfo.payload.dataId, SAMPLE_ADDRESS1);
      t.equal(commitInfo.payload.message, 'Commit message');

      // Create second commit
      const secondCommitAddress = await cloneCommit(
        buildCommit(SAMPLE_ADDRESS2, 'second commit', [commitAddress])
      )(alice);

      // Update perspective head
      await updatePerspectiveHead(masterAddress, secondCommitAddress)(alice);

      // Check that now master points to the new commit
      // Double call to avoid network synchronization issues
      let perspectiveHead2 = await getPerspectiveHead(masterAddress)(alice);
      perspectiveHead2 = await getPerspectiveHead(masterAddress)(alice);
      t.equal(perspectiveHead2, secondCommitAddress);

      // Check that parent commit of the second commit is the first commit
      const secondCommitInfo = await getEntry(secondCommitAddress)(alice);
      t.equal(secondCommitInfo.payload.parentsIds[0], perspectiveHead);
      // Check new commits content and its content is the new content
      t.equal(secondCommitInfo.payload.dataId, SAMPLE_ADDRESS2);
    }
  );

  scenario(
    'create a develop perspective and a commit in it',
    async (s, t, { alice }) => {
      // Create new context, perspective and commit
      const {
        context,
        perspectiveAddress,
        commitAddress
      } = await createContextPerspectiveAndCommit(
        'Commit message',
        SAMPLE_ADDRESS1,
        'master'
      )(alice);

      // Create another perspective pointing to the initial commit
      const developAddress = await clonePerspective(
        buildPerspective('develop')
      )(alice);

      const result = await updatePerspectiveContext(developAddress, context)(
        alice
      );
      t.equal(Object.keys(result).includes('Ok'), true);

      // Check perspective info
      const developPerspective = await getEntry(developAddress)(alice);
      t.equal(developPerspective.payload.name, 'develop');

      const perspectives = await getContextPerspectives(context)(alice);

      // Check that the context now has the two correct perspectives
      t.equal(perspectives[0].id, perspectiveAddress);
      t.equal(perspectives[1].id, developAddress);

      // Set perspective head
      await updatePerspectiveHead(developAddress, commitAddress)(alice);

      // Check that the newly created perspective points to the correct commit
      const perspectiveHead = await getPerspectiveHead(developAddress)(alice);
      t.equal(perspectiveHead, commitAddress);

      // Create second commit in the develop perspective
      const secondCommitAddress = await createCommitInPerspective(
        developAddress,
        'second commit',
        SAMPLE_ADDRESS2
      )(alice);

      // Check that master still points to the first commit
      const perspectiveHead2 = await getPerspectiveHead(perspectiveAddress)(
        alice
      );
      t.equal(perspectiveHead2, commitAddress);

      // Check that develop now points to the newly created commit
      const perspectiveHead3 = await getPerspectiveHead(developAddress)(alice);
      t.equal(perspectiveHead3, secondCommitAddress);
    }
  );
};
