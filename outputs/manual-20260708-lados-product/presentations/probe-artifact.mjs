import { pathToFileURL } from 'node:url';

const mod = await import(pathToFileURL('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs').href);

for (const name of ['Presentation', 'PresentationFile', 'Slide', 'Masters', 'PresentationTheme']) {
  const obj = mod[name];
  console.log('\n##', name, typeof obj);
  if (obj) {
    console.log('static', Object.getOwnPropertyNames(obj).slice(0, 80).join(', '));
    if (obj.prototype) console.log('proto', Object.getOwnPropertyNames(obj.prototype).slice(0, 120).join(', '));
  }
}

const p = mod.Presentation.create({ slideSize: { width: 1280, height: 720 } });
console.log('\nPresentation own keys:', Object.keys(p));
console.log('Presentation props:', Object.getOwnPropertyNames(p).join(', '));
console.log('masters prop:', p.masters);
console.log('theme:', p.theme);
for (const prop of ['masters', 'layouts', 'theme']) {
  const obj = p[prop];
  console.log(`\n## p.${prop}`, obj?.constructor?.name);
  if (obj) {
    console.log('own', Object.getOwnPropertyNames(obj).join(', '));
    console.log('proto', Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).join(', '));
  }
}
try {
  const m = p.masters.add({ name: 'Lados Master' });
  console.log('\nadded master', m, Object.getOwnPropertyNames(m), Object.getOwnPropertyNames(Object.getPrototypeOf(m)));
  console.log('master id', m.id, 'layouts', m.layouts, 'shapes', m.shapes, 'background', m.background);
} catch (e) {
  console.log('master add error', e.stack || e.message);
}
try {
  const l = p.layouts.add({ name: 'Lados Content' });
  console.log('\nadded layout', l, Object.getOwnPropertyNames(l), Object.getOwnPropertyNames(Object.getPrototypeOf(l)));
  console.log('layout id', l.id, 'shapes', l.shapes, 'background', l.background);
} catch (e) {
  console.log('layout add error', e.stack || e.message);
}
