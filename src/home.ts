import LandingPage from "./ui/LandingPage";

const landing = new LandingPage();

landing.onStart = (mode, showBlackholes) => {
  window.location.href = `/simulation.html?mode=${mode}&bh=${showBlackholes}`;
};
