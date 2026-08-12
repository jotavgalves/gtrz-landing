(() => {
  document.addEventListener('contextmenu', event => event.preventDefault(), true);
  document.addEventListener('dragstart', event => {
    if (event.target?.closest?.('img,picture,svg,canvas,.svg-card')) event.preventDefault();
  }, true);
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 's') event.preventDefault();
  }, true);

  const lock = root => {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('img').forEach(img => {
      img.draggable = false;
      img.setAttribute('draggable', 'false');
    });
  };

  lock(document);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('img')) {
          node.draggable = false;
          node.setAttribute('draggable', 'false');
        }
        lock(node);
      }
    }
  }).observe(document.documentElement, { childList:true, subtree:true });
})();
