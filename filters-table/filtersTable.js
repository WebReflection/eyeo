/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-present eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

const {wire} = hyperHTML;

const filtersTable = (view, filters, readOnly) => {

  if (view.classList.contains('filters-table')) return;
  view.classList.add('filters-table');

  const sort = {
    enabled: false,
    byEnabled(event) {
      event.preventDefault();
      sort.enabled = !sort.enabled;
      filters.sort((fa, fb) => {
        if (fa.enabled === fb.enabled) return 0;
        if (fa.enabled === sort.enabled) return -1;
        return 1;
      });
      update();
    },
    filter: '',
    byFilter(event) {
      event.preventDefault();
      sort.filter = sort.filter === 'asc' ? 'desc' : 'asc';
      const sorter = sort.filter === 'asc' ? 1 : -1;
      filters.sort((fa, fb) => fa.text < fb.text ? -sorter : sorter);
      update();
    },
    hits: '',
    byHits(event) {
      event.preventDefault();
      sort.hits = sort.hits === 'asc' ? 'desc' : 'asc';
      const sorter = sort.hits === 'asc' ? -1 : 1;
      filters.sort((fa, fb) => {
        if (fa.hits === fb.hits) return 0;
        return fa.hits < fb.hits ? -sorter : sorter;
      });
      update();
    },
    snail: '',
    bySnail(event) {
      event.preventDefault();
      sort.snail = sort.snail === '' ? '🐌' : '';
      const sorter = sort.snail === '' ? 1 : -1;
      filters.sort((fa, fb) => {
        if (fa.slow === fb.slow) return 0;
        return fa.slow < fb.slow ? -sorter : sorter;
      });
      update();
    }
  };

  const render = hyperHTML.bind(view);
  updateTable(render, sort, [getRow(readOnly, filters[0], 'tr', updateFilter)]);

  const tbody = view.querySelector('.tbody');
  const state = createState(view, filters.length);
  view.querySelector('.tbody').style.height = state.tbody.height + 'px';

  const scroll = createScroll(view, state);
  updateScrollHeight(scroll, state);

  scroll.addEventListener('scroll', event => {
    state.scroll.top = event.currentTarget.scrollTop;
    update();
  });

  // fix tab navigation
  view.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const activeElement = event.currentTarget.ownerDocument.activeElement;
      const tr = activeElement.closest('.tr');
      const visible = tr.parentNode.children;
      const indexOf = Array.prototype.indexOf;
      if (visible.length - indexOf.call(visible, tr) < 2) {
        state.scroll.top += state.tr.height;
        update();
        activeElement.focus();
      }
    }
  });

  // update state on scrolling
  view.addEventListener(
    'wheel',
    event => {
      event.preventDefault();
      // prevent race conditions between the blur event and the scroll
      const activeElement = view.ownerDocument.activeElement;
      if (activeElement && activeElement !== view.ownerDocument.body) {
        activeElement.blur();
        return;
      }
      const scroll = state.scroll;
      const top = Math.min(scroll.height, scroll.top + event.deltaY);
      scroll.top = Math.max(0, top);
      update();
    },
    {passive: false}
  );

  // first view
  update();

  mobileScroll(view, state, update);

  return {update, view};

  function update() {
    if (state.rows !== filters.length) {
      state.rows = filters.length;
      updateScrollHeight(scroll, state);
    }
    const newList = [];
    let count = 0;
    let i = Math.max(0, Math.floor(state.scroll.top / state.tr.height));
    while ((count * state.tr.height) < state.tbody.height) {
      const row = getRow(
        readOnly,
        filters[i],
        count % 2 ? 'tr darker' : 'tr',
        updateFilter
      );
      newList[count] = row;
      count++;
      i++;
    }
    updateTable(render, sort, newList);
    view.scrollTop = state.scroll.top % state.tr.height;
    scroll.scrollTop = state.scroll.top;
    // fix possible tbody offset
    if (tbody.scrollTop) tbody.scrollTop = 0;
  }

  function updateFilter(filter, event) {
    const p = event.currentTarget;
    const newText = p.textContent.trim();
    const oldText = p.dataset.text;
    if (newText !== oldText) {
      const tbody = p.closest('.tbody');
      if (newText.length) {
        filter.text = newText;
        p.dataset.text = newText;
      } else {
        filters.splice(filters.indexOf(filter), 1);
      }
      updateScrollHeight(scroll, state);
      update();
    }
  }

};

const createFilterEvents = (filter, update) => ({
  onchange(event) {
    filter.enabled = event.currentTarget.checked;
  },
  onblur(event) {
    const p = event.currentTarget;
    const tr = p.closest('.tr');
    delete p.dataset.before;
    if (tr.dataset.invalid === 'false') {
      update(filter, event);
    } else {
      tr.dataset.invalid = false;
      p.textContent = p.dataset.text;
    }
  },
  onfocus(event) {
  },
  onkeydown(event) {
    const p = event.currentTarget;
    switch (event.key) {
      case 'Escape':
      case 'Enter':
        event.preventDefault();
        event.currentTarget.blur();
        break;
      default:
        const tr = p.closest('.tr');
        const text = p.textContent.trim();
        tr.dataset.invalid = !isValidText(text);
        break;
    }
  }
});

const createScroll = (view, state) => {
  const {top, left, width} = view.getBoundingClientRect();
  return view.parentNode.insertBefore(wire()`
    <div
      class=filters-table-scrollbar
      style=${[
        `top:${top + window.scrollY + state.thead.height}px`,
        `left:${left + width + window.scrollX}px`,
        `height:${state.tbody.height}px`
      ].join(';')}
    ><p /></div>`,
    view.nextSibling
  );
};

const createState = (view, rows) => {
  const theadHeight = view.querySelector('.thead').offsetHeight;
  return {
    rows,
    thead: {
      height: theadHeight
    },
    tbody: {
      height: view.offsetHeight - theadHeight
    },
    tr: {
      height: view.querySelector('.tbody .tr').offsetHeight
    },
    scroll: {
      top: view.scrollTop,
      height: 0
    }
  };
};

const filterEvents = new WeakMap;
const getRow = (readOnly, filter, className, updateFilter) => {
  if (filter) {
    let events = filterEvents.get(filter);
    if (!events) {
      events = createFilterEvents(filter, updateFilter);
      filterEvents.set(filter, events);
    }
    return wire(filter)`
      <div class=${className}>
        <p><input
          type=checkbox
          onchange=${events.onchange}
          checked=${filter.enabled}
        ></p>
        <p
          contenteditable=${!readOnly}
          data-text=${filter.text}
          onblur=${events.onblur}
          onfocus=${events.onfocus}
          onkeydown=${events.onkeydown}
        >${filter.text}</p>
        <p>${filter.slow}</p>
        <p>${filter.hits}</p>
      </div>`;
  }
  return wire()`<div class=${className}><p>&nbsp;</p></div>`;
};

const isValidText = () => Math.random() < .5;

const updateScrollHeight = (scroll, state) => {
  const height = ((state.rows + 1) * state.tr.height);
  state.scroll.height = height - state.tbody.height;
  scroll.firstChild.style.height = `${height}px`;
};

const updateTable = (render, sort, rows) => render`
  <div class="thead">
    <div class="tr">
      <p onclick=${sort.byEnabled}>${'Enabled'}</p>
      <p onclick=${sort.byFilter}>${'Filter rule'}</p>
      <p onclick=${sort.bySnail}>!</p>
      <p onclick=${sort.byHits}>${'Hits'}</p>
    </div>
  </div>
  <div class="tbody">
    ${rows}
  </div>`;

