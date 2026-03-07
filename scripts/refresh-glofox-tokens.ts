#!/usr/bin/env tsx
/**
 * Refresh all Glofox guest tokens and update src/config/api.ts with fresh values.
 *
 * Glofox guest tokens are obtained via a public login endpoint (no credentials needed).
 * Tokens typically last ~30 days. This script refreshes any that expire within 7 days.
 *
 * Run: yarn refresh:glofox
 */

import fs from 'node:fs';
import path from 'node:path';

// All Glofox branches that need token management
const GLOFOX_BRANCHES = [
  { configKey: 'loreBathingClub', branchId: '67c5eb09efb4277b06084eb6', name: 'Lore Bathing Club' },
  { configKey: 'wellnessSocialClub', branchId: '6769bc07dd963d1b0108804b', name: 'Wellness Social Club' },
] as const;

// Portal Minneapolis also uses a Glofox token
const PORTAL_GLOFOX_BRANCHES = [
  { branchId: '67d9d5a8c2dce5404b08ef68', name: 'Portal Minneapolis' },
] as const;

interface TokenResult {
  token: string;
  expiresAt: string;
}

async function fetchGlofoxGuestToken(branchId: string): Promise<TokenResult> {
  const res = await fetch('https://api.glofox.com/2.0/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-glofox-source': 'webportal' },
    body: JSON.stringify({ branch_id: branchId, login: 'GUEST', password: 'GUEST' }),
  });
  if (!res.ok) throw new Error(`Glofox guest login failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!data.token) throw new Error('Glofox guest login returned no token');

  // Decode JWT to get expiry
  const payload = JSON.parse(Buffer.from(data.token.split('.')[1], 'base64').toString());
  const expiresAt = new Date(payload.exp * 1000).toISOString().split('T')[0]; // YYYY-MM-DD

  return { token: data.token, expiresAt };
}

async function main() {
  const configPath = path.join(process.cwd(), 'src', 'config', 'api.ts');
  let configContent = fs.readFileSync(configPath, 'utf-8');
  let updated = 0;

  console.log('=== Refreshing Glofox guest tokens ===\n');

  // Refresh main Glofox venue tokens
  for (const branch of GLOFOX_BRANCHES) {
    try {
      const { token, expiresAt } = await fetchGlofoxGuestToken(branch.branchId);
      console.log(`  ${branch.name}: new token expires ${expiresAt}`);

      // Update token in config file
      const tokenRegex = new RegExp(
        `(${branch.configKey}:[\\s\\S]*?token:\\s*')([^']+)(')`
      );
      const expiryRegex = new RegExp(
        `(${branch.configKey}:[\\s\\S]*?tokenExpiry:\\s*')([^']+)(')`
      );

      if (tokenRegex.test(configContent)) {
        configContent = configContent.replace(tokenRegex, `$1${token}$3`);
        configContent = configContent.replace(expiryRegex, `$1${expiresAt}$3`);
        updated++;
      } else {
        console.warn(`  Could not find config entry for ${branch.configKey}`);
      }
    } catch (err) {
      console.error(`  Failed ${branch.name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Refresh Portal Minneapolis Glofox token
  for (const branch of PORTAL_GLOFOX_BRANCHES) {
    try {
      const { token, expiresAt } = await fetchGlofoxGuestToken(branch.branchId);
      console.log(`  ${branch.name}: new token expires ${expiresAt}`);

      // Update inline token in PORTAL_CONFIG.glofoxLocations
      const portalTokenRegex = new RegExp(
        `(branchId:\\s*'${branch.branchId}'[\\s\\S]*?token:\\s*')([^']+)(')`
      );
      const portalExpiryRegex = new RegExp(
        `(branchId:\\s*'${branch.branchId}'[\\s\\S]*?tokenExpiry:\\s*')([^']+)(')`
      );

      if (portalTokenRegex.test(configContent)) {
        configContent = configContent.replace(portalTokenRegex, `$1${token}$3`);
        configContent = configContent.replace(portalExpiryRegex, `$1${expiresAt}$3`);
        updated++;
      } else {
        console.warn(`  Could not find Portal config entry for ${branch.name}`);
      }
    } catch (err) {
      console.error(`  Failed ${branch.name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (updated > 0) {
    fs.writeFileSync(configPath, configContent, 'utf-8');
    console.log(`\n  Updated ${updated} token(s) in api.ts`);
  } else {
    console.log('\n  No tokens updated');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
