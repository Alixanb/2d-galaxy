import { render } from 'preact';
import { DocsApp } from './DocsApp';

const root = document.getElementById('docs-root');
if (root) {
  render(<DocsApp />, root);
}
