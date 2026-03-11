exports['KeepAChangelogNotes buildNotes should build default release notes 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- some bugfix

### Added

- some feature ([sha1](https://github.com/googleapis/java-asset/commit/sha1))

### Changed

- some documentation ([sha3](https://github.com/googleapis/java-asset/commit/sha3))

### Fixed

- some bugfix ([sha2](https://github.com/googleapis/java-asset/commit/sha2))
`

exports['KeepAChangelogNotes buildNotes should handle BREAKING CHANGE notes 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- some bugfix

### Fixed

- some bugfix ([sha2](https://github.com/googleapis/java-asset/commit/sha2))
`

exports['KeepAChangelogNotes buildNotes should build with custom changelog sections 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- some bugfix

### Added

- some feature ([sha1](https://github.com/googleapis/java-asset/commit/sha1))

### Changed

- some documentation ([sha3](https://github.com/googleapis/java-asset/commit/sha3))

### Fixed

- some bugfix ([sha2](https://github.com/googleapis/java-asset/commit/sha2))
`

exports['KeepAChangelogNotes buildNotes should handle multiple commits in different sections 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- some bugfix

### Added

- some feature ([sha1](https://github.com/googleapis/java-asset/commit/sha1))

### Changed

- some documentation ([sha3](https://github.com/googleapis/java-asset/commit/sha3))

### Fixed

- some bugfix ([sha2](https://github.com/googleapis/java-asset/commit/sha2))
`

exports['KeepAChangelogNotes buildNotes with commit parsing should handle a breaking change 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- some bugfix

### Fixed

- some bugfix ([05670cf](https://github.com/googleapis/java-asset/commit/05670cf2e850beffe53bb2691f8701c7))
`

exports['KeepAChangelogNotes buildNotes with commit parsing should handle a breaking change with reference 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- some bugfix (#1234)

### Fixed

- some bugfix (#1234) ([749cd8b](https://github.com/googleapis/java-asset/commit/749cd8b9edc6103a2f40a34ca45c31c5))
`

exports['KeepAChangelogNotes buildNotes with commit parsing should parse multiple commit messages from a single commit 1'] = `
## [1.2.3] - 1983-10-10

### Added

- some feature ([2ec0e9b](https://github.com/googleapis/java-asset/commit/2ec0e9bc0ba7deaf762dae213667bf42))

### Fixed

- some bugfix ([2ec0e9b](https://github.com/googleapis/java-asset/commit/2ec0e9bc0ba7deaf762dae213667bf42))
`

exports['KeepAChangelogNotes buildNotes with commit parsing should handle BREAKING CHANGE body 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- this is actually a breaking change

### Added

- some feature ([78abf20](https://github.com/googleapis/java-asset/commit/78abf20625d3ff86d627b5c6e0cacd06))
`

exports['KeepAChangelogNotes buildNotes with commit parsing should handle inline bug links 1'] = `
## [1.2.3] - 1983-10-10

### Fixed

- some bugfix (#1234) ([6f2163b](https://github.com/googleapis/java-asset/commit/6f2163be093d8a8dd90232d06b45c07e))
`

exports['KeepAChangelogNotes buildNotes with commit parsing should handle git trailers 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- this is actually a breaking change

### Fixed

- some fix ([c538c97](https://github.com/googleapis/java-asset/commit/c538c973dc84b83ee6b699cf6433f0b3))
`

exports['KeepAChangelogNotes buildNotes with commit parsing should handle meta commits 1'] = `
## [1.2.3] - 1983-10-10

### BREAKING CHANGES

- for some reason this migration is breaking.

### Added

- **recaptchaenterprise:** migrate microgenerator ([3cf10aa](https://github.com/googleapis/java-asset/commit/3cf10aa5f94cd40a1d0d08e573eb737f))

### Fixed

- fixes bug #733 ([3cf10aa](https://github.com/googleapis/java-asset/commit/3cf10aa5f94cd40a1d0d08e573eb737f))
- **securitycenter:** fixes security center. ([3cf10aa](https://github.com/googleapis/java-asset/commit/3cf10aa5f94cd40a1d0d08e573eb737f))
`

exports['KeepAChangelogNotes buildNotes with commit parsing handles Release-As footers 1'] = `
## [1.2.3] - 1983-10-10
`

exports['KeepAChangelogNotes buildNotes with commit parsing should allow customizing sections 1'] = `
## [1.2.3] - 1983-10-10

### Changed

- some chore ([be1aa27](https://github.com/googleapis/java-asset/commit/be1aa271694db576f28f23da1df93519))
`
