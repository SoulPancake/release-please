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

import {ChangelogNotes, BuildNotesOptions} from '../changelog-notes';
import {ConventionalCommit} from '../commit';

const DEFAULT_HOST = 'https://github.com';

/**
 * Keep a Changelog (https://keepachangelog.com/en/1.1.0/) sections.
 * These are the standard categories defined by the KaC convention.
 */
export enum KaCSection {
  Added = 'Added',
  Changed = 'Changed',
  Deprecated = 'Deprecated',
  Removed = 'Removed',
  Fixed = 'Fixed',
  Security = 'Security',
}

/**
 * Default mapping from conventional commit types to Keep a Changelog sections.
 */
const DEFAULT_TYPE_TO_SECTION: Record<string, KaCSection> = {
  feat: KaCSection.Added,
  fix: KaCSection.Fixed,
  perf: KaCSection.Changed,
  deps: KaCSection.Changed,
  revert: KaCSection.Removed,
  docs: KaCSection.Changed,
  style: KaCSection.Changed,
  chore: KaCSection.Changed,
  refactor: KaCSection.Changed,
  test: KaCSection.Changed,
  build: KaCSection.Changed,
  ci: KaCSection.Changed,
  security: KaCSection.Security,
  deprecate: KaCSection.Deprecated,
};

/**
 * Options for the Keep a Changelog notes builder.
 */
export interface KeepAChangelogNotesOptions {
  /**
   * Custom mapping from conventional commit types to KaC sections.
   * If provided, this overrides the default mapping for the specified types.
   */
  typeToSection?: Record<string, KaCSection>;
}

/**
 * Changelog notes builder following the Keep a Changelog convention.
 * See https://keepachangelog.com/en/1.1.0/
 *
 * Maps conventional commit types to KaC sections:
 *   - feat -> Added
 *   - fix -> Fixed
 *   - perf, deps, docs, style, chore, refactor, test, build, ci -> Changed
 *   - revert -> Removed
 *   - security -> Security
 *   - deprecate -> Deprecated
 *
 * Breaking changes are listed under a separate "BREAKING CHANGES" section.
 */
export class KeepAChangelogNotes implements ChangelogNotes {
  private typeToSection: Record<string, KaCSection>;

  constructor(options: KeepAChangelogNotesOptions = {}) {
    this.typeToSection = {
      ...DEFAULT_TYPE_TO_SECTION,
      ...(options.typeToSection || {}),
    };
  }

  async buildNotes(
    commits: ConventionalCommit[],
    options: BuildNotesOptions
  ): Promise<string> {
    const host = options.host || DEFAULT_HOST;
    const sections: Record<string, string[]> = {};
    const breakingChanges: string[] = [];

    // Use changelogSections mapping if provided in options
    const customTypeToSection: Record<string, KaCSection> | undefined =
      options.changelogSections
        ? this.buildCustomTypeToSection(options.changelogSections)
        : undefined;

    for (const commit of commits) {
      const entry = this.formatCommitEntry(commit, host, options);

      // Collect breaking changes
      if (commit.breaking) {
        for (const note of commit.notes) {
          if (note.title === 'BREAKING CHANGE') {
            breakingChanges.push(`- ${htmlEscape(note.text)}`);
          }
        }
      }

      // Determine the KaC section for this commit type
      const section = customTypeToSection
        ? customTypeToSection[commit.type]
        : this.typeToSection[commit.type];

      // Skip commits whose type is not mapped, or that are hidden via
      // changelogSections
      if (!section) {
        continue;
      }

      if (options.changelogSections) {
        const found = options.changelogSections.find(
          s => s.type === commit.type
        );
        if (found?.hidden) {
          continue;
        }
      }

      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(entry);
    }

    // Build the final notes string
    const lines: string[] = [];
    const date = new Date().toLocaleDateString('en-CA');
    lines.push(`## [${options.version}] - ${date}`);

    // Breaking changes first
    if (breakingChanges.length > 0) {
      lines.push('');
      lines.push('### BREAKING CHANGES');
      lines.push('');
      for (const change of breakingChanges) {
        lines.push(change);
      }
    }

    // Ordered KaC sections
    const sectionOrder: KaCSection[] = [
      KaCSection.Added,
      KaCSection.Changed,
      KaCSection.Deprecated,
      KaCSection.Removed,
      KaCSection.Fixed,
      KaCSection.Security,
    ];

    for (const section of sectionOrder) {
      if (sections[section] && sections[section].length > 0) {
        lines.push('');
        lines.push(`### ${section}`);
        lines.push('');
        for (const entry of sections[section]) {
          lines.push(entry);
        }
      }
    }

    // Append version comparison reference links (KaC convention)
    lines.push('');
    const versionLink = options.previousTag
      ? `[${options.version}]: ${host}/${options.owner}/${options.repository}/compare/${options.previousTag}...${options.currentTag}`
      : `[${options.version}]: ${host}/${options.owner}/${options.repository}/releases/tag/${options.currentTag}`;
    lines.push(
      `[unreleased]: ${host}/${options.owner}/${options.repository}/compare/${options.currentTag}...HEAD`
    );
    lines.push(versionLink);

    return lines.join('\n');
  }

