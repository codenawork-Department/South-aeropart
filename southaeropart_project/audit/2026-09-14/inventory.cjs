const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const source = files.filter(f => /\.(?:ts|tsx|js|jsx|mjs|cjs|json|ya?ml|toml|md|sql)$/.test(f));
const candidates = [];
const patterns = {
  privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  providerSecret: /\b(?:sk_live_|sk_test_|whsec_|ghp_|github_pat_)[A-Za-z0-9_]{24,}/,
  embeddedDbCredential: /postgres(?:ql)?:\/\/[^\s:'"/]+:[^\s@'"/]+@/,
};
for (const file of source) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  content.split(/\r?\n/).forEach((line, i) => {
    for (const [rule, pattern] of Object.entries(patterns)) {
      if (pattern.test(line)) candidates.push({ file, line: i + 1, rule,
        fixtureLike: /(?:dummy|placeholder|ci_mock|ci_test|postgrespassword|localhost|example|test_admin)/i.test(line) });
    }
  });
}
const inventory = {
  commit: execFileSync('git', ['rev-parse','HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  trackedFiles: files.length, textFilesScanned: source.length,
  actions: files.filter(f => /^apps\/[^/]+\/actions\/.*\.ts$/.test(f) && !/\.test\./.test(f)),
  routes: files.filter(f => /^apps\/.*\/route\.ts$/.test(f)),
  pages: files.filter(f => /^apps\/.*\/page\.tsx$/.test(f)),
  tests: files.filter(f => /\.(?:test|spec)\.[jt]sx?$/.test(f)),
  secretScan: { kind: 'Limited custom regex over tracked working files; not Gitleaks or history attestation',
    candidates, valuesRedacted: true },
};
fs.writeFileSync(path.join(__dirname, 'inventory.json'), JSON.stringify(inventory, null, 2));
console.log(JSON.stringify({ trackedFiles: files.length, textFilesScanned: source.length,
  actionFiles: inventory.actions.length, routeHandlers: inventory.routes.length,
  pages: inventory.pages.length, testFiles: inventory.tests.length, secretCandidates: candidates }, null, 2));
