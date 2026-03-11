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

import {DefaultUpdater, UpdateOptions} from './default';

interface KeepAChangelogUpdaterOptions extends UpdateOptions {
  changelogEntry: string;
}

// Matches a KaC reference link line, e.g.: [unreleased]: https://...
// or [1.2.3]: https://...
const REFERENCE_LINK_RE = /^\[[\w.+-]+\]:\s+\S+/;

// Matches a KaC version or Unreleased header line, e.g.: ## [1.2.3] - date
// or ## [Unreleased]  — note the `m` flag for multiline matching.
const VERSION_HEADER_RE = /^## \[/m;

/**
 * Splits a `buildNotes()` output (which ends with reference link lines) into
 * the versioned section content and the reference links appended to it.
 */
function splitEntry(entry: string): {
  versionedContent: string;
  newLinks: string[];
} {
  const lines = entry.split('\n');
  // Find the first reference link line
  const linkStart = lines.findIndex(line => REFERENCE_LINK_RE.test(line));
  if (linkStart === -1) {
    return {versionedContent: entry.trim(), newLinks: []};
  }
  return {
    versionedContent: lines.slice(0, linkStart).join('\n').trim(),
    newLinks: lines.slice(linkStart).filter(l => REFERENCE_LINK_RE.test(l)),
  };
}

/**
 * Parses the existing CHANGELOG content into its structural parts.
 */
function parseExistingContent(content: string): {
  fileHeader: string;
  versionedSections: string;
  existingLinks: string[];
} {
  if (!content.trim()) {
    return {
      fileHeader: '# Changelog',
      versionedSections: '',
      existingLinks: [],
    };
  }

  const lines = content.split('\n');

  // Collect reference links from the bottom of the file
  let linkBoundary = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;
    if (REFERENCE_LINK_RE.test(trimmed)) {
      linkBoundary = i;
    } else {
      break;
    }
  }
  const existingLinks = lines
    .slice(linkBoundary)
    .filter(l => REFERENCE_LINK_RE.test(l.trim()));
  const mainLines = lines.slice(0, linkBoundary);
  const mainContent = mainLines.join('\n');

  // Split main content into file header and versioned sections
  const firstHeaderIdx = mainContent.search(VERSION_HEADER_RE);
  if (firstHeaderIdx === -1) {
    return {
      fileHeader: mainContent.trim(),
      versionedSections: '',
      existingLinks,
    };
  }

  const fileHeader = mainContent.slice(0, firstHeaderIdx).trim();

  // Grab all versioned sections (skip the [Unreleased] section — it becomes
  // empty after a new release is published)
  const versionsContent = mainContent.slice(firstHeaderIdx);
  // Remove the [Unreleased] block (header + everything until the next ## [x.y
  // or end-of-string)
  const withoutUnreleased = versionsContent
    .replace(/^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=## \[[\d]|$)/m, '')
    .trim();

  return {fileHeader, versionedSections: withoutUnreleased, existingLinks};
}

/**
 * Merges old and new reference links. New links override existing ones with
 * the same key. The resulting array is ordered: [unreleased] first, then the
 * rest sorted newest-to-oldest by the version key.
 */
function mergeLinks(existingLinks: string[], newLinks: string[]): string[] {
  const linkMap = new Map<string, string>();

  // Existing links first (lower priority)
  for (const link of existingLinks) {
    const m = link.match(/^\[([^\]]+)\]/);
    if (m) linkMap.set(m[1].toLowerCase(), link);
  }

  // New links override
  for (const link of newLinks) {
    const m = link.match(/^\[([^\]]+)\]/);
    if (m) linkMap.set(m[1].toLowerCase(), link);
  }

  // Build output: [unreleased] first, then version links newest-to-oldest
  const result: string[] = [];
  if (linkMap.has('unreleased')) {
    result.push(linkMap.get('unreleased')!);
    linkMap.delete('unreleased');
  }

  const versionLinks = Array.from(linkMap.values());
  versionLinks.sort((a, b) => {
    const aKey = (a.match(/^\[([^\]]+)\]/) ?? [])[1] ?? '';
    const bKey = (b.match(/^\[([^\]]+)\]/) ?? [])[1] ?? '';
    return bKey.localeCompare(aKey, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  result.push(...versionLinks);
  return result;
}

/**
 * A CHANGELOG file updater that produces output compliant with the
 * Keep a Changelog convention (https://keepachangelog.com/en/1.1.0/).
 *
 * Compared to the generic `Changelog` updater it:
 *  - Keeps an empty `## [Unreleased]` section at the top of every release.
 *  - Inserts the new versioned section directly below `[Unreleased]`.
 *  - Maintains version-comparison reference links at the bottom of the file.
 *
 * Use this updater together with the `keep-a-changelog` changelog-notes type.
 */
export class KeepAChangelogUpdater extends DefaultUpdater {
  changelogEntry: string;

  constructor(options: KeepAChangelogUpdaterOptions) {
    super(options);
    this.changelogEntry = options.changelogEntry;
  }

  updateContent(content: string | undefined): string {
    const {versionedContent, newLinks} = splitEntry(this.changelogEntry);
    const {fileHeader, versionedSections, existingLinks} = parseExistingContent(
      content ?? ''
    );

    const mergedLinks = mergeLinks(existingLinks, newLinks);

    const parts: string[] = [];

    // 1. File header (# Changelog + optional preamble)
    parts.push(fileHeader.trim() || '# Changelog');

    // 2. [Unreleased] placeholder for future changes
    parts.push('\n## [Unreleased]');

    // 3. New versioned section
    if (versionedContent) {
      parts.push('\n' + versionedContent);
    }

    // 4. Previously released sections
    if (versionedSections.trim()) {
      parts.push('\n' + versionedSections.trim());
    }

    // 5. Reference links
    if (mergedLinks.length > 0) {
      parts.push('\n' + mergedLinks.join('\n'));
    }

    return parts.join('\n') + '\n';
  }
}
