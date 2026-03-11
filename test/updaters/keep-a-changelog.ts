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
import {KeepAChangelogUpdater} from '../../src/updaters/keep-a-changelog';
import {Version} from '../../src/version';

// A sample buildNotes() output for version 1.2.3 (with reference links)
const ENTRY_V123 = `## [1.2.3] - 2024-01-15

### Added

- some feature ([sha1](https://github.com/googleapis/java-asset/commit/sha1))

### Fixed

- some bugfix ([sha2](https://github.com/googleapis/java-asset/commit/sha2))

[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3`;

// A second entry for version 1.2.4
const ENTRY_V124 = `## [1.2.4] - 2024-02-01

### Added

- another feature ([sha3](https://github.com/googleapis/java-asset/commit/sha3))

[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.4...HEAD
[1.2.4]: https://github.com/googleapis/java-asset/compare/v1.2.3...v1.2.4`;

// A first-release entry (no previousTag → releases/tag link)
const ENTRY_FIRST = `## [1.0.0] - 2024-01-01

### Added

- initial commit ([abc1234](https://github.com/googleapis/java-asset/commit/abc1234))

[unreleased]: https://github.com/googleapis/java-asset/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/googleapis/java-asset/releases/tag/v1.0.0`;

describe('KeepAChangelogUpdater', () => {
  describe('updateContent', () => {
    it('creates a fresh CHANGELOG when none exists', () => {
      const updater = new KeepAChangelogUpdater({
        changelogEntry: ENTRY_V123,
        version: Version.parse('1.2.3'),
      });
      const result = updater.updateContent(undefined);
      // Should have the standard header
      expect(result).to.include('# Changelog');
      // Should have an [Unreleased] section
      expect(result).to.include('## [Unreleased]');
      // Should have the versioned section
      expect(result).to.include('## [1.2.3] - 2024-01-15');
      // Should have reference links at the bottom
      expect(result).to.include(
        '[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.3...HEAD'
      );
      expect(result).to.include(
        '[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3'
      );
      // [Unreleased] must appear before the versioned section
      expect(result.indexOf('## [Unreleased]')).to.be.lessThan(
        result.indexOf('## [1.2.3]')
      );
      // Reference links must appear after the versioned section
      expect(result.indexOf('[1.2.3]:')).to.be.greaterThan(
        result.indexOf('## [1.2.3]')
      );
    });

    it('creates a fresh CHANGELOG from an empty string', () => {
      const updater = new KeepAChangelogUpdater({
        changelogEntry: ENTRY_FIRST,
        version: Version.parse('1.0.0'),
      });
      const result = updater.updateContent('');
      expect(result).to.include('# Changelog');
      expect(result).to.include('## [Unreleased]');
      expect(result).to.include('## [1.0.0] - 2024-01-01');
      expect(result).to.include(
        '[1.0.0]: https://github.com/googleapis/java-asset/releases/tag/v1.0.0'
      );
    });

    it('inserts new version below [Unreleased] in an existing KaC CHANGELOG', () => {
      // Simulate a CHANGELOG that already has v1.2.3
      const existing = `# Changelog

## [Unreleased]

## [1.2.3] - 2024-01-15

### Added

- some feature ([sha1](https://github.com/googleapis/java-asset/commit/sha1))

[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3
`;
      const updater = new KeepAChangelogUpdater({
        changelogEntry: ENTRY_V124,
        version: Version.parse('1.2.4'),
      });
      const result = updater.updateContent(existing);

      // Only one [Unreleased] section
      const unreleasedCount = (result.match(/^## \[Unreleased\]/gm) ?? [])
        .length;
      expect(unreleasedCount).to.equal(1);

      // [Unreleased] is before both versions
      expect(result.indexOf('## [Unreleased]')).to.be.lessThan(
        result.indexOf('## [1.2.4]')
      );
      expect(result.indexOf('## [Unreleased]')).to.be.lessThan(
        result.indexOf('## [1.2.3]')
      );

      // New version appears before old version
      expect(result.indexOf('## [1.2.4]')).to.be.lessThan(
        result.indexOf('## [1.2.3]')
      );

      // [unreleased] link updated to point to v1.2.4
      expect(result).to.include(
        '[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.4...HEAD'
      );
      expect(result).to.not.include(
        '[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.3...HEAD'
      );

      // Both version links present
      expect(result).to.include(
        '[1.2.4]: https://github.com/googleapis/java-asset/compare/v1.2.3...v1.2.4'
      );
      expect(result).to.include(
        '[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3'
      );

      // Reference links appear after both versioned sections
      const linksIdx = result.indexOf('[unreleased]:');
      expect(linksIdx).to.be.greaterThan(result.indexOf('## [1.2.3]'));
    });

    it('handles a CHANGELOG without a pre-existing [Unreleased] section', () => {
      const existing = `# Changelog

## [1.2.3] - 2024-01-15

### Added

- some feature

[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3
`;
      const updater = new KeepAChangelogUpdater({
        changelogEntry: ENTRY_V124,
        version: Version.parse('1.2.4'),
      });
      const result = updater.updateContent(existing);

      expect(result).to.include('## [Unreleased]');
      expect(result).to.include('## [1.2.4]');
      expect(result).to.include('## [1.2.3]');
      // [Unreleased] first
      expect(result.indexOf('## [Unreleased]')).to.be.lessThan(
        result.indexOf('## [1.2.4]')
      );
    });

    it('preserves the file preamble (non-version header content)', () => {
      const existing = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.3] - 2024-01-15

### Added

- some feature

[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3
`;
      const updater = new KeepAChangelogUpdater({
        changelogEntry: ENTRY_V124,
        version: Version.parse('1.2.4'),
      });
      const result = updater.updateContent(existing);

      // The preamble text must be preserved
      expect(result).to.include(
        'All notable changes to this project will be documented in this file.'
      );
      expect(result).to.include(
        'and this project adheres to [Semantic Versioning]'
      );
    });

    it('keeps only one copy of each version link (deduplication)', () => {
      const existing = `# Changelog

## [Unreleased]

## [1.2.3] - 2024-01-15

### Added

- some feature

[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3
`;
      const updater = new KeepAChangelogUpdater({
        changelogEntry: ENTRY_V124,
        version: Version.parse('1.2.4'),
      });
      const result = updater.updateContent(existing);

      // Each key should appear exactly once
      const unreleasedLinkCount = (result.match(/^\[unreleased\]:/gm) ?? [])
        .length;
      const v124LinkCount = (result.match(/^\[1\.2\.4\]:/gm) ?? []).length;
      const v123LinkCount = (result.match(/^\[1\.2\.3\]:/gm) ?? []).length;
      expect(unreleasedLinkCount).to.equal(1);
      expect(v124LinkCount).to.equal(1);
      expect(v123LinkCount).to.equal(1);
    });

    it('orders reference links: [unreleased] first, then newest-to-oldest', () => {
      const existing = `# Changelog

## [Unreleased]

## [1.2.3] - 2024-01-15

### Added

- some feature

[unreleased]: https://github.com/googleapis/java-asset/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/googleapis/java-asset/compare/v1.2.2...v1.2.3
`;
      const updater = new KeepAChangelogUpdater({
        changelogEntry: ENTRY_V124,
        version: Version.parse('1.2.4'),
      });
      const result = updater.updateContent(existing);

      const unreleasedIdx = result.indexOf('[unreleased]:');
      const v124Idx = result.indexOf('[1.2.4]:');
      const v123Idx = result.indexOf('[1.2.3]:');

      expect(unreleasedIdx).to.be.lessThan(v124Idx);
      expect(v124Idx).to.be.lessThan(v123Idx);
    });

    it('works correctly for a changelog entry without reference links', () => {
      const entryWithoutLinks = `## [1.2.3] - 2024-01-15

### Added

- some feature`;
      const updater = new KeepAChangelogUpdater({
        changelogEntry: entryWithoutLinks,
        version: Version.parse('1.2.3'),
      });
      const result = updater.updateContent(undefined);
      expect(result).to.include('## [Unreleased]');
      expect(result).to.include('## [1.2.3] - 2024-01-15');
      expect(result).to.include('- some feature');
    });
  });
});