  /**
   * Build a custom type to section mapping from changelogSections config.
   * Maps section names to KaC sections by matching section display names.
   */
  private buildCustomTypeToSection(
    changelogSections: {type: string; section: string; hidden?: boolean}[]
  ): Record<string, KaCSection> {
    const sectionNameToKaC: Record<string, KaCSection> = {
      features: KaCSection.Added,
      added: KaCSection.Added,
      'bug fixes': KaCSection.Fixed,
      fixed: KaCSection.Fixed,
      'performance improvements': KaCSection.Changed,
      changed: KaCSection.Changed,
      dependencies: KaCSection.Changed,
      reverts: KaCSection.Removed,
      removed: KaCSection.Removed,
      documentation: KaCSection.Changed,
      styles: KaCSection.Changed,
      'miscellaneous chores': KaCSection.Changed,
      'code refactoring': KaCSection.Changed,
      tests: KaCSection.Changed,
      'build system': KaCSection.Changed,
      'continuous integration': KaCSection.Changed,
      deprecated: KaCSection.Deprecated,
      security: KaCSection.Security,
    };

    const mapping: Record<string, KaCSection> = {};
    for (const cs of changelogSections) {
      // Check if the section name maps to a KaC section
      const kacSection = sectionNameToKaC[cs.section.toLowerCase()];
      if (kacSection) {
        mapping[cs.type] = kacSection;
      } else {
        // Fall back to the default type mapping
        if (this.typeToSection[cs.type]) {
          mapping[cs.type] = this.typeToSection[cs.type];
        }
      }
    }
    return mapping;
  }

  private formatCommitEntry(
    commit: ConventionalCommit,
    host: string,
    options: BuildNotesOptions
  ): string {
    const scope = commit.scope ? `**${commit.scope}:** ` : '';
    const message = htmlEscape(commit.bareMessage);

    // Build the PR/commit link
    let link = '';
    if (commit.pullRequest?.number) {
      link = ` ([#${commit.pullRequest.number}](${host}/${options.owner}/${options.repository}/pull/${commit.pullRequest.number}))`;
    } else if (commit.sha) {
      const shortSha = commit.sha.substring(0, 7);
      link = ` ([${shortSha}](${host}/${options.owner}/${options.repository}/commit/${commit.sha}))`;
    }

    return `- ${scope}${message}${link}`;
  }
}

function htmlEscape(message: string): string {
  return message.replace(/``[^`].*[^`]``|`[^`]*`|<|>/g, match =>
    match.length > 1 ? match : match === '<' ? '&lt;' : '&gt;'
  );
}
