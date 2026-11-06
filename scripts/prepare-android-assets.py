"""Copy the canonical web app into Android's packaged assets directory."""
from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[1]
target = root / 'Android/app/src/main/assets/www'
if target.exists():
    shutil.rmtree(target)
target.mkdir(parents=True)
for name in ['index.html','styles.css','app.js','manifest.webmanifest','service-worker.js','privacy.html','terms.html','PRIVACY.md','TERMS.md']:
    shutil.copy2(root / name, target / name)
for name in ['assets','core','storage','security','database']:
    shutil.copytree(root / name, target / name)
print(f'Android web assets refreshed: {target}')
