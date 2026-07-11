import fs from 'fs';
import path from 'path';

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk('./src', function(err, results) {
  if (err) throw err;
  
  // Create a map of lowercase path -> actual case path
  const fileMap = new Map();
  for (const file of results) {
    fileMap.set(file.toLowerCase(), file);
  }

  let hasMismatch = false;

  for (const file of results) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
    
    const content = fs.readFileSync(file, 'utf8');
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      let importPath = match[1];
      
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;
      
      let absoluteImportPath;
      if (importPath.startsWith('@/')) {
        absoluteImportPath = path.resolve('./src', importPath.slice(2));
      } else {
        absoluteImportPath = path.resolve(path.dirname(file), importPath);
      }

      // Check extensions
      let resolvedAbsPath = absoluteImportPath;
      let lowerResolvedAbsPath = resolvedAbsPath.toLowerCase();
      
      const exts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
      let foundLower = null;
      
      for (const ext of exts) {
        if (fileMap.has(lowerResolvedAbsPath + ext)) {
          foundLower = lowerResolvedAbsPath + ext;
          break;
        }
      }

      if (foundLower) {
        const actualCase = fileMap.get(foundLower);
        const expectedCase = resolvedAbsPath + (foundLower.slice(lowerResolvedAbsPath.length));
        
        if (actualCase !== expectedCase) {
          console.error(`Case mismatch in ${file}:\n  Imported: ${expectedCase}\n  Actual:   ${actualCase}`);
          hasMismatch = true;
        }
      }
    }
  }

  if (!hasMismatch) console.log("No case-sensitive import mismatches found!");
});
