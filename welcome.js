(() => {
  const key = 'common-wealth-welcome-v1';
  const help = document.createElement('button');
  help.id = 'atlasHelp';
  help.textContent = 'About & help';
  document.querySelector('header').append(help);
  const dialog = document.createElement('dialog');
  dialog.id = 'atlasWelcome';
  dialog.setAttribute('aria-labelledby', 'atlasWelcomeTitle');
  dialog.innerHTML = `
    <button class="welcome-close" autofocus aria-label="Close introduction">×</button>
    <p class="welcome-eyebrow">COMMON WEALTH · 1820–2025</p>
    <h1 id="atlasWelcomeTitle">Two centuries.<br>One shared world.</h1>
    <p class="welcome-lead">Explore how economies, living conditions, governments and conflicts changed across the world—through a map and a shared timeline.</p>
    <ol class="welcome-steps">
      <li><strong>Choose a year</strong><span>Move the timeline at the bottom. Countries, indicators and connections follow the selected year.</span></li>
      <li><strong>Move closer</strong><span>Drag to explore. Pinch with two fingers on a phone, or scroll or use + / − to zoom. More country labels and measures appear as there is room. Switch between Globe and Map at any time.</span></li>
      <li><strong>Click to discover</strong><span>Click a country or indicator for values, explanations and sources. Choose “Compare this measure across countries” to show just that measure as you pan. Explore trade partners and war opponents through their map connections.</span></li>
      <li><strong>Compare groups</strong><span>Choose Compare groups to build up to five country groups and compare up to three measures. Pick countries on the map or search the list. Graphs follow the shared year or playback interval and label partial coverage when some members lack compatible records.</span></li>
      <li><strong>Return to the map</strong><span>Close an explanation with ×. Click the map background or press Escape to leave a connection view and bring back the country labels.</span></li>
    </ol>
    <div class="welcome-evidence"><strong>Read the evidence, not just the number.</strong><p>Coverage varies by place and year. Estimates, interpolations, calculated values and older records are labeled; “not recorded” does not mean zero. Clicking a missing measure can jump the whole atlas to its next available record, with a notice showing the year change.</p><p>Check the explanation for dates, units and territory. Inflation-adjusted US dollars and purchasing-power international dollars are different measures.</p></div>
    <div class="welcome-footer"><label><input id="welcomeRemember" type="checkbox" checked> Don’t show this introduction again</label><button class="welcome-start">Explore the atlas <span aria-hidden="true">→</span></button></div>
    <p class="welcome-reminder">You can reopen this guide with About & help.</p><p class="welcome-reminder">A project by <a href="https://ammteclab.com/">AMM Tec Lab</a> · Aldo Mendes Martins. <a href="mailto:support@ammteclab.com">Contact support</a>.</p>`;
  document.body.append(dialog);
  let previousFocus;
  function open() {
    previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.welcome-close').focus({preventScroll: true});
    dialog.scrollTop = 0;
  }
  function close() {
    try {
      if (dialog.querySelector('#welcomeRemember').checked) localStorage.setItem(key, 'seen');
      else localStorage.removeItem(key);
    } catch (_) { /* The guide also works when browser storage is disabled. */ }
    dialog.close();
    (previousFocus instanceof HTMLElement && previousFocus !== document.body ? previousFocus : help).focus();
  }
  help.addEventListener('click', open);
  dialog.querySelector('.welcome-close').addEventListener('click', close);
  dialog.querySelector('.welcome-start').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('keydown', event => event.stopPropagation());
  let seen = false;
  try { seen = localStorage.getItem(key) === 'seen'; } catch (_) {}
  if (!seen) {
    if(window.AtlasEarlyMap)window.addEventListener('atlas:ready',event=>{
      // Do not interrupt someone who already started exploring the early map.
      if(!event.detail?.explored)open();
    },{once:true});
    else open();
  }
})();
