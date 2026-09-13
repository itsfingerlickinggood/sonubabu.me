/* Progressive enhancement only: native links/disclosures remain the foundation. */
(() => {
  const root = document.documentElement;
  const sources = [...document.querySelectorAll('[data-index-dark]')];
  if (sources.length) {
    const update = () => {
      const media = root.dataset.theme === 'dark' ? 'all' : 'not all';
      sources.forEach(source => { if (source.media !== media) source.media = media; });
    };
    update();
    new MutationObserver(update).observe(root, {attributes: true, attributeFilter: ['data-theme']});
  }
  function revealNote() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const note = id ? document.getElementById(id) : null;
    if (!note?.classList.contains('learning-item')) return;
    note.open = true;
    note.querySelector('summary').focus({preventScroll: true});
    note.scrollIntoView({block: 'start', behavior: 'instant'});
  }
  revealNote();
  addEventListener('hashchange', revealNote);
})();
