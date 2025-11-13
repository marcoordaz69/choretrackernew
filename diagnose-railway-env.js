#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 RAILWAY ENVIRONMENT DIAGNOSTICS\n');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Check Node.js version
console.log('1️⃣ Node.js Version:');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' });
  console.log('   ✅', nodeVersion.trim());
} catch (error) {
  console.log('   ❌ Failed:', error.message);
}

// 2. Check current working directory
console.log('\n2️⃣ Current Working Directory:');
console.log('   ', process.cwd());

// 3. Check PATH environment variable
console.log('\n3️⃣ PATH Environment Variable:');
const pathDirs = process.env.PATH.split(':');
console.log('   Contains', pathDirs.length, 'directories:');
pathDirs.forEach((dir, i) => {
  if (dir.includes('node_modules')) {
    console.log(`   ${i + 1}. ${dir} ⭐ (node_modules)`);
  } else {
    console.log(`   ${i + 1}. ${dir}`);
  }
});

// 4. Check if node_modules/.bin exists and contains claude
console.log('\n4️⃣ Local node_modules/.bin/claude:');
const localClaudePath = path.join(process.cwd(), 'node_modules', '.bin', 'claude');
try {
  if (fs.existsSync(localClaudePath)) {
    const stats = fs.lstatSync(localClaudePath);
    console.log('   ✅ EXISTS');
    console.log('   Type:', stats.isSymbolicLink() ? 'Symbolic Link' : 'File');
    console.log('   Path:', localClaudePath);

    // Check if it's executable
    try {
      fs.accessSync(localClaudePath, fs.constants.X_OK);
      console.log('   Executable: ✅ YES');
    } catch {
      console.log('   Executable: ❌ NO');
    }

    // Try to resolve the symlink
    if (stats.isSymbolicLink()) {
      try {
        const target = fs.readlinkSync(localClaudePath);
        console.log('   Links to:', target);
        const targetPath = path.resolve(path.dirname(localClaudePath), target);
        console.log('   Resolved:', targetPath);
        console.log('   Target exists:', fs.existsSync(targetPath) ? '✅' : '❌');
      } catch (err) {
        console.log('   ❌ Failed to resolve symlink:', err.message);
      }
    }
  } else {
    console.log('   ❌ DOES NOT EXIST at:', localClaudePath);
  }
} catch (error) {
  console.log('   ❌ Error checking:', error.message);
}

// 5. Check if @anthropic-ai/claude-code package is installed
console.log('\n5️⃣ @anthropic-ai/claude-code Package:');
const packagePath = path.join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-code');
try {
  if (fs.existsSync(packagePath)) {
    console.log('   ✅ INSTALLED at:', packagePath);

    // Check for cli.js
    const cliPath = path.join(packagePath, 'cli.js');
    if (fs.existsSync(cliPath)) {
      console.log('   ✅ cli.js exists');

      // Check first line for shebang
      const firstLine = fs.readFileSync(cliPath, 'utf8').split('\n')[0];
      console.log('   Shebang:', firstLine);
    } else {
      console.log('   ❌ cli.js NOT FOUND');
    }

    // Read package.json
    const pkgJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      console.log('   Version:', pkg.version);
      console.log('   Bin:', JSON.stringify(pkg.bin, null, 2));
    }
  } else {
    console.log('   ❌ NOT INSTALLED');
  }
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

// 6. Try to run claude command using absolute path
console.log('\n6️⃣ Try Running Claude CLI (absolute path):');
try {
  const result = execSync(`"${localClaudePath}" --version 2>&1`, {
    encoding: 'utf8',
    timeout: 5000
  });
  console.log('   ✅ SUCCESS:');
  console.log('   ', result.trim());
} catch (error) {
  console.log('   ❌ FAILED:');
  console.log('   Exit code:', error.status);
  console.log('   Output:', error.stdout || error.stderr || error.message);
}

// 7. Try to run claude command from PATH
console.log('\n7️⃣ Try Running Claude CLI (from PATH):');
try {
  const result = execSync('claude --version 2>&1', {
    encoding: 'utf8',
    timeout: 5000
  });
  console.log('   ✅ SUCCESS:');
  console.log('   ', result.trim());
} catch (error) {
  console.log('   ❌ FAILED:');
  console.log('   Exit code:', error.status);
  console.log('   Output:', error.stdout || error.stderr || error.message);
}

// 8. Check ANTHROPIC_API_KEY
console.log('\n8️⃣ ANTHROPIC_API_KEY Environment Variable:');
if (process.env.ANTHROPIC_API_KEY) {
  const key = process.env.ANTHROPIC_API_KEY;
  // Show first and last 8 characters
  const masked = key.substring(0, 12) + '...' + key.substring(key.length - 8);
  console.log('   ✅ SET:', masked);
  console.log('   Length:', key.length, 'characters');
} else {
  console.log('   ❌ NOT SET');
}

// 9. Check which command finds claude
console.log('\n9️⃣ Which Command Finds Claude:');
try {
  const result = execSync('which claude 2>&1', { encoding: 'utf8' });
  console.log('   ✅', result.trim());
} catch (error) {
  console.log('   ❌ NOT FOUND in PATH');
}

// 10. List node_modules/@anthropic-ai contents
console.log('\n🔟 Contents of node_modules/@anthropic-ai:');
const anthropicDir = path.join(process.cwd(), 'node_modules', '@anthropic-ai');
try {
  if (fs.existsSync(anthropicDir)) {
    const contents = fs.readdirSync(anthropicDir);
    console.log('   Packages installed:', contents.join(', '));
  } else {
    console.log('   ❌ Directory does not exist');
  }
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ Diagnostic complete!');
