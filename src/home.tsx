import { render } from 'preact';
import LandingPage from './ui/LandingPage';

const root = document.getElementById('landing-root');
if (root) {
  render(
    <LandingPage
      onStart={(mode, bh) => {
        window.location.href = `/simulation.html?mode=${mode}&bh=${bh}`;
      }}
    />,
    root,
  );
}
