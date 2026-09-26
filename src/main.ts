import './style.css';
import { requestPersistence } from './db';
import { addScreen } from './screens/add';
import { detailScreen } from './screens/detail';
import { listScreen } from './screens/list';
import { practiceScreen } from './screens/practice';

const root = document.getElementById('app')!;

async function route() {
  const [, page, id, mode] = location.hash.split('/');
  window.scrollTo(0, 0);
  try {
    if (page === 'add') await addScreen(root);
    else if (page === 'edit' && id) await addScreen(root, id);
    else if (page === 'poem' && id) await detailScreen(root, id);
    else if (page === 'practice' && id) await practiceScreen(root, id, mode === 'missed');
    else await listScreen(root);
  } catch (e) {
    root.textContent = `Something went wrong: ${(e as Error).message}`;
  }
}

window.addEventListener('hashchange', () => void route());
void requestPersistence();
void route();
