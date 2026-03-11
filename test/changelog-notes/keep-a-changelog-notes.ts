// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {describe, it} from 'mocha';
import {expect} from 'chai';
import {
  buildCommitFromFixture,
  buildMockCommit,
  safeSnapshot,
} from '../helpers';
import {
  KeepAChangelogNotes,
  KaCSection,
} from '../../src/changelog-notes/keep-a-changelog';
import {parseConventionalCommits} from '../../src/commit';
import {PullRequestBody} from '../../src/util/pull-request-body';
import {Version} from '../../src/version';

describe('KeepAChangelogNotes', () => {
  const commits = [
    {
      sha: 'sha1',
      message: 'feat: some feature',
      files: ['path1/file1.txt'],
      type: 'feat',
      scope: null,
      bareMessage: 'some feature',
      notes: [],
      references: [],
      breaking: false,
    },
    {
      sha: 'sha2',
      message: 'fix!: some bugfix',
      files: ['path1/file1.rb'],
      type: 'fix',
      scope: null,
      bareMessage: 'some bugfix',
      notes: [{title: 'BREAKING CHANGE', text: 'some bugfix'}],
      references: [],
      breaking: true,
    },
    {
      sha: 'sha3',
      message: 'docs: some documentation',
      files: ['path1/file1.java'],
      type: 'docs',
      scope: null,
      bareMessage: 'some documentation',
      notes: [],
      references: [],
      breaking: false,
    },
  ];
  describe('buildNotes', () => {
    const notesOptions = {
      owner: 'googleapis',
      repository: 'java-asset',
      version: '1.2.3',
      previousTag: 'v1.2.2',
      currentTag: 'v1.2.3',
      targetBranch: 'main',
    };
    it('should build default release notes', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(commits, notesOptions);
      expect(notes).to.be.a('string');
      safeSnapshot(notes);
    });
    it('should use KaC header format [version] - date', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(commits, notesOptions);
      expect(notes).to.match(/^## \[1\.2\.3\] - \d{4}-\d{2}-\d{2}/);
    });
    it('should include version comparison reference links', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(commits, notesOptions);
      expect(notes).to.include(
        '[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.3...HEAD'
      );
      expect(notes).to.include(
        '[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3'
      );
    });
    it('should use releases/tag link for first release (no previousTag)', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(commits, {
        ...notesOptions,
        previousTag: undefined,
      });
      expect(notes).to.include(
        '[1.2.3]: https://github.com/googleapis/java-asset/releases/tag/v1.2.3'
      );
      expect(notes).to.not.include('compare/v1.2.2...v1.2.3');
    });
    it('should group feat commits under Added', async () => {
      const featCommits = [
        {
          sha: 'sha1',
          message: 'feat: new feature',
          files: [],
          type: 'feat',
          scope: null,
          bareMessage: 'new feature',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(featCommits, notesOptions);
      expect(notes).to.include('### Added');
      expect(notes).to.include('- new feature');
    });
    it('should group fix commits under Fixed', async () => {
      const fixCommits = [
        {
          sha: 'sha1',
          message: 'fix: a bug',
          files: [],
          type: 'fix',
          scope: null,
          bareMessage: 'a bug',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(fixCommits, notesOptions);
      expect(notes).to.include('### Fixed');
      expect(notes).to.include('- a bug');
    });
    it('should group perf commits under Changed', async () => {
      const perfCommits = [
        {
          sha: 'sha1',
          message: 'perf: speed improvement',
          files: [],
          type: 'perf',
          scope: null,
          bareMessage: 'speed improvement',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(perfCommits, notesOptions);
      expect(notes).to.include('### Changed');
      expect(notes).to.include('- speed improvement');
    });
    it('should group revert commits under Removed', async () => {
      const revertCommits = [
        {
          sha: 'sha1',
          message: 'revert: undo something',
          files: [],
          type: 'revert',
          scope: null,
          bareMessage: 'undo something',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(
        revertCommits,
        notesOptions
      );
      expect(notes).to.include('### Removed');
      expect(notes).to.include('- undo something');
    });
    it('should handle BREAKING CHANGE notes', async () => {
      const breakingCommits = [
        {
          sha: 'sha2',
          message: 'fix: some bugfix',
          files: ['path1/file1.rb'],
          type: 'fix',
          scope: null,
          bareMessage: 'some bugfix',
          notes: [{title: 'BREAKING CHANGE', text: 'some bugfix'}],
          references: [],
          breaking: true,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(
        breakingCommits,
        notesOptions
      );
      expect(notes).to.include('### BREAKING CHANGES');
      expect(notes).to.include('- some bugfix');
      safeSnapshot(notes);
    });
    it('should handle commits with scope', async () => {
      const scopedCommits = [
        {
          sha: 'sha1',
          message: 'feat(core): scoped feature',
          files: [],
          type: 'feat',
          scope: 'core',
          bareMessage: 'scoped feature',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(
        scopedCommits,
        notesOptions
      );
      expect(notes).to.include('**core:** scoped feature');
    });
    it('should include commit sha links when no pull request', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(
        [
          {
            sha: 'abc1234567890',
            message: 'feat: some feature',
            files: [],
            type: 'feat',
            scope: null,
            bareMessage: 'some feature',
            notes: [],
            references: [],
            breaking: false,
          },
        ],
        notesOptions
      );
      expect(notes).to.include(
        '([abc1234](https://github.com/googleapis/java-asset/commit/abc1234567890))'
      );
    });
    it('should include pull request links when available', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(
        [
          {
            sha: 'sha1',
            message: 'feat: some feature',
            files: [],
            type: 'feat',
            scope: null,
            bareMessage: 'some feature',
            notes: [],
            references: [],
            breaking: false,
            pullRequest: {
              sha: 'sha1',
              number: 42,
              baseBranchName: 'main',
              headBranchName: 'feature-branch',
              title: 'some feature',
              body: '',
              labels: [],
              files: [],
            },
          },
        ],
        notesOptions
      );
      expect(notes).to.include(
        '([#42](https://github.com/googleapis/java-asset/pull/42))'
      );
    });
    it('should build with custom changelog sections', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(commits, {
        ...notesOptions,
        changelogSections: [
          {type: 'feat', section: 'Features'},
          {type: 'fix', section: 'Bug Fixes'},
          {type: 'docs', section: 'Documentation'},
        ],
      });
      expect(notes).to.be.a('string');
      safeSnapshot(notes);
    });
    it('should respect hidden changelog sections', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(
        [
          {
            sha: 'sha1',
            message: 'feat: visible feature',
            files: [],
            type: 'feat',
            scope: null,
            bareMessage: 'visible feature',
            notes: [],
            references: [],
            breaking: false,
          },
          {
            sha: 'sha2',
            message: 'chore: hidden chore',
            files: [],
            type: 'chore',
            scope: null,
            bareMessage: 'hidden chore',
            notes: [],
            references: [],
            breaking: false,
          },
        ],
        {
          ...notesOptions,
          changelogSections: [
            {type: 'feat', section: 'Features'},
            {type: 'chore', section: 'Miscellaneous Chores', hidden: true},
          ],
        }
      );
      expect(notes).to.include('visible feature');
      expect(notes).to.not.include('hidden chore');
    });
    it('should handle empty commits', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes([], notesOptions);
      expect(notes).to.match(/^## \[1\.2\.3\] - \d{4}-\d{2}-\d{2}/);
      expect(notes).to.include('[unreleased]:');
      expect(notes).to.include('[1.2.3]:');
    });
    it('should handle multiple commits in different sections', async () => {
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(commits, notesOptions);
      expect(notes).to.include('### Added');
      expect(notes).to.include('### Fixed');
      expect(notes).to.include('### Changed');
      expect(notes).to.include('### BREAKING CHANGES');
      safeSnapshot(notes);
    });
    it('should order sections according to KaC convention', async () => {
      const allSectionCommits = [
        {
          sha: 'sha1',
          message: 'feat: feature',
          files: [],
          type: 'feat',
          scope: null,
          bareMessage: 'feature',
          notes: [],
          references: [],
          breaking: false,
        },
        {
          sha: 'sha2',
          message: 'fix: bugfix',
          files: [],
          type: 'fix',
          scope: null,
          bareMessage: 'bugfix',
          notes: [],
          references: [],
          breaking: false,
        },
        {
          sha: 'sha3',
          message: 'perf: performance',
          files: [],
          type: 'perf',
          scope: null,
          bareMessage: 'performance',
          notes: [],
          references: [],
          breaking: false,
        },
        {
          sha: 'sha4',
          message: 'revert: reverted',
          files: [],
          type: 'revert',
          scope: null,
          bareMessage: 'reverted',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(
        allSectionCommits,
        notesOptions
      );

      const addedIdx = notes.indexOf('### Added');
      const changedIdx = notes.indexOf('### Changed');
      const removedIdx = notes.indexOf('### Removed');
      const fixedIdx = notes.indexOf('### Fixed');

      // Verify KaC section order: Added < Changed < Removed < Fixed
      expect(addedIdx).to.be.lessThan(changedIdx);
      expect(changedIdx).to.be.lessThan(removedIdx);
      expect(removedIdx).to.be.lessThan(fixedIdx);
    });
    it('should handle html tags', async () => {
      const htmlCommits = [
        {
          sha: 'sha1',
          message: 'feat: render all imagesets as <picture>',
          files: [],
          type: 'feat',
          scope: null,
          bareMessage: 'render all imagesets as <picture>',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(htmlCommits, notesOptions);
      expect(notes).to.include('&lt;picture&gt;');
      expect(notes).to.not.include('<picture>');
    });
    it('should handle html tags as inline code', async () => {
      const htmlCommits = [
        {
          sha: 'sha1',
          message:
            'feat: render all imagesets as <picture> `<picture>` `` `<picture>` ``',
          files: [],
          type: 'feat',
          scope: null,
          bareMessage:
            'render all imagesets as <picture> `<picture>` `` `<picture>` ``',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(htmlCommits, notesOptions);
      // Raw <picture> should be escaped
      expect(notes).to.include('&lt;picture&gt;');
      // `<picture>` in backticks should be preserved
      expect(notes).to.include('`<picture>`');
    });
    it('should allow custom type to section mapping', async () => {
      const changelogNotes = new KeepAChangelogNotes({
        typeToSection: {
          feat: KaCSection.Changed, // override: features are "Changed" not "Added"
        },
      });
      const notes = await changelogNotes.buildNotes(
        [
          {
            sha: 'sha1',
            message: 'feat: some feature',
            files: [],
            type: 'feat',
            scope: null,
            bareMessage: 'some feature',
            notes: [],
            references: [],
            breaking: false,
          },
        ],
        notesOptions
      );
      expect(notes).to.include('### Changed');
      expect(notes).to.not.include('### Added');
    });
    it('should skip unknown commit types', async () => {
      const unknownCommits = [
        {
          sha: 'sha1',
          message: 'unknown: mystery',
          files: [],
          type: 'unknown',
          scope: null,
          bareMessage: 'mystery',
          notes: [],
          references: [],
          breaking: false,
        },
      ];
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(
        unknownCommits,
        notesOptions
      );
      expect(notes).to.not.include('mystery');
    });
    describe('with commit parsing', () => {
      it('should handle a breaking change', async () => {
        const commits = [buildMockCommit('fix!: some bugfix')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          notesOptions
        );
        expect(notes).to.be.a('string');
        expect(notes).to.include('### BREAKING CHANGES');
        expect(notes).to.include('### Fixed');
        safeSnapshot(notes);
      });
      it('should handle a breaking change with reference', async () => {
        const commits = [buildMockCommit('fix!: some bugfix (#1234)')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          notesOptions
        );
        expect(notes).to.be.a('string');
        expect(notes).to.include('### BREAKING CHANGES');
        safeSnapshot(notes);
      });
      it('should parse multiple commit messages from a single commit', async () => {
        const commits = [buildCommitFromFixture('multiple-messages')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          notesOptions
        );
        expect(notes).to.be.a('string');
        safeSnapshot(notes);
      });
      it('should handle BREAKING CHANGE body', async () => {
        const commits = [buildCommitFromFixture('breaking-body')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          notesOptions
        );
        expect(notes).to.be.a('string');
        expect(notes).to.include('### BREAKING CHANGES');
        safeSnapshot(notes);
      });
      it('should handle inline bug links', async () => {
        const commits = [buildMockCommit('fix: some bugfix (#1234)')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          notesOptions
        );
        expect(notes).to.be.a('string');
        expect(notes).to.include('### Fixed');
        safeSnapshot(notes);
      });
      it('should handle git trailers', async () => {
        const commits = [buildCommitFromFixture('git-trailers-with-breaking')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          notesOptions
        );
        expect(notes).to.be.a('string');
        safeSnapshot(notes);
      });
      it('should handle meta commits', async () => {
        const commits = [buildCommitFromFixture('meta')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          notesOptions
        );
        expect(notes).to.be.a('string');
        safeSnapshot(notes);
      });
      it('handles Release-As footers', async () => {
        const commits = [buildCommitFromFixture('release-as')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          notesOptions
        );
        expect(notes).to.be.a('string');
        safeSnapshot(notes);
      });
      it('should allow customizing sections', async () => {
        const commits = [buildMockCommit('chore: some chore')];
        const changelogNotes = new KeepAChangelogNotes();
        const notes = await changelogNotes.buildNotes(
          parseConventionalCommits(commits),
          {
            ...notesOptions,
            changelogSections: [
              {type: 'chore', section: 'Miscellaneous Chores'},
            ],
          }
        );
        expect(notes).to.be.a('string');
        expect(notes).to.include('### Changed');
        safeSnapshot(notes);
      });
    });
  });
  describe('pull request compatibility', () => {
    it('should build parseable notes', async () => {
      const notesOptions = {
        owner: 'googleapis',
        repository: 'java-asset',
        version: '1.2.3',
        previousTag: 'v1.2.2',
        currentTag: 'v1.2.3',
        targetBranch: 'main',
      };
      const changelogNotes = new KeepAChangelogNotes();
      const notes = await changelogNotes.buildNotes(commits, notesOptions);
      const pullRequestBody = new PullRequestBody([
        {
          version: Version.parse('1.2.3'),
          notes,
        },
      ]);
      const pullRequestBodyContent = pullRequestBody.toString();
      const parsedPullRequestBody = PullRequestBody.parse(
        pullRequestBodyContent
      );
      expect(parsedPullRequestBody).to.not.be.undefined;
      expect(parsedPullRequestBody!.releaseData).lengthOf(1);
      expect(parsedPullRequestBody!.releaseData[0].version?.toString()).to.eql(
        '1.2.3'
      );
    });
  });
});
