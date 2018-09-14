/* eslint-disable */(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

"use strict";

module.exports = {
  $: (selector, container = document) => container.querySelector(selector),
  $$: (selector, container = document) => container.querySelectorAll(selector),

  // basic copy and paste clipboard utility
  clipboard: {
    // warning: Firefox needs a proper event to work
    //          such click or mousedown or similar.
    copy(text)
    {
      const selection = document.getSelection();
      const selected = selection.rangeCount > 0 ?
                        selection.getRangeAt(0) : null;
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.cssText = "position:fixed;top:-999px";
      document.body.appendChild(el).select();
      document.execCommand("copy");
      document.body.removeChild(el);
      if (selected)
      {
        selection.removeAllRanges();
        // simply putting back selected doesn't work anymore
        const range = document.createRange();
        range.setStart(selected.startContainer, selected.startOffset);
        range.setEnd(selected.endContainer, selected.endOffset);
        selection.addRange(range);
      }
    },
    // optionally accepts a `paste` DOM event
    // it uses global clipboardData, if available, otherwise.
    // i.e. input.onpaste = event => console.log(dom.clipboard.paste(event));
    paste(event)
    {
      if (!event)
        event = window;
      const clipboardData = event.clipboardData || window.clipboardData;
      return clipboardData ? clipboardData.getData("text") : "";
    }
  },

  // helper to provide the relative coordinates
  // to the closest positioned containing element
  relativeCoordinates(event)
  {
    let el = event.currentTarget;
    let x = 0;
    let y = 0;
    do
    {
      x += el.offsetLeft - el.scrollLeft;
      y += el.offsetTop - el.scrollTop;
    } while (
      (el = el.offsetParent) &&
      !isNaN(el.offsetLeft) &&
      !isNaN(el.offsetTop)
    );
    return {x: event.pageX - x, y: event.pageY - y};
  }
};

},{}],2:[function(require,module,exports){
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

"use strict";

// Custom Elements ponyfill (a polyfill triggered on demand)
const customElementsPonyfill = require("document-register-element/pony");
if (typeof customElements !== "object")
  customElementsPonyfill(window);

// external dependencies
const {default: HyperHTMLElement} = require("hyperhtml-element/cjs");

// common DOM utilities exposed as IOElement.utils
const DOMUtils = {

  // boolean related operations/helpers
  boolean: {
    // utils.boolean.attribute(node, name, setAsTrue):void
    // set a generic node attribute name as "true"
    // if value is a boolean one or it removes the attribute
    attribute(node, name, setAsTrue)
    {
      // don't use `this.value(value)` with `this` as context
      // to make destructuring of helpers always work.
      // @example
      // const {attribute: setBoolAttr} = IOElement.utils.boolean;
      // setBoolAttr(node, 'test', true);
      if (DOMUtils.boolean.value(setAsTrue))
      {
        node.setAttribute(name, "true");
      }
      else
      {
        node.removeAttribute(name);
      }
    },

    // utils.boolean.value(any):boolean
    // it returns either true or false
    // via truthy or falsy values, but also via strings
    // representing "true", "false" as well as "0" or "1"
    value(value)
    {
      if (typeof value === "string" && value.length)
      {
        try
        {
          value = JSON.parse(value);
        }
        catch (error)
        {
          // Ignore invalid JSON to continue using value as string
        }
      }
      return !!value;
    }
  },

  event: {
    // returns true if it's a left click or a touch event.
    // The left mouse button value is 0 and this
    // is compatible with pointers/touch events
    // where `button` might not be there.
    isLeftClick(event)
    {
      const re = /^(?:click|mouse|touch|pointer)/;
      return re.test(event.type) && !event.button;
    }
  }
};

// provides a unique-id suffix per each component
let counter = 0;

// common Custom Element class to extend
class IOElement extends HyperHTMLElement
{
  // exposes DOM helpers as read only utils
  static get utils()
  {
    return DOMUtils;
  }

  // get a unique ID or, if null, set one and returns it
  static getID(element)
  {
    return element.getAttribute("id") || IOElement.setID(element);
  }

  // set a unique ID to a generic element and returns the ID
  static setID(element)
  {
    const id = `${element.nodeName.toLowerCase()}-${counter++}`;
    element.setAttribute("id", id);
    return id;
  }

  // lazily retrieve or define a custom element ID
  get id()
  {
    return IOElement.getID(this);
  }

  // whenever an element is created, render its content once
  created() { this.render(); }

  // by default, render is a no-op
  render() {}

  // usually a template would contain a main element such
  // input, button, div, section, etc.
  // having a simple way to retrieve such element can be
  // both semantic and handy, as opposite of using
  // this.children[0] each time
  get child()
  {
    let element = this.firstElementChild;
    // if accessed too early, will render automatically
    if (!element)
    {
      this.render();
      element = this.firstElementChild;
    }
    return element;
  }
}

// whenever an interpolation with ${{i18n: 'string-id'}} is found
// transform such value into the expected content
// example:
//  render() {
//    return this.html`<div>${{i18n:'about-abp'}}</div>`;
//  }
const {setElementText} = ext.i18n;
IOElement.intent("i18n", id =>
{
  const fragment = document.createDocumentFragment();
  setElementText(fragment, id);
  return fragment;
});

module.exports = IOElement;

},{"document-register-element/pony":8,"hyperhtml-element/cjs":9}],3:[function(require,module,exports){
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

"use strict";

require("./io-toggle");

const IOElement = require("./io-element");
const IOScrollbar = require("./io-scrollbar");
const {utils, wire} = IOElement;

const {$, $$} = require("./dom");

// <io-filter-list disabled />.{filters = [...]}
class IOFilterList extends IOElement
{
  get selected()
  {
    return this._selected || (this._selected = new Set());
  }

  set selected(value)
  {
    this._selected = new Set(value);
    this.render();
  }

  get defaultState()
  {
    return {
      infinite: false,
      contentEditable: false,
      filters: [],
      viewHeight: 0,
      rowHeight: 0,
      scrollTop: 0,
      scrollHeight: 0,
      tbody: null,
      sort: {
        status: false,
        rule: false,
        warning: false
      },
      sortMap: {
        status: "enabled",
        rule: "text",
        warning: "slow"
      }
    };
  }

  static get observedAttributes()
  {
    return ["disabled", "filters"];
  }

  get disabled()
  {
    return this.hasAttribute("disabled");
  }

  set disabled(value)
  {
    utils.boolean.attribute(this, "disabled", value);
    this.setState({contentEditable: !this.disabled});
  }

  get filters()
  {
    return this.state.filters || [];
  }

  set filters(value)
  {
    this.selected = [];
    // render one row only for the setup
    this.setState({
      infinite: false,
      filters: value.slice(0, 1)
    });
    // if filters have more than a row
    // prepare the table with a new state
    if (value.length)
    {
      setupTable.call(this);
      const tbody = $("tbody", this);
      const rowHeight = $("tr", tbody).clientHeight;
      const viewHeight = tbody.clientHeight;
      this.setState({
        infinite: true,
        contentEditable: !this.disabled,
        filters: value,
        scrollTop: tbody.scrollTop,
        scrollHeight: rowHeight * (value.length + 1) - viewHeight,
        viewHeight,
        rowHeight
      });
      // needed mostly for Firefox and Edge to have extra rows
      // reflecting the same weight of others
      this.style.setProperty("--row-height", `${rowHeight}px`);
      // setup the scrollbar size too
      this.scrollbar.size = rowHeight * value.length;
    }
  }

  created()
  {
    this.scrollbar = new IOScrollbar();
    this.scrollbar.direction = "vertical";
    this.scrollbar.addEventListener("scroll", () =>
    {
      const {position, range} = this.scrollbar;
      const {scrollHeight} = this.state;
      this.setState({
        scrollTop: scrollHeight * position / range
      });
    });
    this.addEventListener(
      "wheel",
      event =>
      {
        event.preventDefault();
        // prevent race conditions between the blur event and the scroll
        const activeElement = this.ownerDocument.activeElement;
        if (activeElement && activeElement !== this.ownerDocument.body)
        {
          activeElement.blur();
          return;
        }
        const {scrollHeight, scrollTop} = this.state;
        this.setState({
          scrollTop: Math.max(
            0,
            Math.min(scrollHeight, scrollTop + event.deltaY)
          )
        });
        // update the scrollbar position accordingly
        const {range} = this.scrollbar;
        this.scrollbar.position = this.state.scrollTop * range / scrollHeight;
      },
      {passive: false}
    );
  }

  scrollTo(row)
  {
    const {rowHeight} = this.state;
    this.setState({
      scrollTop: this.filters.findIndex(filter => filter === row) * rowHeight
    });
  }

  onheaderclick(event)
  {
    const th = event.target.closest("th");
    if (!utils.event.isLeftClick(event) || !th)
      return;
    const {info} = th.dataset;
    if (info === "remove")
      return;
    if (info === "selected")
    {
      this.selected = event.target.checked ? this.filters : [];
      return;
    }
    event.preventDefault();
    const {sort, sortMap} = this.state;
    sort[info] = !sort[info];
    const sorter = sort[info] ? 1 : -1;
    const property = sortMap[info];
    this.filters.sort((fa, fb) =>
    {
      if (fa[property] === fb[property])
        return 0;
      return fa[property] < fb[property] ? -sorter : sorter;
    });
    this.render();
    th.closest("thead").dataset.sort = info;
    th.closest("thead").dataset.dir = sort[info] ? "asc" : "desc";
  }

  onkeydown(event)
  {
    if (event.key === "Enter")
      event.preventDefault();
  }

  onkeyup(event)
  {
    const update = event.key === "Enter" || event.type === "blur";
    const {currentTarget} = event;
    if (update)
      currentTarget.blur();
    const text = currentTarget.textContent.trim();
    if (dispatch.call(this, "edit", text).defaultPrevented)
    {
      currentTarget.closest("tr").classList.add("invalid");
      return;
    }
    currentTarget.closest("tr").classList.remove("invalid");
    if (update)
    {
      const {title} = currentTarget;
      const filter = this.filters.find(item => item.text === title);
      filter.text = text;
      dispatch.call(this, "update", filter);
      this.render();
    }
  }

  onblur(event)
  {
    /*
    if (event.currentTarget.classList.contains("content"))
      event.currentTarget.contentEditable = false;
    */
    this.onkeyup(event);
  }

  onchange(event)
  {
    const el = event.currentTarget;
    const div = $('td[data-info="rule"] > .content', el.closest("tr"));
    const {textContent} = div;
    const {filters} = this;
    const filter = filters.find(item => item.text === textContent);
    switch (el.closest("td").dataset.info)
    {
      case "selected":
        if (this.selected.has(filter))
          this.selected.delete(filter);
        else
          this.selected.add(filter);
        break;
      case "status":
        filter.enabled = !filter.enabled;
        break;
    }
    this.render();
  }

  onmousedown(event)
  {
    $(".content", event.currentTarget).focus();
  }

  /*
  onrowevent(event)
  {
    this["onrow" + event.type](event);
  }

  onrowmousedown(event)
  {
    const tr = event.currentTarget;
    if (
      !utils.event.isLeftClick(event) ||
      tr.classList.contains("empty")
    )
      return;
    const td = event.target.closest("td");
    if (!td)
      return;
    const {info} = td.dataset;
    if (info === "status" || info === "selected")
      return;
    const div = $('td[data-info="rule"] > .content', td.parentNode);
    const {textContent} = div;
    const {filters} = this;
    const filter = filters.find(item => item.text === textContent);
    if (info === "remove")
    {
      dispatch.call(this, info, filter);
      filters.splice(filters.indexOf(filter), 1);
      updateScrollbar.call(this);
    }
    else if (info === "status")
    {
      dispatch.call(this, filter.enabled ? "disable" : "enable", filter);
      filter.enabled = !filter.enabled;
      this.render();
    }
    else if (info === "rule" && tr.classList.contains("selected"))
    {
      this.selected = [filter];
      this.render();
      div.contentEditable = true;
      div.focus();
    }
    else if (!tr.classList.contains("selected"))
    {
      if (event.shiftKey && this.selected.length)
      {
        const first = this.selected[0];
        let start = filters.indexOf(first);
        const end = filters.indexOf(filter);
        this.selected = [first];
        if (start < end)
        {
          while (start++ < end)
            this.selected.push(filters[start]);
        }
        else
        {
          while (start-- > end)
            this.selected.push(filters[start]);
        }
      }
      else
      {
        // drop all entries and put the current filter in
        this.selected = [filter];
      }
      this.render();
    }
  }
  */

  postRender(list)
  {
    const {tbody, scrollTop, rowHeight} = this.state;
    if (this.state.infinite)
    {
      tbody.scrollTop = scrollTop % rowHeight;
    }
    // keep growing the fake list until the tbody becomes scrollable
    else if (!tbody || tbody.scrollHeight <= tbody.clientHeight)
    {
      this.setState({
        tbody: tbody || $("tbody", this),
        filters: list.concat(Object.create(list[0] || {}))
      });
    }
  }

  render()
  {
    let list = this.state.filters;
    if (this.state.infinite)
    {
      list = [];
      const {rowHeight, scrollTop, viewHeight} = this.state;
      const length = this.state.filters.length;
      let count = 0;
      let i = Math.max(0, Math.floor(scrollTop / rowHeight));
      this._stripes = i % 2;
      // always add an extra row to make scrolling smooth
      while ((count * rowHeight) < (viewHeight + rowHeight))
      {
        list[count++] = i < length ? this.state.filters[i++] : null;
      }
    }
    this.html`<table cellpadding="0" cellspacing="0">
      <thead onclick="${this}" data-call="onheaderclick">
        <th data-info="selected"><input type="checkbox"></th>
        <th data-info="status">${{i18n: "options_filterList_column_status"}}</th>
        <th data-info="rule">${{i18n: "options_filter_list_rule"}}</th>
        <th data-info="warning">⚠</th>
      </thead>
      <tbody>${list.map(getRow, this)}</tbody>
    </table>
    ${this.scrollbar}`;
    this.postRender(list);
  }
}

IOFilterList.define("io-filter-list");

module.exports = IOFilterList;

// Please note: the contenteditable=${...} attribute
// cannot be set directly to the TD because of an ugly
// MS Edge b ug that does not allow TDs to be editable.
function getRow(filter, i)
{
  let className = ((this._stripes + i) % 2) ? "odd" : "even";
  if (filter)
  {
    const selected = this.selected.has(filter);
    if (selected)
      className += " selected";
    return wire(filter)`
    <tr class="${className}">
      <td data-info="selected">
        <input type="checkbox" checked="${selected}" onchange="${this}">
      </td>
      <td data-info="status">
        <io-toggle checked="${filter.enabled}" onchange="${this}" />
        ${filter.enabled ? "Active" : "Disabled"}
      </td>
      <td data-info="rule" onmousedown="${this}">
        <div
          class="content"
          contenteditable="${!this.disabled}"
          title="${filter.text}"
          onkeydown="${this}"
          onkeyup="${this}"
          onblur="${this}"
        >${filter.text}</div>
      </td>
      <td data-info="warning">
        ${getWarning(filter)}
      </td>
    </tr>`;
  }
  // no filter results into an empty, not editable, row
  return wire(this, `:${i}`)`
    <tr
      class="${className + " empty"}"
    >
      <td data-info="selected"></td>
      <td data-info="status"></td>
      <td data-info="rule"></td>
      <td data-info="warning"></td>
    </tr>`;
}

const snails = new WeakMap();
const createSnail = (filter) =>
{
  /*
  const snail = wire()`
    <img src="skin/icons/snail.svg" title="${filter.slow}">`;
  */
  const snail = document.createTextNode("⚠");
  snails.set(filter, snail);
  return snail;
};
function getWarning(filter)
{
  switch (filter.slow)
  {
    case "🐌":
    case "!":
      return snails.get(filter) || createSnail(filter);
    default:
      return "";
  }
}

function dispatch(info, detail)
{
  const event = new CustomEvent(`filter:${info}`, {
    detail,
    bubbles: true,
    cancelable: true
  });
  this.dispatchEvent(event);
  return event;
}

/*
  to have a scrollable body, thead and tbody are set
  as display: block, detaching their auto table alignment
  so that this helper would set each header TH size accordingly
 */
function setupTable()
{
  const table = $("table", this);
  const THs = $$("thead th", this);
  const TDs = $$("tbody tr:first-child td", table);
  const size = [];
  THs.forEach((th, i) =>
  {
    table.style.setProperty(`--width-${th.dataset.info}`, "auto");
    size[i] = Math.max(th.clientWidth, TDs[i].clientWidth);
  });
  THs.forEach((th, i) =>
  {
    if (th.dataset.info === "rule")
    {
      size[i] = table.clientWidth -
                size.reduce((total, current) => total + current, -size[i]);
    }
    table.style.setProperty(`--width-${th.dataset.info}`, `${size[i]}px`);
  });
  table.classList.add("visible");
}

function updateScrollbar()
{
  const {rowHeight, viewHeight} = this.state;
  const {length} = this.filters;
  this.scrollbar.size = rowHeight * length;
  this.setState({
    scrollHeight: rowHeight * (length + 1) - viewHeight
  });
}

},{"./dom":1,"./io-element":2,"./io-scrollbar":6,"./io-toggle":7}],4:[function(require,module,exports){
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

"use strict";

const IOElement = require("./io-element");

const {$} = require("./dom");

// this component simply emits filter:add(text)
// and filter:match({accuracy, filter}) events
class IOFilterSearch extends IOElement
{
  static get booleanAttributes() { return ["disabled"]; }

  static get observedAttributes() { return ["match"]; }

  get defaultState() { return {filterExists: true, filters: [], match: -1}; }

  get filters() { return this.state.filters; }

  // filters are never modified or copied
  // but used to find out if one could be added
  // or if the component in charge should show the found one
  set filters(value) { this.setState({filters: value || []}); }

  get match() { return this.state.match; }

  // match is a number between -1 and 1
  // -1 means any match
  // 1 means exact match
  // 0 means match disabled => no filter:match event ever
  set match(value)
  {
    this.setState({
      match: Math.max(-1, Math.min(1, parseFloat(value) || 0))
    }, false);
  }

  get value() { return $("input", this).value.trim(); }

  set value(text)
  {
    const value = String(text || "").trim();
    $("input", this).value = value;
    this.setState({
      filterExists: value.length ?
                      this.state.filters.some(hasValue, value) :
                      false
    });
  }

  attributeChangedCallback(name, previous, current)
  {
    if (name === "match")
      this.match = current;
    else
      this.render();
  }

  created()
  {
    const {i18n} = browser;
    this._placeholder = i18n.getMessage("options_filters_search_or_add");
    this._timer = 0;
    this.render();
  }

  onclick()
  {
    if (this.value)
      dispatch.call(this, "filter:add", this.value);
  }

  ondrop(event)
  {
    event.preventDefault();
    addFilter.call(this, event.dataTransfer.getData("text"));
  }

  onkeydown(event)
  {
    switch (event.key)
    {
      case "Enter":
        const {value} = this;
        $("input", this).blur();
        if (
          value.length &&
          !this.disabled &&
          !this.state.filters.some(hasValue, value)
        )
          addFilter.call(this, value);
        break;
      case "Esc":
        this.value = "";
        break;
    }
  }

  onkeyup()
  {
    const {match, value} = this;
    // no match means don't validate
    // but also multi line (paste on old browsers)
    // shouldn't pass through this logic (filtered later on)
    if (!match || !value || value.includes("\n"))
      return;
    clearTimeout(this._timer);
    // debounce the search to avoid degrading
    // performance on very long list of filters
    this._timer = setTimeout(() =>
    {
      this._timer = 0;
      const result = search.call(this, value);
      if (result.accuracy && match <= result.accuracy)
        dispatch.call(this, "filter:match", result);
    }, 100);
  }

  onpaste(event)
  {
    const clipboardData = event.clipboardData || window.clipboardData;
    addFilter.call(this, clipboardData.getData("text"));
  }

  render()
  {
    const {disabled} = this;
    this.html`
    <input
      placeholder="${this._placeholder}"
      onkeydown="${this}" onkeyup="${this}"
      ondrop="${this}" onpaste="${this}"
      disabled="${disabled}"
    >
    <button
      onclick="${this}"
      disabled="${disabled || this.state.filterExists || !this.value}"
    >
      ${{i18n: "add"}}
    </button>`;
  }
}

IOFilterSearch.define("io-filter-search");

module.exports = IOFilterSearch;

function addFilter(data)
{
  const value = data.trim();
  if (!value)
    return;
  const result = search.call(this, value);
  if (result.accuracy < 1)
    dispatch.call(this, "filter:add", value);
  else if (result.accuracy)
    dispatch.call(this, "filter:match", result);
}

function dispatch(type, detail)
{
  this.dispatchEvent(new CustomEvent(type, {detail}));
}

function hasValue(filter)
{
  return filter.text == this;
}

function search(value)
{
  let accuracy = 0;
  let closerFilter = null;
  const searchLength = value.length;
  if (searchLength)
  {
    const match = this.match;
    const {filters} = this.state;
    const {length} = filters;
    for (let i = 0; i < length; i++)
    {
      const filter = filters[i];
      const filterLength = filter.text.length;
      if (searchLength <= filterLength)
      {
        if (filter.text === value)
        {
          closerFilter = filter;
          accuracy = 1;
          break;
        }
        else if (match < 1 && filter.text.indexOf(value) >= 0)
        {
          const tmpAccuracy = searchLength / filter.text.length;
          if (accuracy < tmpAccuracy)
          {
            closerFilter = filter;
            accuracy = tmpAccuracy;
          }
        }
      }
    }
    this.setState({filterExists: accuracy === 1});
  }
  return {accuracy, filter: closerFilter};
}

},{"./dom":1,"./io-element":2}],5:[function(require,module,exports){
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

"use strict";

const IOElement = require("./io-element");
const IOFilterList = require("./io-filter-list");
const IOFilterSearch = require("./io-filter-search");

const {clipboard} = require("./dom");

const {bind, wire} = IOElement;

const log = window.console.log;

// io-filter-table is a basic controller
// used to relate the search and the list
class IOFilterTable extends IOElement
{
  static get booleanAttributes() { return ["disabled"]; }

  static get observedAttributes() { return ["match"]; }

  get defaultState() { return {filters: [], match: -1, ready: false}; }

  created()
  {
    this._showing = null;
    this.search = this.appendChild(new IOFilterSearch());
    this.search.addEventListener("filter:add", log);
    this.search.addEventListener(
      "filter:match",
      event => this.onFilterMatch(event)
    );
    this.list = this.appendChild(new IOFilterList());
    this.footer = this.appendChild(wire()`<div/>`);
    this.setState({ready: true});
  }

  attributeChangedCallback(name, prev, value)
  {
    if (name === "match")
      this.setState({match: value}, false);
    this.render();
  }

  get filters()
  {
    return this.state.filters;
  }

  set filters(value)
  {
    this.setState({filters: value});
  }

  get match()
  {
    return this.state.match;
  }

  set match(value)
  {
    this.setState({match: value});
  }

  onclick(event)
  {
    switch (event.currentTarget.className)
    {
      case "delete":
        for (const filter of this.list.selected)
        {
          this.list.selected.delete(filter);
          this.filters.splice(this.filters.indexOf(filter), 1);
        }
        this.list.render();
        break;
      case "copy":
        const filters = [];
        for (const filter of this.list.selected)
        {
          filters.push(filter.text);
        }
        clipboard.copy(filters.join("\n"));
        break;
    }
  }

  onFilterMatch(event)
  {
    this.list.scrollTo(event.detail.filter);
  }

  render()
  {
    const {disabled} = this;
    const {filters, match, ready} = this.state;
    if (!ready)
      return;
    // simply update inner components
    // no need to render any html in here
    this.search.disabled = disabled;
    this.search.filters = filters;
    this.search.match = match;
    this.list.disabled = disabled;
    this.list.filters = filters;
    this.renderBottom();
  }

  renderBottom()
  {
    bind(this.footer)`
      <div class="footer">
        <button class="delete" onclick="${this}">🗑 DELETE</button>
        <button class="copy" onclick="${this}">📃 COPY SELECTED</button>
      </div>
    `;
  }
}

IOFilterTable.define("io-filter-table");

},{"./dom":1,"./io-element":2,"./io-filter-list":3,"./io-filter-search":4}],6:[function(require,module,exports){
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

"use strict";

const IOElement = require("./io-element");
const {relativeCoordinates} = require("./dom");

const {isLeftClick} = IOElement.utils.event;

class IOScrollbar extends IOElement
{
  static get observedAttributes()
  {
    return ["direction", "position", "size"];
  }

  created()
  {
    this.addEventListener(
      "click",
      (event) =>
      {
        // ignore clicks on the slider or right clicks
        if (event.target !== this || !isLeftClick(event))
          return;
        // prevents clicks action on the component
        // after dragging the slider so that it won't
        // be re-positioned again on click coordinates
        if (this._dragging)
        {
          this._dragging = false;
          return;
        }
        const {x, y} = relativeCoordinates(event);
        if (this.direction === "horizontal")
          setPosition.call(this, x - (this._sliderSize / 2));
        else if (this.direction === "vertical")
          setPosition.call(this, y - (this._sliderSize / 2));
        this.dispatchEvent(new CustomEvent("scroll"));
      }
    );
    this.addEventListener(
      "wheel",
      (event) =>
      {
        stop(event);
        let delta = 0;
        if (this.direction === "vertical")
          delta = event.deltaY;
        else if (this.direction === "horizontal")
          delta = event.deltaX;
        // this extra delta transformation is mostly needed for MS Edge
        // but it works OK in every other browser too
        delta = delta * this._sliderSize / this.size;
        setPosition.call(this, this.position + delta);
        this.dispatchEvent(new CustomEvent("scroll"));
      },
      {passive: false}
    );
  }

  get defaultState()
  {
    return {
      direction: "",
      position: 0,
      size: 0
    };
  }

  get direction()
  {
    return this.state.direction;
  }

  // can be (ignore case) horizontal or vertical
  set direction(value)
  {
    value = value.toLowerCase();
    this.setState({direction: value});
    this.setAttribute("direction", value);
    // trigger eventual size recalculation
    sizeChange.call(this);
  }

  get position()
  {
    return this.state.position || 0;
  }

  set position(value)
  {
    // if created procedurally
    // the basic DOM info might not be there yet
    if (!this._elSize)
    {
      // in that case re-calculate the size
      sizeChange.call(this);
      // and if it's still unknown get out
      if (!this._elSize)
        return;
    }
    setPosition.call(this, value);
  }

  // read-only: the amount of positions covered by the slider
  get range()
  {
    return this._elSize - this._sliderSize;
  }

  get size()
  {
    return this.state.size;
  }

  set size(value)
  {
    this.setState({size: parseInt(value, 10)});
    sizeChange.call(this);
  }

  onmousedown(event)
  {
    if (!isLeftClick(event))
      return;
    this._dragging = true;
    this._coords = {
      x: event.clientX,
      y: event.clientY
    };
    const slider = event.currentTarget;
    const doc = slider.ownerDocument;
    // use the document as source of mouse events truth
    // use true as third option to intercept before bubbling
    doc.addEventListener("mousemove", this, true);
    doc.addEventListener("mouseup", this, true);
    // also prevents selection like a native scrollbar would
    // (this is specially needed for Firefox and Edge)
    doc.addEventListener("selectstart", stop, true);
  }

  onmousemove(event)
  {
    const {x, y} = this._coords;
    if (this.direction === "horizontal")
    {
      const {clientX} = event;
      setPosition.call(this, this.position + clientX - x);
      this._coords.x = clientX;
    }
    else if (this.direction === "vertical")
    {
      const {clientY} = event;
      setPosition.call(this, this.position + clientY - y);
      this._coords.y = clientY;
    }
    this.dispatchEvent(new CustomEvent("scroll"));
  }

  onmouseup(event)
  {
    if (!isLeftClick(event))
      return;
    const {currentTarget: doc, target} = event;
    doc.removeEventListener("mousemove", this, true);
    doc.removeEventListener("mouseup", this, true);
    doc.removeEventListener("selectstart", stop, true);
    // stop dragging if mouseup happens outside this component
    // or within this component slider (the only child)
    // otherwise let the click handler ignore the action
    // which happens through the component itself
    if (target !== this || target === this.child)
      this._dragging = false;
  }

  render()
  {
    // the component and its slider are styled 100% through CSS, i.e.
    // io-scrollbar[direction="vertical"] > .slider {}
    this.html`<div
      class="slider"
      onmousedown="${this}"
    />`;
  }
}

IOScrollbar.define("io-scrollbar");

module.exports = IOScrollbar;

function setPosition(value)
{
  this.setState({
    position: Math.max(
      0,
      Math.min(
        parseFloat(value),
        this.range
      )
    )
  });
  this.style.setProperty(
    "--position",
    this.state.position + "px"
  );
}

function sizeChange()
{
  if (this.direction === "horizontal")
    this._elSize = this.clientWidth;
  else if (this.direction === "vertical")
    this._elSize = this.clientHeight;
  this._sliderSize = Math.floor(
    Math.min(1, this._elSize / this.state.size) * this._elSize
  );
  if (this.direction === "horizontal")
    this._sliderSize = Math.max(this._sliderSize, this.clientHeight);
  else if (this.direction === "vertical")
    this._sliderSize = Math.max(this._sliderSize, this.clientWidth);
  this.style.setProperty("--slider-size", this._sliderSize + "px");
  // trigger eventual position recalculation
  // once this._elSize change
  // set again the style to re-position the scroller
  setPosition.call(this, this.position);
}

// if inside a container with its own wheel or mouse events,
// avoid possible backfiring through already handled events.
function stop(event)
{
  event.preventDefault();
  event.stopPropagation();
}

},{"./dom":1,"./io-element":2}],7:[function(require,module,exports){
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

"use strict";

const IOElement = require("./io-element");
const {boolean} = IOElement.utils;

class IOToggle extends IOElement
{
  // action, checked, and disabled should be reflected down the button
  static get observedAttributes()
  {
    return ["action", "checked", "disabled"];
  }

  created()
  {
    this.addEventListener("click", this);
    this.render();
  }

  get checked()
  {
    return this.hasAttribute("checked");
  }

  set checked(value)
  {
    boolean.attribute(this, "checked", value);
    this.render();
  }

  get disabled()
  {
    return this.hasAttribute("disabled");
  }

  set disabled(value)
  {
    boolean.attribute(this, "disabled", value);
  }

  onclick(event)
  {
    if (!this.disabled)
    {
      this.checked = !this.checked;
      if (this.ownerDocument.activeElement !== this.child)
      {
        this.child.focus();
      }
      this.dispatchEvent(new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: this.checked
      }));
    }
  }

  render()
  {
    this.html`
    <button
      role="checkbox"
      disabled="${this.disabled}"
      data-action="${this.action}"
      aria-checked="${this.checked}"
      aria-disabled="${this.disabled}"
    />`;
  }
}

IOToggle.define("io-toggle");

module.exports = IOToggle;

},{"./io-element":2}],8:[function(require,module,exports){
/*!
ISC License

Copyright (c) 2014-2018, Andrea Giammarchi, @WebReflection

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.

*/
// global window Object
// optional polyfill info
//    'auto' used by default, everything is feature detected
//    'force' use the polyfill even if not fully needed
function installCustomElements(window, polyfill) {'use strict';

  // DO NOT USE THIS FILE DIRECTLY, IT WON'T WORK
  // THIS IS A PROJECT BASED ON A BUILD SYSTEM
  // THIS FILE IS JUST WRAPPED UP RESULTING IN
  // build/document-register-element.node.js

  var
    document = window.document,
    Object = window.Object
  ;

  var htmlClass = (function (info) {
    // (C) Andrea Giammarchi - @WebReflection - MIT Style
    var
      catchClass = /^[A-Z]+[a-z]/,
      filterBy = function (re) {
        var arr = [], tag;
        for (tag in register) {
          if (re.test(tag)) arr.push(tag);
        }
        return arr;
      },
      add = function (Class, tag) {
        tag = tag.toLowerCase();
        if (!(tag in register)) {
          register[Class] = (register[Class] || []).concat(tag);
          register[tag] = (register[tag.toUpperCase()] = Class);
        }
      },
      register = (Object.create || Object)(null),
      htmlClass = {},
      i, section, tags, Class
    ;
    for (section in info) {
      for (Class in info[section]) {
        tags = info[section][Class];
        register[Class] = tags;
        for (i = 0; i < tags.length; i++) {
          register[tags[i].toLowerCase()] =
          register[tags[i].toUpperCase()] = Class;
        }
      }
    }
    htmlClass.get = function get(tagOrClass) {
      return typeof tagOrClass === 'string' ?
        (register[tagOrClass] || (catchClass.test(tagOrClass) ? [] : '')) :
        filterBy(tagOrClass);
    };
    htmlClass.set = function set(tag, Class) {
      return (catchClass.test(tag) ?
        add(tag, Class) :
        add(Class, tag)
      ), htmlClass;
    };
    return htmlClass;
  }({
    "collections": {
      "HTMLAllCollection": [
        "all"
      ],
      "HTMLCollection": [
        "forms"
      ],
      "HTMLFormControlsCollection": [
        "elements"
      ],
      "HTMLOptionsCollection": [
        "options"
      ]
    },
    "elements": {
      "Element": [
        "element"
      ],
      "HTMLAnchorElement": [
        "a"
      ],
      "HTMLAppletElement": [
        "applet"
      ],
      "HTMLAreaElement": [
        "area"
      ],
      "HTMLAttachmentElement": [
        "attachment"
      ],
      "HTMLAudioElement": [
        "audio"
      ],
      "HTMLBRElement": [
        "br"
      ],
      "HTMLBaseElement": [
        "base"
      ],
      "HTMLBodyElement": [
        "body"
      ],
      "HTMLButtonElement": [
        "button"
      ],
      "HTMLCanvasElement": [
        "canvas"
      ],
      "HTMLContentElement": [
        "content"
      ],
      "HTMLDListElement": [
        "dl"
      ],
      "HTMLDataElement": [
        "data"
      ],
      "HTMLDataListElement": [
        "datalist"
      ],
      "HTMLDetailsElement": [
        "details"
      ],
      "HTMLDialogElement": [
        "dialog"
      ],
      "HTMLDirectoryElement": [
        "dir"
      ],
      "HTMLDivElement": [
        "div"
      ],
      "HTMLDocument": [
        "document"
      ],
      "HTMLElement": [
        "element",
        "abbr",
        "address",
        "article",
        "aside",
        "b",
        "bdi",
        "bdo",
        "cite",
        "code",
        "command",
        "dd",
        "dfn",
        "dt",
        "em",
        "figcaption",
        "figure",
        "footer",
        "header",
        "i",
        "kbd",
        "mark",
        "nav",
        "noscript",
        "rp",
        "rt",
        "ruby",
        "s",
        "samp",
        "section",
        "small",
        "strong",
        "sub",
        "summary",
        "sup",
        "u",
        "var",
        "wbr"
      ],
      "HTMLEmbedElement": [
        "embed"
      ],
      "HTMLFieldSetElement": [
        "fieldset"
      ],
      "HTMLFontElement": [
        "font"
      ],
      "HTMLFormElement": [
        "form"
      ],
      "HTMLFrameElement": [
        "frame"
      ],
      "HTMLFrameSetElement": [
        "frameset"
      ],
      "HTMLHRElement": [
        "hr"
      ],
      "HTMLHeadElement": [
        "head"
      ],
      "HTMLHeadingElement": [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6"
      ],
      "HTMLHtmlElement": [
        "html"
      ],
      "HTMLIFrameElement": [
        "iframe"
      ],
      "HTMLImageElement": [
        "img"
      ],
      "HTMLInputElement": [
        "input"
      ],
      "HTMLKeygenElement": [
        "keygen"
      ],
      "HTMLLIElement": [
        "li"
      ],
      "HTMLLabelElement": [
        "label"
      ],
      "HTMLLegendElement": [
        "legend"
      ],
      "HTMLLinkElement": [
        "link"
      ],
      "HTMLMapElement": [
        "map"
      ],
      "HTMLMarqueeElement": [
        "marquee"
      ],
      "HTMLMediaElement": [
        "media"
      ],
      "HTMLMenuElement": [
        "menu"
      ],
      "HTMLMenuItemElement": [
        "menuitem"
      ],
      "HTMLMetaElement": [
        "meta"
      ],
      "HTMLMeterElement": [
        "meter"
      ],
      "HTMLModElement": [
        "del",
        "ins"
      ],
      "HTMLOListElement": [
        "ol"
      ],
      "HTMLObjectElement": [
        "object"
      ],
      "HTMLOptGroupElement": [
        "optgroup"
      ],
      "HTMLOptionElement": [
        "option"
      ],
      "HTMLOutputElement": [
        "output"
      ],
      "HTMLParagraphElement": [
        "p"
      ],
      "HTMLParamElement": [
        "param"
      ],
      "HTMLPictureElement": [
        "picture"
      ],
      "HTMLPreElement": [
        "pre"
      ],
      "HTMLProgressElement": [
        "progress"
      ],
      "HTMLQuoteElement": [
        "blockquote",
        "q",
        "quote"
      ],
      "HTMLScriptElement": [
        "script"
      ],
      "HTMLSelectElement": [
        "select"
      ],
      "HTMLShadowElement": [
        "shadow"
      ],
      "HTMLSlotElement": [
        "slot"
      ],
      "HTMLSourceElement": [
        "source"
      ],
      "HTMLSpanElement": [
        "span"
      ],
      "HTMLStyleElement": [
        "style"
      ],
      "HTMLTableCaptionElement": [
        "caption"
      ],
      "HTMLTableCellElement": [
        "td",
        "th"
      ],
      "HTMLTableColElement": [
        "col",
        "colgroup"
      ],
      "HTMLTableElement": [
        "table"
      ],
      "HTMLTableRowElement": [
        "tr"
      ],
      "HTMLTableSectionElement": [
        "thead",
        "tbody",
        "tfoot"
      ],
      "HTMLTemplateElement": [
        "template"
      ],
      "HTMLTextAreaElement": [
        "textarea"
      ],
      "HTMLTimeElement": [
        "time"
      ],
      "HTMLTitleElement": [
        "title"
      ],
      "HTMLTrackElement": [
        "track"
      ],
      "HTMLUListElement": [
        "ul"
      ],
      "HTMLUnknownElement": [
        "unknown",
        "vhgroupv",
        "vkeygen"
      ],
      "HTMLVideoElement": [
        "video"
      ]
    },
    "nodes": {
      "Attr": [
        "node"
      ],
      "Audio": [
        "audio"
      ],
      "CDATASection": [
        "node"
      ],
      "CharacterData": [
        "node"
      ],
      "Comment": [
        "#comment"
      ],
      "Document": [
        "#document"
      ],
      "DocumentFragment": [
        "#document-fragment"
      ],
      "DocumentType": [
        "node"
      ],
      "HTMLDocument": [
        "#document"
      ],
      "Image": [
        "img"
      ],
      "Option": [
        "option"
      ],
      "ProcessingInstruction": [
        "node"
      ],
      "ShadowRoot": [
        "#shadow-root"
      ],
      "Text": [
        "#text"
      ],
      "XMLDocument": [
        "xml"
      ]
    }
  }));
  
  
    
  // passed at runtime, configurable via nodejs module
  if (typeof polyfill !== 'object') polyfill = {type: polyfill || 'auto'};
  
  var
    // V0 polyfill entry
    REGISTER_ELEMENT = 'registerElement',
  
    // IE < 11 only + old WebKit for attributes + feature detection
    EXPANDO_UID = '__' + REGISTER_ELEMENT + (window.Math.random() * 10e4 >> 0),
  
    // shortcuts and costants
    ADD_EVENT_LISTENER = 'addEventListener',
    ATTACHED = 'attached',
    CALLBACK = 'Callback',
    DETACHED = 'detached',
    EXTENDS = 'extends',
  
    ATTRIBUTE_CHANGED_CALLBACK = 'attributeChanged' + CALLBACK,
    ATTACHED_CALLBACK = ATTACHED + CALLBACK,
    CONNECTED_CALLBACK = 'connected' + CALLBACK,
    DISCONNECTED_CALLBACK = 'disconnected' + CALLBACK,
    CREATED_CALLBACK = 'created' + CALLBACK,
    DETACHED_CALLBACK = DETACHED + CALLBACK,
  
    ADDITION = 'ADDITION',
    MODIFICATION = 'MODIFICATION',
    REMOVAL = 'REMOVAL',
  
    DOM_ATTR_MODIFIED = 'DOMAttrModified',
    DOM_CONTENT_LOADED = 'DOMContentLoaded',
    DOM_SUBTREE_MODIFIED = 'DOMSubtreeModified',
  
    PREFIX_TAG = '<',
    PREFIX_IS = '=',
  
    // valid and invalid node names
    validName = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/,
    invalidNames = [
      'ANNOTATION-XML',
      'COLOR-PROFILE',
      'FONT-FACE',
      'FONT-FACE-SRC',
      'FONT-FACE-URI',
      'FONT-FACE-FORMAT',
      'FONT-FACE-NAME',
      'MISSING-GLYPH'
    ],
  
    // registered types and their prototypes
    types = [],
    protos = [],
  
    // to query subnodes
    query = '',
  
    // html shortcut used to feature detect
    documentElement = document.documentElement,
  
    // ES5 inline helpers || basic patches
    indexOf = types.indexOf || function (v) {
      for(var i = this.length; i-- && this[i] !== v;){}
      return i;
    },
  
    // other helpers / shortcuts
    OP = Object.prototype,
    hOP = OP.hasOwnProperty,
    iPO = OP.isPrototypeOf,
  
    defineProperty = Object.defineProperty,
    empty = [],
    gOPD = Object.getOwnPropertyDescriptor,
    gOPN = Object.getOwnPropertyNames,
    gPO = Object.getPrototypeOf,
    sPO = Object.setPrototypeOf,
  
    // jshint proto: true
    hasProto = !!Object.__proto__,
  
    // V1 helpers
    fixGetClass = false,
    DRECEV1 = '__dreCEv1',
    customElements = window.customElements,
    usableCustomElements = !/^force/.test(polyfill.type) && !!(
      customElements &&
      customElements.define &&
      customElements.get &&
      customElements.whenDefined
    ),
    Dict = Object.create || Object,
    Map = window.Map || function Map() {
      var K = [], V = [], i;
      return {
        get: function (k) {
          return V[indexOf.call(K, k)];
        },
        set: function (k, v) {
          i = indexOf.call(K, k);
          if (i < 0) V[K.push(k) - 1] = v;
          else V[i] = v;
        }
      };
    },
    Promise = window.Promise || function (fn) {
      var
        notify = [],
        done = false,
        p = {
          'catch': function () {
            return p;
          },
          'then': function (cb) {
            notify.push(cb);
            if (done) setTimeout(resolve, 1);
            return p;
          }
        }
      ;
      function resolve(value) {
        done = true;
        while (notify.length) notify.shift()(value);
      }
      fn(resolve);
      return p;
    },
    justCreated = false,
    constructors = Dict(null),
    waitingList = Dict(null),
    nodeNames = new Map(),
    secondArgument = function (is) {
      return is.toLowerCase();
    },
  
    // used to create unique instances
    create = Object.create || function Bridge(proto) {
      // silly broken polyfill probably ever used but short enough to work
      return proto ? ((Bridge.prototype = proto), new Bridge()) : this;
    },
  
    // will set the prototype if possible
    // or copy over all properties
    setPrototype = sPO || (
      hasProto ?
        function (o, p) {
          o.__proto__ = p;
          return o;
        } : (
      (gOPN && gOPD) ?
        (function(){
          function setProperties(o, p) {
            for (var
              key,
              names = gOPN(p),
              i = 0, length = names.length;
              i < length; i++
            ) {
              key = names[i];
              if (!hOP.call(o, key)) {
                defineProperty(o, key, gOPD(p, key));
              }
            }
          }
          return function (o, p) {
            do {
              setProperties(o, p);
            } while ((p = gPO(p)) && !iPO.call(p, o));
            return o;
          };
        }()) :
        function (o, p) {
          for (var key in p) {
            o[key] = p[key];
          }
          return o;
        }
    )),
  
    // DOM shortcuts and helpers, if any
  
    MutationObserver = window.MutationObserver ||
                       window.WebKitMutationObserver,
  
    HTMLElementPrototype = (
      window.HTMLElement ||
      window.Element ||
      window.Node
    ).prototype,
  
    IE8 = !iPO.call(HTMLElementPrototype, documentElement),
  
    safeProperty = IE8 ? function (o, k, d) {
      o[k] = d.value;
      return o;
    } : defineProperty,
  
    isValidNode = IE8 ?
      function (node) {
        return node.nodeType === 1;
      } :
      function (node) {
        return iPO.call(HTMLElementPrototype, node);
      },
  
    targets = IE8 && [],
  
    attachShadow = HTMLElementPrototype.attachShadow,
    cloneNode = HTMLElementPrototype.cloneNode,
    dispatchEvent = HTMLElementPrototype.dispatchEvent,
    getAttribute = HTMLElementPrototype.getAttribute,
    hasAttribute = HTMLElementPrototype.hasAttribute,
    removeAttribute = HTMLElementPrototype.removeAttribute,
    setAttribute = HTMLElementPrototype.setAttribute,
  
    // replaced later on
    createElement = document.createElement,
    importNode = document.importNode,
    patchedCreateElement = createElement,
  
    // shared observer for all attributes
    attributesObserver = MutationObserver && {
      attributes: true,
      characterData: true,
      attributeOldValue: true
    },
  
    // useful to detect only if there's no MutationObserver
    DOMAttrModified = MutationObserver || function(e) {
      doesNotSupportDOMAttrModified = false;
      documentElement.removeEventListener(
        DOM_ATTR_MODIFIED,
        DOMAttrModified
      );
    },
  
    // will both be used to make DOMNodeInserted asynchronous
    asapQueue,
    asapTimer = 0,
  
    // internal flags
    V0 = REGISTER_ELEMENT in document &&
         !/^force-all/.test(polyfill.type),
    setListener = true,
    justSetup = false,
    doesNotSupportDOMAttrModified = true,
    dropDomContentLoaded = true,
  
    // needed for the innerHTML helper
    notFromInnerHTMLHelper = true,
  
    // optionally defined later on
    onSubtreeModified,
    callDOMAttrModified,
    getAttributesMirror,
    observer,
    observe,
  
    // based on setting prototype capability
    // will check proto or the expando attribute
    // in order to setup the node once
    patchIfNotAlready,
    patch,
  
    // used for tests
    tmp
  ;
  
  // IE11 disconnectedCallback issue #
  // to be tested before any createElement patch
  if (MutationObserver) {
    // original fix:
    // https://github.com/javan/mutation-observer-inner-html-shim
    tmp = document.createElement('div');
    tmp.innerHTML = '<div><div></div></div>';
    new MutationObserver(function (mutations, observer) {
      if (
        mutations[0] &&
        mutations[0].type == 'childList' &&
        !mutations[0].removedNodes[0].childNodes.length
      ) {
        tmp = gOPD(HTMLElementPrototype, 'innerHTML');
        var set = tmp && tmp.set;
        if (set)
          defineProperty(HTMLElementPrototype, 'innerHTML', {
            set: function (value) {
              while (this.lastChild)
                this.removeChild(this.lastChild);
              set.call(this, value);
            }
          });
      }
      observer.disconnect();
      tmp = null;
    }).observe(tmp, {childList: true, subtree: true});
    tmp.innerHTML = "";
  }
  
  // only if needed
  if (!V0) {
  
    if (sPO || hasProto) {
        patchIfNotAlready = function (node, proto) {
          if (!iPO.call(proto, node)) {
            setupNode(node, proto);
          }
        };
        patch = setupNode;
    } else {
        patchIfNotAlready = function (node, proto) {
          if (!node[EXPANDO_UID]) {
            node[EXPANDO_UID] = Object(true);
            setupNode(node, proto);
          }
        };
        patch = patchIfNotAlready;
    }
  
    if (IE8) {
      doesNotSupportDOMAttrModified = false;
      (function (){
        var
          descriptor = gOPD(HTMLElementPrototype, ADD_EVENT_LISTENER),
          addEventListener = descriptor.value,
          patchedRemoveAttribute = function (name) {
            var e = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true});
            e.attrName = name;
            e.prevValue = getAttribute.call(this, name);
            e.newValue = null;
            e[REMOVAL] = e.attrChange = 2;
            removeAttribute.call(this, name);
            dispatchEvent.call(this, e);
          },
          patchedSetAttribute = function (name, value) {
            var
              had = hasAttribute.call(this, name),
              old = had && getAttribute.call(this, name),
              e = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true})
            ;
            setAttribute.call(this, name, value);
            e.attrName = name;
            e.prevValue = had ? old : null;
            e.newValue = value;
            if (had) {
              e[MODIFICATION] = e.attrChange = 1;
            } else {
              e[ADDITION] = e.attrChange = 0;
            }
            dispatchEvent.call(this, e);
          },
          onPropertyChange = function (e) {
            // jshint eqnull:true
            var
              node = e.currentTarget,
              superSecret = node[EXPANDO_UID],
              propertyName = e.propertyName,
              event
            ;
            if (superSecret.hasOwnProperty(propertyName)) {
              superSecret = superSecret[propertyName];
              event = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true});
              event.attrName = superSecret.name;
              event.prevValue = superSecret.value || null;
              event.newValue = (superSecret.value = node[propertyName] || null);
              if (event.prevValue == null) {
                event[ADDITION] = event.attrChange = 0;
              } else {
                event[MODIFICATION] = event.attrChange = 1;
              }
              dispatchEvent.call(node, event);
            }
          }
        ;
        descriptor.value = function (type, handler, capture) {
          if (
            type === DOM_ATTR_MODIFIED &&
            this[ATTRIBUTE_CHANGED_CALLBACK] &&
            this.setAttribute !== patchedSetAttribute
          ) {
            this[EXPANDO_UID] = {
              className: {
                name: 'class',
                value: this.className
              }
            };
            this.setAttribute = patchedSetAttribute;
            this.removeAttribute = patchedRemoveAttribute;
            addEventListener.call(this, 'propertychange', onPropertyChange);
          }
          addEventListener.call(this, type, handler, capture);
        };
        defineProperty(HTMLElementPrototype, ADD_EVENT_LISTENER, descriptor);
      }());
    } else if (!MutationObserver) {
      documentElement[ADD_EVENT_LISTENER](DOM_ATTR_MODIFIED, DOMAttrModified);
      documentElement.setAttribute(EXPANDO_UID, 1);
      documentElement.removeAttribute(EXPANDO_UID);
      if (doesNotSupportDOMAttrModified) {
        onSubtreeModified = function (e) {
          var
            node = this,
            oldAttributes,
            newAttributes,
            key
          ;
          if (node === e.target) {
            oldAttributes = node[EXPANDO_UID];
            node[EXPANDO_UID] = (newAttributes = getAttributesMirror(node));
            for (key in newAttributes) {
              if (!(key in oldAttributes)) {
                // attribute was added
                return callDOMAttrModified(
                  0,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  ADDITION
                );
              } else if (newAttributes[key] !== oldAttributes[key]) {
                // attribute was changed
                return callDOMAttrModified(
                  1,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  MODIFICATION
                );
              }
            }
            // checking if it has been removed
            for (key in oldAttributes) {
              if (!(key in newAttributes)) {
                // attribute removed
                return callDOMAttrModified(
                  2,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  REMOVAL
                );
              }
            }
          }
        };
        callDOMAttrModified = function (
          attrChange,
          currentTarget,
          attrName,
          prevValue,
          newValue,
          action
        ) {
          var e = {
            attrChange: attrChange,
            currentTarget: currentTarget,
            attrName: attrName,
            prevValue: prevValue,
            newValue: newValue
          };
          e[action] = attrChange;
          onDOMAttrModified(e);
        };
        getAttributesMirror = function (node) {
          for (var
            attr, name,
            result = {},
            attributes = node.attributes,
            i = 0, length = attributes.length;
            i < length; i++
          ) {
            attr = attributes[i];
            name = attr.name;
            if (name !== 'setAttribute') {
              result[name] = attr.value;
            }
          }
          return result;
        };
      }
    }
  
    // set as enumerable, writable and configurable
    document[REGISTER_ELEMENT] = function registerElement(type, options) {
      upperType = type.toUpperCase();
      if (setListener) {
        // only first time document.registerElement is used
        // we need to set this listener
        // setting it by default might slow down for no reason
        setListener = false;
        if (MutationObserver) {
          observer = (function(attached, detached){
            function checkEmAll(list, callback) {
              for (var i = 0, length = list.length; i < length; callback(list[i++])){}
            }
            return new MutationObserver(function (records) {
              for (var
                current, node, newValue,
                i = 0, length = records.length; i < length; i++
              ) {
                current = records[i];
                if (current.type === 'childList') {
                  checkEmAll(current.addedNodes, attached);
                  checkEmAll(current.removedNodes, detached);
                } else {
                  node = current.target;
                  if (notFromInnerHTMLHelper &&
                      node[ATTRIBUTE_CHANGED_CALLBACK] &&
                      current.attributeName !== 'style') {
                    newValue = getAttribute.call(node, current.attributeName);
                    if (newValue !== current.oldValue) {
                      node[ATTRIBUTE_CHANGED_CALLBACK](
                        current.attributeName,
                        current.oldValue,
                        newValue
                      );
                    }
                  }
                }
              }
            });
          }(executeAction(ATTACHED), executeAction(DETACHED)));
          observe = function (node) {
            observer.observe(
              node,
              {
                childList: true,
                subtree: true
              }
            );
            return node;
          };
          observe(document);
          if (attachShadow) {
            HTMLElementPrototype.attachShadow = function () {
              return observe(attachShadow.apply(this, arguments));
            };
          }
        } else {
          asapQueue = [];
          document[ADD_EVENT_LISTENER]('DOMNodeInserted', onDOMNode(ATTACHED));
          document[ADD_EVENT_LISTENER]('DOMNodeRemoved', onDOMNode(DETACHED));
        }
  
        document[ADD_EVENT_LISTENER](DOM_CONTENT_LOADED, onReadyStateChange);
        document[ADD_EVENT_LISTENER]('readystatechange', onReadyStateChange);
  
        document.importNode = function (node, deep) {
          switch (node.nodeType) {
            case 1:
              return setupAll(document, importNode, [node, !!deep]);
            case 11:
              for (var
                fragment = document.createDocumentFragment(),
                childNodes = node.childNodes,
                length = childNodes.length,
                i = 0; i < length; i++
              )
                fragment.appendChild(document.importNode(childNodes[i], !!deep));
              return fragment;
            default:
              return cloneNode.call(node, !!deep);
          }
        };
  
        HTMLElementPrototype.cloneNode = function (deep) {
          return setupAll(this, cloneNode, [!!deep]);
        };
      }
  
      if (justSetup) return (justSetup = false);
  
      if (-2 < (
        indexOf.call(types, PREFIX_IS + upperType) +
        indexOf.call(types, PREFIX_TAG + upperType)
      )) {
        throwTypeError(type);
      }
  
      if (!validName.test(upperType) || -1 < indexOf.call(invalidNames, upperType)) {
        throw new Error('The type ' + type + ' is invalid');
      }
  
      var
        constructor = function () {
          return extending ?
            document.createElement(nodeName, upperType) :
            document.createElement(nodeName);
        },
        opt = options || OP,
        extending = hOP.call(opt, EXTENDS),
        nodeName = extending ? options[EXTENDS].toUpperCase() : upperType,
        upperType,
        i
      ;
  
      if (extending && -1 < (
        indexOf.call(types, PREFIX_TAG + nodeName)
      )) {
        throwTypeError(nodeName);
      }
  
      i = types.push((extending ? PREFIX_IS : PREFIX_TAG) + upperType) - 1;
  
      query = query.concat(
        query.length ? ',' : '',
        extending ? nodeName + '[is="' + type.toLowerCase() + '"]' : nodeName
      );
  
      constructor.prototype = (
        protos[i] = hOP.call(opt, 'prototype') ?
          opt.prototype :
          create(HTMLElementPrototype)
      );
  
      if (query.length) loopAndVerify(
        document.querySelectorAll(query),
        ATTACHED
      );
  
      return constructor;
    };
  
    document.createElement = (patchedCreateElement = function (localName, typeExtension) {
      var
        is = getIs(typeExtension),
        node = is ?
          createElement.call(document, localName, secondArgument(is)) :
          createElement.call(document, localName),
        name = '' + localName,
        i = indexOf.call(
          types,
          (is ? PREFIX_IS : PREFIX_TAG) +
          (is || name).toUpperCase()
        ),
        setup = -1 < i
      ;
      if (is) {
        node.setAttribute('is', is = is.toLowerCase());
        if (setup) {
          setup = isInQSA(name.toUpperCase(), is);
        }
      }
      notFromInnerHTMLHelper = !document.createElement.innerHTMLHelper;
      if (setup) patch(node, protos[i]);
      return node;
    });
  
  }
  
  function ASAP() {
    var queue = asapQueue.splice(0, asapQueue.length);
    asapTimer = 0;
    while (queue.length) {
      queue.shift().call(
        null, queue.shift()
      );
    }
  }
  
  function loopAndVerify(list, action) {
    for (var i = 0, length = list.length; i < length; i++) {
      verifyAndSetupAndAction(list[i], action);
    }
  }
  
  function loopAndSetup(list) {
    for (var i = 0, length = list.length, node; i < length; i++) {
      node = list[i];
      patch(node, protos[getTypeIndex(node)]);
    }
  }
  
  function executeAction(action) {
    return function (node) {
      if (isValidNode(node)) {
        verifyAndSetupAndAction(node, action);
        if (query.length) loopAndVerify(
          node.querySelectorAll(query),
          action
        );
      }
    };
  }
  
  function getTypeIndex(target) {
    var
      is = getAttribute.call(target, 'is'),
      nodeName = target.nodeName.toUpperCase(),
      i = indexOf.call(
        types,
        is ?
            PREFIX_IS + is.toUpperCase() :
            PREFIX_TAG + nodeName
      )
    ;
    return is && -1 < i && !isInQSA(nodeName, is) ? -1 : i;
  }
  
  function isInQSA(name, type) {
    return -1 < query.indexOf(name + '[is="' + type + '"]');
  }
  
  function onDOMAttrModified(e) {
    var
      node = e.currentTarget,
      attrChange = e.attrChange,
      attrName = e.attrName,
      target = e.target,
      addition = e[ADDITION] || 2,
      removal = e[REMOVAL] || 3
    ;
    if (notFromInnerHTMLHelper &&
        (!target || target === node) &&
        node[ATTRIBUTE_CHANGED_CALLBACK] &&
        attrName !== 'style' && (
          e.prevValue !== e.newValue ||
          // IE9, IE10, and Opera 12 gotcha
          e.newValue === '' && (
            attrChange === addition ||
            attrChange === removal
          )
    )) {
      node[ATTRIBUTE_CHANGED_CALLBACK](
        attrName,
        attrChange === addition ? null : e.prevValue,
        attrChange === removal ? null : e.newValue
      );
    }
  }
  
  function onDOMNode(action) {
    var executor = executeAction(action);
    return function (e) {
      asapQueue.push(executor, e.target);
      if (asapTimer) clearTimeout(asapTimer);
      asapTimer = setTimeout(ASAP, 1);
    };
  }
  
  function onReadyStateChange(e) {
    if (dropDomContentLoaded) {
      dropDomContentLoaded = false;
      e.currentTarget.removeEventListener(DOM_CONTENT_LOADED, onReadyStateChange);
    }
    if (query.length) loopAndVerify(
      (e.target || document).querySelectorAll(query),
      e.detail === DETACHED ? DETACHED : ATTACHED
    );
    if (IE8) purge();
  }
  
  function patchedSetAttribute(name, value) {
    // jshint validthis:true
    var self = this;
    setAttribute.call(self, name, value);
    onSubtreeModified.call(self, {target: self});
  }
  
  function setupAll(context, callback, args) {
    var
      node = callback.apply(context, args),
      i = getTypeIndex(node)
    ;
    if (-1 < i) patch(node, protos[i]);
    if (args.pop() && query.length)
      loopAndSetup(node.querySelectorAll(query));
    return node;
  }
  
  function setupNode(node, proto) {
    setPrototype(node, proto);
    if (observer) {
      observer.observe(node, attributesObserver);
    } else {
      if (doesNotSupportDOMAttrModified) {
        node.setAttribute = patchedSetAttribute;
        node[EXPANDO_UID] = getAttributesMirror(node);
        node[ADD_EVENT_LISTENER](DOM_SUBTREE_MODIFIED, onSubtreeModified);
      }
      node[ADD_EVENT_LISTENER](DOM_ATTR_MODIFIED, onDOMAttrModified);
    }
    if (node[CREATED_CALLBACK] && notFromInnerHTMLHelper) {
      node.created = true;
      node[CREATED_CALLBACK]();
      node.created = false;
    }
  }
  
  function purge() {
    for (var
      node,
      i = 0,
      length = targets.length;
      i < length; i++
    ) {
      node = targets[i];
      if (!documentElement.contains(node)) {
        length--;
        targets.splice(i--, 1);
        verifyAndSetupAndAction(node, DETACHED);
      }
    }
  }
  
  function throwTypeError(type) {
    throw new Error('A ' + type + ' type is already registered');
  }
  
  function verifyAndSetupAndAction(node, action) {
    var
      fn,
      i = getTypeIndex(node),
      counterAction
    ;
    if (-1 < i) {
      patchIfNotAlready(node, protos[i]);
      i = 0;
      if (action === ATTACHED && !node[ATTACHED]) {
        node[DETACHED] = false;
        node[ATTACHED] = true;
        counterAction = 'connected';
        i = 1;
        if (IE8 && indexOf.call(targets, node) < 0) {
          targets.push(node);
        }
      } else if (action === DETACHED && !node[DETACHED]) {
        node[ATTACHED] = false;
        node[DETACHED] = true;
        counterAction = 'disconnected';
        i = 1;
      }
      if (i && (fn = (
        node[action + CALLBACK] ||
        node[counterAction + CALLBACK]
      ))) fn.call(node);
    }
  }
  
  
  
  // V1 in da House!
  function CustomElementRegistry() {}
  
  CustomElementRegistry.prototype = {
    constructor: CustomElementRegistry,
    // a workaround for the stubborn WebKit
    define: usableCustomElements ?
      function (name, Class, options) {
        if (options) {
          CERDefine(name, Class, options);
        } else {
          var NAME = name.toUpperCase();
          constructors[NAME] = {
            constructor: Class,
            create: [NAME]
          };
          nodeNames.set(Class, NAME);
          customElements.define(name, Class);
        }
      } :
      CERDefine,
    get: usableCustomElements ?
      function (name) {
        return customElements.get(name) || get(name);
      } :
      get,
    whenDefined: usableCustomElements ?
      function (name) {
        return Promise.race([
          customElements.whenDefined(name),
          whenDefined(name)
        ]);
      } :
      whenDefined
  };
  
  function CERDefine(name, Class, options) {
    var
      is = options && options[EXTENDS] || '',
      CProto = Class.prototype,
      proto = create(CProto),
      attributes = Class.observedAttributes || empty,
      definition = {prototype: proto}
    ;
    // TODO: is this needed at all since it's inherited?
    // defineProperty(proto, 'constructor', {value: Class});
    safeProperty(proto, CREATED_CALLBACK, {
        value: function () {
          if (justCreated) justCreated = false;
          else if (!this[DRECEV1]) {
            this[DRECEV1] = true;
            new Class(this);
            if (CProto[CREATED_CALLBACK])
              CProto[CREATED_CALLBACK].call(this);
            var info = constructors[nodeNames.get(Class)];
            if (!usableCustomElements || info.create.length > 1) {
              notifyAttributes(this);
            }
          }
      }
    });
    safeProperty(proto, ATTRIBUTE_CHANGED_CALLBACK, {
      value: function (name) {
        if (-1 < indexOf.call(attributes, name)) {
          if (CProto[ATTRIBUTE_CHANGED_CALLBACK])
            CProto[ATTRIBUTE_CHANGED_CALLBACK].apply(this, arguments);
        }
      }
    });
    if (CProto[CONNECTED_CALLBACK]) {
      safeProperty(proto, ATTACHED_CALLBACK, {
        value: CProto[CONNECTED_CALLBACK]
      });
    }
    if (CProto[DISCONNECTED_CALLBACK]) {
      safeProperty(proto, DETACHED_CALLBACK, {
        value: CProto[DISCONNECTED_CALLBACK]
      });
    }
    if (is) definition[EXTENDS] = is;
    name = name.toUpperCase();
    constructors[name] = {
      constructor: Class,
      create: is ? [is, secondArgument(name)] : [name]
    };
    nodeNames.set(Class, name);
    document[REGISTER_ELEMENT](name.toLowerCase(), definition);
    whenDefined(name);
    waitingList[name].r();
  }
  
  function get(name) {
    var info = constructors[name.toUpperCase()];
    return info && info.constructor;
  }
  
  function getIs(options) {
    return typeof options === 'string' ?
        options : (options && options.is || '');
  }
  
  function notifyAttributes(self) {
    var
      callback = self[ATTRIBUTE_CHANGED_CALLBACK],
      attributes = callback ? self.attributes : empty,
      i = attributes.length,
      attribute
    ;
    while (i--) {
      attribute =  attributes[i]; // || attributes.item(i);
      callback.call(
        self,
        attribute.name || attribute.nodeName,
        null,
        attribute.value || attribute.nodeValue
      );
    }
  }
  
  function whenDefined(name) {
    name = name.toUpperCase();
    if (!(name in waitingList)) {
      waitingList[name] = {};
      waitingList[name].p = new Promise(function (resolve) {
        waitingList[name].r = resolve;
      });
    }
    return waitingList[name].p;
  }
  
  function polyfillV1() {
    if (customElements) delete window.customElements;
    defineProperty(window, 'customElements', {
      configurable: true,
      value: new CustomElementRegistry()
    });
    defineProperty(window, 'CustomElementRegistry', {
      configurable: true,
      value: CustomElementRegistry
    });
    for (var
      patchClass = function (name) {
        var Class = window[name];
        if (Class) {
          window[name] = function CustomElementsV1(self) {
            var info, isNative;
            if (!self) self = this;
            if (!self[DRECEV1]) {
              justCreated = true;
              info = constructors[nodeNames.get(self.constructor)];
              isNative = usableCustomElements && info.create.length === 1;
              self = isNative ?
                Reflect.construct(Class, empty, info.constructor) :
                document.createElement.apply(document, info.create);
              self[DRECEV1] = true;
              justCreated = false;
              if (!isNative) notifyAttributes(self);
            }
            return self;
          };
          window[name].prototype = Class.prototype;
          try {
            Class.prototype.constructor = window[name];
          } catch(WebKit) {
            fixGetClass = true;
            defineProperty(Class, DRECEV1, {value: window[name]});
          }
        }
      },
      Classes = htmlClass.get(/^HTML[A-Z]*[a-z]/),
      i = Classes.length;
      i--;
      patchClass(Classes[i])
    ) {}
    (document.createElement = function (name, options) {
      var is = getIs(options);
      return is ?
        patchedCreateElement.call(this, name, secondArgument(is)) :
        patchedCreateElement.call(this, name);
    });
    if (!V0) {
      justSetup = true;
      document[REGISTER_ELEMENT]('');
    }
  }
  
  // if customElements is not there at all
  if (!customElements || /^force/.test(polyfill.type)) polyfillV1();
  else if(!polyfill.noBuiltIn) {
    // if available test extends work as expected
    try {
      (function (DRE, options, name) {
        var re = new RegExp('^<a\\s+is=(\'|")' + name + '\\1></a>$');
        options[EXTENDS] = 'a';
        DRE.prototype = create(HTMLAnchorElement.prototype);
        DRE.prototype.constructor = DRE;
        window.customElements.define(name, DRE, options);
        if (
          !re.test(document.createElement('a', {is: name}).outerHTML) ||
          !re.test((new DRE()).outerHTML)
        ) {
          throw options;
        }
      }(
        function DRE() {
          return Reflect.construct(HTMLAnchorElement, [], DRE);
        },
        {},
        'document-register-element-a'
      ));
    } catch(o_O) {
      // or force the polyfill if not
      // and keep internal original reference
      polyfillV1();
    }
  }
  
  // FireFox only issue
  if(!polyfill.noBuiltIn) {
    try {
      createElement.call(document, 'a', 'a');
    } catch(FireFox) {
      secondArgument = function (is) {
        return {is: is.toLowerCase()};
      };
    }
  }
  
}

module.exports = installCustomElements;

},{}],9:[function(require,module,exports){
'use strict';
/*! (C) 2017-2018 Andrea Giammarchi - ISC Style License */

const {Component, bind, define, hyper, wire} = require('hyperhtml/cjs');

// utils to deal with custom elements builtin extends
const ATTRIBUTE_CHANGED_CALLBACK = 'attributeChangedCallback';
const O = Object;
const classes = [];
const defineProperty = O.defineProperty;
const getOwnPropertyDescriptor = O.getOwnPropertyDescriptor;
const getOwnPropertyNames = O.getOwnPropertyNames;
const getOwnPropertySymbols = O.getOwnPropertySymbols || (() => []);
const getPrototypeOf = O.getPrototypeOf || (o => o.__proto__);
const ownKeys = typeof Reflect === 'object' && Reflect.ownKeys ||
                (o => getOwnPropertyNames(o).concat(getOwnPropertySymbols(o)));
const setPrototypeOf = O.setPrototypeOf ||
                      ((o, p) => (o.__proto__ = p, o));

class HyperHTMLElement extends HTMLElement {

  // define a custom-element in the CustomElementsRegistry
  // class MyEl extends HyperHTMLElement {}
  // MyEl.define('my-el');
  static define(name, options) {
    const Class = this;
    const proto = Class.prototype;

    const onChanged = proto[ATTRIBUTE_CHANGED_CALLBACK];
    const hasChange = !!onChanged;

    // Class.booleanAttributes
    // -----------------------------------------------
    // attributes defined as boolean will have
    // an either available or not available attribute
    // regardless of the value.
    // All falsy values, or "false", mean attribute removed
    // while truthy values will be set as is.
    // Boolean attributes are also automatically observed.
    const booleanAttributes = Class.booleanAttributes || [];
    booleanAttributes.forEach(name => {
      if (!(name in proto)) defineProperty(
        proto,
        name.replace(/-([a-z])/g, ($0, $1) => $1.toUpperCase()),
        {
          configurable: true,
          get() {
            return this.hasAttribute(name);
          },
          set(value) {
            if (!value || value === 'false')
              this.removeAttribute(name);
            else
              this.setAttribute(name, value);
          }
        }
      );
    });

    // Class.observedAttributes
    // -------------------------------------------------------
    // HyperHTMLElement will directly reflect get/setAttribute
    // operation once these attributes are used, example:
    // el.observed = 123;
    // will automatically do
    // el.setAttribute('observed', 123);
    // triggering also the attributeChangedCallback
    const observedAttributes = Class.observedAttributes || [];
    observedAttributes.forEach(name => {
      // it is possible to redefine the behavior at any time
      // simply overwriting get prop() and set prop(value)
      if (!(name in proto)) defineProperty(
        proto,
        name.replace(/-([a-z])/g, ($0, $1) => $1.toUpperCase()),
        {
          configurable: true,
          get() {
            return this.getAttribute(name);
          },
          set(value) {
            if (value == null)
              this.removeAttribute(name);
            else
              this.setAttribute(name, value);
          }
        }
      );
    });

    // if these are defined, overwrite the observedAttributes getter
    // to include also booleanAttributes
    const attributes = booleanAttributes.concat(observedAttributes);
    if (attributes.length)
      defineProperty(Class, 'observedAttributes', {
        get() { return attributes; }
      });

    // created() {}
    // ---------------------------------
    // an initializer method that grants
    // the node is fully known to the browser.
    // It is ensured to run either after DOMContentLoaded,
    // or once there is a next sibling (stream-friendly) so that
    // you have full access to element attributes and/or childNodes.
    const created = proto.created;
    if (created) {
      // used to ensure create() is called once and once only
      defineProperty(
        proto,
        '_init$',
        {
          configurable: true,
          writable: true,
          value: true
        }
      );

      // allow arbitrary invoke of `el.created()`
      // handy to monkey patch old Firefox or others
      defineProperty(
        proto,
        'created',
        {
          value() {
            if (this._init$)
              checkReady.call(this, created);
          }
        }
      );

      // ⚠️ if you need to overwrite/change attributeChangedCallback method
      //    at runtime after class definition, be sure you do so
      //    via Object.defineProperty to preserve its non-enumerable nature.
      defineProperty(
        proto,
        ATTRIBUTE_CHANGED_CALLBACK,
        {
          configurable: true,
          value: function aCC(name, prev, curr) {
            if (this._init$) {
              checkReady.call(this, created);
              if (this._init$)
                return this._init$$.push(aCC.bind(this, name, prev, curr));
            }
            // ensure setting same value twice
            // won't trigger twice attributeChangedCallback
            if (hasChange && prev !== curr) {
              onChanged.apply(this, arguments);
            }
          }
        }
      );

      // ⚠️ if you need to overwrite/change connectedCallback method
      //    at runtime after class definition, be sure you do so
      //    via Object.defineProperty to preserve its non-enumerable nature.
      const onConnected = proto.connectedCallback;
      const hasConnect = !!onConnected;
      defineProperty(
        proto,
        'connectedCallback',
        {
          configurable: true,
          value: function cC() {
            if (this._init$) {
              checkReady.call(this, created);
              if (this._init$)
                return this._init$$.push(cC.bind(this));
            }
            if (hasConnect) {
              onConnected.apply(this, arguments);
            }
          }
        }
      );
    } else if (hasChange) {
      // ⚠️ if you need to overwrite/change attributeChangedCallback method
      //    at runtime after class definition, be sure you do so
      //    via Object.defineProperty to preserve its non-enumerable nature.
      defineProperty(
        proto,
        ATTRIBUTE_CHANGED_CALLBACK,
        {
          configurable: true,
          value(name, prev, curr) {
            // ensure setting same value twice
            // won't trigger twice attributeChangedCallback
            if (prev !== curr) {
              onChanged.apply(this, arguments);
            }
          }
        }
      );
    }

    // define lazily all handlers
    // class { handleClick() { ... }
    // render() { `<a onclick=${this.handleClick}>` } }
    getOwnPropertyNames(proto).forEach(key => {
      if (/^handle[A-Z]/.test(key)) {
        const _key$ = '_' + key + '$';
        const method = proto[key];
        defineProperty(proto, key, {
          configurable: true,
          get() {
            return  this[_key$] ||
                    (this[_key$] = method.bind(this));
          }
        });
      }
    });

    // whenever you want to directly use the component itself
    // as EventListener, you can pass it directly.
    // https://medium.com/@WebReflection/dom-handleevent-a-cross-platform-standard-since-year-2000-5bf17287fd38
    //  class Reactive extends HyperHTMLElement {
    //    oninput(e) { console.log(this, 'changed', e.target.value); }
    //    render() { this.html`<input oninput="${this}">`; }
    //  }
    if (!('handleEvent' in proto)) {
      // ⚠️ if you need to overwrite/change handleEvent method
      //    at runtime after class definition, be sure you do so
      //    via Object.defineProperty to preserve its non-enumerable nature.
      defineProperty(
        proto,
        'handleEvent',
        {
          configurable: true,
          value(event) {
            this[
              (event.currentTarget.dataset || {}).call ||
              ('on' + event.type)
            ](event);
          }
        }
      );
    }

    if (options && options.extends) {
      const Native = document.createElement(options.extends).constructor;
      const Intermediate = class extends Native {};
      const Super = getPrototypeOf(Class);
      ownKeys(Super)
        .filter(key => [
          'length', 'name', 'arguments', 'caller', 'prototype'
        ].indexOf(key) < 0)
        .forEach(key => defineProperty(
          Intermediate,
          key,
          getOwnPropertyDescriptor(Super, key)
        )
      );
      ownKeys(Super.prototype)
        .forEach(key => defineProperty(
          Intermediate.prototype,
          key,
          getOwnPropertyDescriptor(Super.prototype, key)
        )
      );
      setPrototypeOf(Class, Intermediate);
      setPrototypeOf(proto, Intermediate.prototype);
      customElements.define(name, Class, options);
    } else {
      customElements.define(name, Class);
    }
    classes.push(Class);
    return Class;
  }

  // lazily bind once hyperHTML logic
  // to either the shadowRoot, if present and open,
  // the _shadowRoot property, if set due closed shadow root,
  // or the custom-element itself if no Shadow DOM is used.
  get html() {
    return this._html$ || (this.html = bind(
      // in case of Shadow DOM {mode: "open"}, use it
      this.shadowRoot ||
      // in case of Shadow DOM {mode: "close"}, use it
      // this needs the following reference created upfront
      // this._shadowRoot = this.attachShadow({mode: "close"});
      this._shadowRoot ||
      // if no Shadow DOM is used, simply use the component
      // as container for its own content (it just works too)
      this
    ));
  }

  // it can be set too if necessary, it won't invoke render()
  set html(value) {
    defineProperty(this, '_html$', {configurable: true, value: value});
  }

  // ---------------------//
  // Basic State Handling //
  // ---------------------//

  // overwrite this method with your own render
  render() {}

  // define the default state object
  // you could use observed properties too
  get defaultState() { return {}; }

  // the state with a default
  get state() {
    return this._state$ || (this.state = this.defaultState);
  }

  // it can be set too if necessary, it won't invoke render()
  set state(value) {
    defineProperty(this, '_state$', {configurable: true, value: value});
  }

  // currently a state is a shallow copy, like in Preact or other libraries.
  // after the state is updated, the render() method will be invoked.
  // ⚠️ do not ever call this.setState() inside this.render()
  setState(state, render) {
    const target = this.state;
    const source = typeof state === 'function' ? state.call(this, target) : state;
    for (const key in source) target[key] = source[key];
    if (render !== false) this.render();
    return this;
  }

};

// exposing hyperHTML utilities
HyperHTMLElement.Component = Component;
HyperHTMLElement.bind = bind;
HyperHTMLElement.intent = define;
HyperHTMLElement.wire = wire;
HyperHTMLElement.hyper = hyper;

try {
  if (Symbol.hasInstance) classes.push(
    defineProperty(HyperHTMLElement, Symbol.hasInstance, {
      enumerable: false,
      configurable: true,
      value(instance) {
        return classes.some(isPrototypeOf, getPrototypeOf(instance));
      }
    }));
} catch(meh) {}

Object.defineProperty(exports, '__esModule', {value: true}).default = HyperHTMLElement;

// ------------------------------//
// DOMContentLoaded VS created() //
// ------------------------------//
const dom = {
  type: 'DOMContentLoaded',
  handleEvent() {
    if (dom.ready()) {
      document.removeEventListener(dom.type, dom, false);
      dom.list.splice(0).forEach(invoke);
    }
    else
      setTimeout(dom.handleEvent);
  },
  ready() {
    return document.readyState === 'complete';
  },
  list: []
};

if (!dom.ready()) {
  document.addEventListener(dom.type, dom, false);
}

function checkReady(created) {
  if (dom.ready() || isReady.call(this, created)) {
    if (this._init$) {
      const list = this._init$$;
      if (list) delete this._init$$;
      created.call(defineProperty(this, '_init$', {value: false}));
      if (list) list.forEach(invoke);
    }
  } else {
    if (!this.hasOwnProperty('_init$$'))
      defineProperty(this, '_init$$', {configurable: true, value: []});
    dom.list.push(checkReady.bind(this, created));
  }
}

function invoke(fn) {
  fn();
}

function isPrototypeOf(Class) {
  return this === Class.prototype;
}

function isReady(created) {
  let el = this;
  do { if (el.nextSibling) return true; }
  while (el = el.parentNode);
  setTimeout(checkReady.bind(this, created));
  return false;
}

},{"hyperhtml/cjs":16}],10:[function(require,module,exports){
'use strict';
/* AUTOMATICALLY IMPORTED, DO NOT MODIFY */
/*! (c) 2018 Andrea Giammarchi (ISC) */

const {
  eqeq, identity, indexOf, isReversed, next, append, remove, smartDiff
} = require('./utils.js');

const domdiff = (
  parentNode,     // where changes happen
  currentNodes,   // Array of current items/nodes
  futureNodes,    // Array of future items/nodes
  options         // optional object with one of the following properties
                  //  before: domNode
                  //  compare(generic, generic) => true if same generic
                  //  node(generic) => Node
) => {
  if (!options)
    options = {};

  const compare = options.compare || eqeq;
  const get = options.node || identity;
  const before = options.before == null ? null : get(options.before, 0);

  const currentLength = currentNodes.length;
  let currentEnd = currentLength;
  let currentStart = 0;

  let futureEnd = futureNodes.length;
  let futureStart = 0;

  // common prefix
  while (
    currentStart < currentEnd &&
    futureStart < futureEnd &&
    compare(currentNodes[currentStart], futureNodes[futureStart])
  ) {
    currentStart++;
    futureStart++;
  }

  // common suffix
  while (
    currentStart < currentEnd &&
    futureStart < futureEnd &&
    compare(currentNodes[currentEnd - 1], futureNodes[futureEnd - 1])
  ) {
    currentEnd--;
    futureEnd--;
  }

  const currentSame = currentStart === currentEnd;
  const futureSame = futureStart === futureEnd;

  // same list
  if (currentSame && futureSame)
    return futureNodes;

  // only stuff to add
  if (currentSame && futureStart < futureEnd) {
    append(
      get,
      parentNode,
      futureNodes,
      futureStart,
      futureEnd,
      next(get, currentNodes, currentStart, currentLength, before)
    );
    return futureNodes;
  }

  // only stuff to remove
  if (futureSame && currentStart < currentEnd) {
    remove(
      get,
      parentNode,
      currentNodes,
      currentStart,
      currentEnd
    );
    return futureNodes;
  }

  const currentChanges = currentEnd - currentStart;
  const futureChanges = futureEnd - futureStart;
  let i = -1;

  // 2 simple indels: the shortest sequence is a subsequence of the longest
  if (currentChanges < futureChanges) {
    i = indexOf(
      futureNodes,
      futureStart,
      futureEnd,
      currentNodes,
      currentStart,
      currentEnd,
      compare
    );
    // inner diff
    if (-1 < i) {
      append(
        get,
        parentNode,
        futureNodes,
        futureStart,
        i,
        get(currentNodes[currentStart], 0)
      );
      append(
        get,
        parentNode,
        futureNodes,
        i + currentChanges,
        futureEnd,
        next(get, currentNodes, currentEnd, currentLength, before)
      );
      return futureNodes;
    }
  }
  /* istanbul ignore else */
  else if (futureChanges < currentChanges) {
    i = indexOf(
      currentNodes,
      currentStart,
      currentEnd,
      futureNodes,
      futureStart,
      futureEnd,
      compare
    );
    // outer diff
    if (-1 < i) {
      remove(
        get,
        parentNode,
        currentNodes,
        currentStart,
        i
      );
      remove(
        get,
        parentNode,
        currentNodes,
        i + futureChanges,
        currentEnd
      );
      return futureNodes;
    }
  }

  // common case with one replacement for many nodes
  // or many nodes replaced for a single one
  /* istanbul ignore else */
  if ((currentChanges < 2 || futureChanges < 2)) {
    append(
      get,
      parentNode,
      futureNodes,
      futureStart,
      futureEnd,
      get(currentNodes[currentStart], 0)
    );
    remove(
      get,
      parentNode,
      currentNodes,
      currentStart,
      currentEnd
    );
    return futureNodes;
  }

  // the half match diff part has been skipped in petit-dom
  // https://github.com/yelouafi/petit-dom/blob/bd6f5c919b5ae5297be01612c524c40be45f14a7/src/vdom.js#L391-L397
  // accordingly, I think it's safe to skip in here too
  // if one day it'll come out like the speediest thing ever to do
  // then I might add it in here too

  // Extra: before going too fancy, what about reversed lists ?
  //        This should bail out pretty quickly if that's not the case.
  if (
    currentChanges === futureChanges &&
    isReversed(
      futureNodes,
      futureEnd,
      currentNodes,
      currentStart,
      currentEnd,
      compare
    )
  ) {
    append(
      get,
      parentNode,
      futureNodes,
      futureStart,
      futureEnd,
      next(get, currentNodes, currentEnd, currentLength, before)
    );
    return futureNodes;
  }

  // last resort through a smart diff
  smartDiff(
    get,
    parentNode,
    futureNodes,
    futureStart,
    futureEnd,
    futureChanges,
    currentNodes,
    currentStart,
    currentEnd,
    currentChanges,
    currentLength,
    compare,
    before
  );

  return futureNodes;
};

Object.defineProperty(exports, '__esModule', {value: true}).default = domdiff;

},{"./utils.js":11}],11:[function(require,module,exports){
'use strict';
/* AUTOMATICALLY IMPORTED, DO NOT MODIFY */
const append = (get, parent, children, start, end, before) => {
  if ((end - start) < 2)
    parent.insertBefore(get(children[start], 1), before);
  else {
    const fragment = parent.ownerDocument.createDocumentFragment();
    while (start < end)
      fragment.appendChild(get(children[start++], 1));
    parent.insertBefore(fragment, before);
  }
};
exports.append = append;

const eqeq = (a, b) => a == b;
exports.eqeq = eqeq;

const identity = O => O;
exports.identity = identity;

const indexOf = (
  moreNodes,
  moreStart,
  moreEnd,
  lessNodes,
  lessStart,
  lessEnd,
  compare
) => {
  const length = lessEnd - lessStart;
  /* istanbul ignore if */
  if (length < 1)
    return -1;
  while ((moreEnd - moreStart) >= length) {
    let m = moreStart;
    let l = lessStart;
    while (
      m < moreEnd &&
      l < lessEnd &&
      compare(moreNodes[m], lessNodes[l])
    ) {
      m++;
      l++;
    }
    if (l === lessEnd)
      return moreStart;
    moreStart = m + 1;
  }
  return -1;
};
exports.indexOf = indexOf;

const isReversed = (
  futureNodes,
  futureEnd,
  currentNodes,
  currentStart,
  currentEnd,
  compare
) => {
  while (
    currentStart < currentEnd &&
    compare(
      currentNodes[currentStart],
      futureNodes[futureEnd - 1]
    )) {
      currentStart++;
      futureEnd--;
    };
  return futureEnd === 0;
};
exports.isReversed = isReversed;

const next = (get, list, i, length, before) => i < length ?
              get(list[i], 0) :
              (0 < i ?
                get(list[i - 1], -0).nextSibling :
                before);
exports.next = next;

const remove = (get, parent, children, start, end) => {
  if ((end - start) < 2)
    parent.removeChild(get(children[start], -1));
  else {
    const range = parent.ownerDocument.createRange();
    range.setStartBefore(get(children[start], -1));
    range.setEndAfter(get(children[end - 1], -1));
    range.deleteContents();
  }
};
exports.remove = remove;

// - - - - - - - - - - - - - - - - - - -
// diff related constants and utilities
// - - - - - - - - - - - - - - - - - - -

const DELETION = -1;
const INSERTION = 1;
const SKIP = 0;
const SKIP_OND = 50;

/* istanbul ignore next */
const Rel = typeof Map === 'undefined' ?
  function () {
    const k = [], v = [];
    return {
      has: value => -1 < k.indexOf(value),
      get: value => v[k.indexOf(value)],
      set: value => {
        const i = k.indexOf(value);
        v[i < 0 ? (k.push(value) - 1) : i] = value;
      }
    };
  } :
  Map
;

const HS = (
  futureNodes,
  futureStart,
  futureEnd,
  futureChanges,
  currentNodes,
  currentStart,
  currentEnd,
  currentChanges
) => {

  let k = 0;
  /* istanbul ignore next */
  let minLen = futureChanges < currentChanges ? futureChanges : currentChanges;
  const link = Array(minLen++);
  const tresh = Array(minLen);
  tresh[0] = -1;

  for (let i = 1; i < minLen; i++)
    tresh[i] = currentEnd;

  const keymap = new Rel;
  for (let i = currentStart; i < currentEnd; i++)
    keymap.set(currentNodes[i], i);

  for (let i = futureStart; i < futureEnd; i++) {
    const idxInOld = keymap.get(futureNodes[i]);
    if (idxInOld != null) {
      k = findK(tresh, minLen, idxInOld);
      /* istanbul ignore else */
      if (-1 < k) {
        tresh[k] = idxInOld;
        link[k] = {
          newi: i,
          oldi: idxInOld,
          prev: link[k - 1]
        };
      }
    }
  }

  k = --minLen;
  --currentEnd;
  while (tresh[k] > currentEnd) --k;

  minLen = currentChanges + futureChanges - k;
  const diff = Array(minLen);
  let ptr = link[k];
  --futureEnd;
  while (ptr) {
    const {newi, oldi} = ptr;
    while (futureEnd > newi) {
      diff[--minLen] = INSERTION;
      --futureEnd;
    }
    while (currentEnd > oldi) {
      diff[--minLen] = DELETION;
      --currentEnd;
    }
    diff[--minLen] = SKIP;
    --futureEnd;
    --currentEnd;
    ptr = ptr.prev;
  }
  while (futureEnd >= futureStart) {
    diff[--minLen] = INSERTION;
    --futureEnd;
  }
  while (currentEnd >= currentStart) {
    diff[--minLen] = DELETION;
    --currentEnd;
  }
  return diff;
};

// this is pretty much the same petit-dom code without the delete map part
// https://github.com/yelouafi/petit-dom/blob/bd6f5c919b5ae5297be01612c524c40be45f14a7/src/vdom.js#L556-L561
const OND = (
  futureNodes,
  futureStart,
  rows,
  currentNodes,
  currentStart,
  cols,
  compare
) => {
  const length = rows + cols;
  const v = [];
  let d, k, r, c, pv, cv, pd;
  outer: for (d = 0; d <= length; d++) {
    /* istanbul ignore if */
    if (d > SKIP_OND)
      return null;
    pd = d - 1;
    /* istanbul ignore next */
    pv = d ? v[d - 1] : [0, 0];
    cv = v[d] = [];
    for (k = -d; k <= d; k += 2) {
      if (k === -d || (k !== d && pv[pd + k - 1] < pv[pd + k + 1])) {
        c = pv[pd + k + 1];
      } else {
        c = pv[pd + k - 1] + 1;
      }
      r = c - k;
      while (
        c < cols &&
        r < rows &&
        compare(
          currentNodes[currentStart + c],
          futureNodes[futureStart + r]
        )
      ) {
        c++;
        r++;
      }
      if (c === cols && r === rows) {
        break outer;
      }
      cv[d + k] = c;
    }
  }

  const diff = Array(d / 2 + length / 2);
  let diffIdx = diff.length - 1;
  for (d = v.length - 1; d >= 0; d--) {
    while (
      c > 0 &&
      r > 0 &&
      compare(
        currentNodes[currentStart + c - 1],
        futureNodes[futureStart + r - 1]
      )
    ) {
      // diagonal edge = equality
      diff[diffIdx--] = SKIP;
      c--;
      r--;
    }
    if (!d)
      break;
    pd = d - 1;
    /* istanbul ignore next */
    pv = d ? v[d - 1] : [0, 0];
    k = c - r;
    if (k === -d || (k !== d && pv[pd + k - 1] < pv[pd + k + 1])) {
      // vertical edge = insertion
      r--;
      diff[diffIdx--] = INSERTION;
    } else {
      // horizontal edge = deletion
      c--;
      diff[diffIdx--] = DELETION;
    }
  }
  return diff;
};

const applyDiff = (
  diff,
  get,
  parentNode,
  futureNodes,
  futureStart,
  currentNodes,
  currentStart,
  currentLength,
  before
) => {
  const live = new Rel;
  const length = diff.length;
  let currentIndex = currentStart;
  let i = 0;
  while (i < length) {
    switch (diff[i++]) {
      case SKIP:
        futureStart++;
        currentIndex++;
        break;
      case INSERTION:
        // TODO: bulk appends for sequential nodes
        live.set(futureNodes[futureStart], 1);
        append(
          get,
          parentNode,
          futureNodes,
          futureStart++,
          futureStart,
          currentIndex < currentLength ?
            get(currentNodes[currentIndex], 1) :
            before
        );
        break;
      case DELETION:
        currentIndex++;
        break;
    }
  }
  i = 0;
  while (i < length) {
    switch (diff[i++]) {
      case SKIP:
        currentStart++;
        break;
      case DELETION:
        // TODO: bulk removes for sequential nodes
        if (live.has(currentNodes[currentStart]))
          currentStart++;
        else
          remove(
            get,
            parentNode,
            currentNodes,
            currentStart++,
            currentStart
          );
        break;
    }
  }
};

const findK = (ktr, length, j) => {
  let lo = 1;
  let hi = length;
  while (lo < hi) {
    var mid = ((lo + hi) / 2) >>> 0;
    if (j < ktr[mid])
      hi = mid;
    else
      lo = mid + 1;
  }
  return lo;
}

const smartDiff = (
  get,
  parentNode,
  futureNodes,
  futureStart,
  futureEnd,
  futureChanges,
  currentNodes,
  currentStart,
  currentEnd,
  currentChanges,
  currentLength,
  compare,
  before
) => {
  applyDiff(
    OND(
      futureNodes,
      futureStart,
      futureChanges,
      currentNodes,
      currentStart,
      currentChanges,
      compare
    ) ||
    HS(
      futureNodes,
      futureStart,
      futureEnd,
      futureChanges,
      currentNodes,
      currentStart,
      currentEnd,
      currentChanges
    ),
    get,
    parentNode,
    futureNodes,
    futureStart,
    currentNodes,
    currentStart,
    currentLength,
    before
  );
};
exports.smartDiff = smartDiff;

},{}],12:[function(require,module,exports){
'use strict';
const { Map, WeakMap } = require('../shared/poorlyfills.js');

// hyperHTML.Component is a very basic class
// able to create Custom Elements like components
// including the ability to listen to connect/disconnect
// events via onconnect/ondisconnect attributes
// Components can be created imperatively or declaratively.
// The main difference is that declared components
// will not automatically render on setState(...)
// to simplify state handling on render.
function Component() {
  return this; // this is needed in Edge !!!
}
Object.defineProperty(exports, '__esModule', {value: true}).default = Component

// Component is lazily setup because it needs
// wire mechanism as lazy content
function setup(content) {
  // there are various weakly referenced variables in here
  // and mostly are to use Component.for(...) static method.
  const children = new WeakMap;
  const create = Object.create;
  const createEntry = (wm, id, component) => {
    wm.set(id, component);
    return component;
  };
  const get = (Class, info, context, id) => {
    const relation = info.get(Class) || relate(Class, info);
    switch (typeof id) {
      case 'object':
      case 'function':
        const wm = relation.w || (relation.w = new WeakMap);
        return wm.get(id) || createEntry(wm, id, new Class(context));
      default:
        const sm = relation.p || (relation.p = create(null));
        return sm[id] || (sm[id] = new Class(context));
    }
  };
  const relate = (Class, info) => {
    const relation = {w: null, p: null};
    info.set(Class, relation);
    return relation;
  };
  const set = context => {
    const info = new Map;
    children.set(context, info);
    return info;
  };
  // The Component Class
  Object.defineProperties(
    Component,
    {
      // Component.for(context[, id]) is a convenient way
      // to automatically relate data/context to children components
      // If not created yet, the new Component(context) is weakly stored
      // and after that same instance would always be returned.
      for: {
        configurable: true,
        value(context, id) {
          return get(
            this,
            children.get(context) || set(context),
            context,
            id == null ?
              'default' : id
          );
        }
      }
    }
  );
  Object.defineProperties(
    Component.prototype,
    {
      // all events are handled with the component as context
      handleEvent: {value(e) {
        const ct = e.currentTarget;
        this[
          ('getAttribute' in ct && ct.getAttribute('data-call')) ||
          ('on' + e.type)
        ](e);
      }},
      // components will lazily define html or svg properties
      // as soon as these are invoked within the .render() method
      // Such render() method is not provided by the base class
      // but it must be available through the Component extend.
      // Declared components could implement a
      // render(props) method too and use props as needed.
      html: lazyGetter('html', content),
      svg: lazyGetter('svg', content),
      // the state is a very basic/simple mechanism inspired by Preact
      state: lazyGetter('state', function () { return this.defaultState; }),
      // it is possible to define a default state that'd be always an object otherwise
      defaultState: {get() { return {}; }},
      // dispatch a bubbling, cancelable, custom event
      // through the first known/available node
      dispatch: {value(type, detail) {
        const {_wire$} = this;
        if (_wire$) {
          const event = new CustomEvent(type, {
            bubbles: true,
            cancelable: true,
            detail
          });
          event.component = this;
          return (_wire$.dispatchEvent ?
                    _wire$ :
                    _wire$.childNodes[0]
                  ).dispatchEvent(event);
        }
        return false;
      }},
      // setting some property state through a new object
      // or a callback, triggers also automatically a render
      // unless explicitly specified to not do so (render === false)
      setState: {value(state, render) {
        const target = this.state;
        const source = typeof state === 'function' ? state.call(this, target) : state;
        for (const key in source) target[key] = source[key];
        if (render !== false)
          this.render();
        return this;
      }}
    }
  );
}
exports.setup = setup

// instead of a secret key I could've used a WeakMap
// However, attaching a property directly will result
// into better performance with thousands of components
// hanging around, and less memory pressure caused by the WeakMap
const lazyGetter = (type, fn) => {
  const secret = '_' + type + '$';
  return {
    get() {
      return this[secret] || setValue(this, secret, fn.call(this, type));
    },
    set(value) {
      setValue(this, secret, value);
    }
  };
};

// shortcut to set value on get or set(value)
const setValue = (self, secret, value) =>
  Object.defineProperty(self, secret, {
    configurable: true,
    value: typeof value === 'function' ?
      function () {
        return (self._wire$ = value.apply(this, arguments));
      } :
      value
  })[secret]
;

},{"../shared/poorlyfills.js":24}],13:[function(require,module,exports){
'use strict';
const { append } = require('../shared/utils.js');
const { doc, fragment } = require('../shared/easy-dom.js');

function Wire(childNodes) {
  this.childNodes = childNodes;
  this.length = childNodes.length;
  this.first = childNodes[0];
  this.last = childNodes[this.length - 1];
}
Object.defineProperty(exports, '__esModule', {value: true}).default = Wire

// when a wire is inserted, all its nodes will follow
Wire.prototype.insert = function insert() {
  const df = fragment(this.first);
  append(df, this.childNodes);
  return df;
};

// when a wire is removed, all its nodes must be removed as well
Wire.prototype.remove = function remove() {
  const first = this.first;
  const last = this.last;
  if (this.length === 2) {
    last.parentNode.removeChild(last);
  } else {
    const range = doc(first).createRange();
    range.setStartBefore(this.childNodes[1]);
    range.setEndAfter(last);
    range.deleteContents();
  }
  return first;
};

},{"../shared/easy-dom.js":22,"../shared/utils.js":26}],14:[function(require,module,exports){
'use strict';
const {Map, WeakMap} = require('../shared/poorlyfills.js');
const {G, UIDC, VOID_ELEMENTS} = require('../shared/constants.js');
const Updates = (m => m.__esModule ? m.default : m)(require('../objects/Updates.js'));
const {
  createFragment,
  importNode,
  unique,
  TemplateMap
} = require('../shared/utils.js');

const {selfClosing} = require('../shared/re.js');

// a weak collection of contexts that
// are already known to hyperHTML
const bewitched = new WeakMap;

// all unique template literals
const templates = TemplateMap();

// better known as hyper.bind(node), the render is
// the main tag function in charge of fully upgrading
// or simply updating, contexts used as hyperHTML targets.
// The `this` context is either a regular DOM node or a fragment.
function render(template) {
  const wicked = bewitched.get(this);
  if (wicked && wicked.template === unique(template)) {
    update.apply(wicked.updates, arguments);
  } else {
    upgrade.apply(this, arguments);
  }
  return this;
}

// an upgrade is in charge of collecting template info,
// parse it once, if unknown, to map all interpolations
// as single DOM callbacks, relate such template
// to the current context, and render it after cleaning the context up
function upgrade(template) {
  template = unique(template);
  const info =  templates.get(template) ||
                createTemplate.call(this, template);
  const fragment = importNode(this.ownerDocument, info.fragment);
  const updates = Updates.create(fragment, info.paths);
  bewitched.set(this, {template, updates});
  update.apply(updates, arguments);
  this.textContent = '';
  this.appendChild(fragment);
}

// an update simply loops over all mapped DOM operations
function update() {
  const length = arguments.length;
  for (let i = 1; i < length; i++) {
    this[i - 1](arguments[i]);
  }
}

// a template can be used to create a document fragment
// aware of all interpolations and with a list
// of paths used to find once those nodes that need updates,
// no matter if these are attributes, text nodes, or regular one
function createTemplate(template) {
  const paths = [];
  const html = template.join(UIDC).replace(SC_RE, SC_PLACE);
  const fragment = createFragment(this, html);
  Updates.find(fragment, paths, template.slice());
  const info = {fragment, paths};
  templates.set(template, info);
  return info;
}

// some node could be special though, like a custom element
// with a self closing tag, which should work through these changes.
const SC_RE = selfClosing;
const SC_PLACE = ($0, $1, $2) => {
  return VOID_ELEMENTS.test($1) ? $0 : ('<' + $1 + $2 + '></' + $1 + '>');
};

Object.defineProperty(exports, '__esModule', {value: true}).default = render;

},{"../objects/Updates.js":20,"../shared/constants.js":21,"../shared/poorlyfills.js":24,"../shared/re.js":25,"../shared/utils.js":26}],15:[function(require,module,exports){
'use strict';
const {ELEMENT_NODE, SVG_NAMESPACE} = require('../shared/constants.js');
const {WeakMap, trim} = require('../shared/poorlyfills.js');
const {fragment} = require('../shared/easy-dom.js');
const {append, slice, unique} = require('../shared/utils.js');
const Wire = (m => m.__esModule ? m.default : m)(require('../classes/Wire.js'));
const render = (m => m.__esModule ? m.default : m)(require('./render.js'));

// all wires used per each context
const wires = new WeakMap;

// A wire is a callback used as tag function
// to lazily relate a generic object to a template literal.
// hyper.wire(user)`<div id=user>${user.name}</div>`; => the div#user
// This provides the ability to have a unique DOM structure
// related to a unique JS object through a reusable template literal.
// A wire can specify a type, as svg or html, and also an id
// via html:id or :id convention. Such :id allows same JS objects
// to be associated to different DOM structures accordingly with
// the used template literal without losing previously rendered parts.
const wire = (obj, type) => obj == null ?
  content(type || 'html') :
  weakly(obj, type || 'html');

// A wire content is a virtual reference to one or more nodes.
// It's represented by either a DOM node, or an Array.
// In both cases, the wire content role is to simply update
// all nodes through the list of related callbacks.
// In few words, a wire content is like an invisible parent node
// in charge of updating its content like a bound element would do.
const content = type => {
  let wire, container, content, template, updates;
  return function (statics) {
    statics = unique(statics);
    let setup = template !== statics;
    if (setup) {
      template = statics;
      content = fragment(document);
      container = type === 'svg' ?
        document.createElementNS(SVG_NAMESPACE, 'svg') :
        content;
      updates = render.bind(container);
    }
    updates.apply(null, arguments);
    if (setup) {
      if (type === 'svg') {
        append(content, slice.call(container.childNodes));
      }
      wire = wireContent(content);
    }
    return wire;
  };
};

// wires are weakly created through objects.
// Each object can have multiple wires associated
// and this is thanks to the type + :id feature.
const weakly = (obj, type) => {
  const i = type.indexOf(':');
  let wire = wires.get(obj);
  let id = type;
  if (-1 < i) {
    id = type.slice(i + 1);
    type = type.slice(0, i) || 'html';
  }
  if (!wire) wires.set(obj, wire = {});
  return wire[id] || (wire[id] = content(type));
};

// a document fragment loses its nodes as soon
// as it's appended into another node.
// This would easily lose wired content
// so that on a second render call, the parent
// node wouldn't know which node was there
// associated to the interpolation.
// To prevent hyperHTML to forget about wired nodes,
// these are either returned as Array or, if there's ony one entry,
// as single referenced node that won't disappear from the fragment.
// The initial fragment, at this point, would be used as unique reference.
const wireContent = node => {
  const childNodes = node.childNodes;
  const length = childNodes.length;
  const wireNodes = [];
  for (let i = 0; i < length; i++) {
    let child = childNodes[i];
    if (
      child.nodeType === ELEMENT_NODE ||
      trim.call(child.textContent).length !== 0
    ) {
      wireNodes.push(child);
    }
  }
  return wireNodes.length === 1 ? wireNodes[0] : new Wire(wireNodes);
};

exports.content = content;
exports.weakly = weakly;
Object.defineProperty(exports, '__esModule', {value: true}).default = wire;

},{"../classes/Wire.js":13,"../shared/constants.js":21,"../shared/easy-dom.js":22,"../shared/poorlyfills.js":24,"../shared/utils.js":26,"./render.js":14}],16:[function(require,module,exports){
'use strict';
/*! (c) Andrea Giammarchi (ISC) */

const Component = (m => m.__esModule ? m.default : m)(require('./classes/Component.js'));
const {setup} = require('./classes/Component.js');
const Intent = (m => m.__esModule ? m.default : m)(require('./objects/Intent.js'));
const wire = (m => m.__esModule ? m.default : m)(require('./hyper/wire.js'));
const {content, weakly} = require('./hyper/wire.js');
const render = (m => m.__esModule ? m.default : m)(require('./hyper/render.js'));
const diff = (m => m.__esModule ? m.default : m)(require('./3rd/domdiff.js'));

// all functions are self bound to the right context
// you can do the following
// const {bind, wire} = hyperHTML;
// and use them right away: bind(node)`hello!`;
const bind = context => render.bind(context);
const define = Intent.define;

hyper.Component = Component;
hyper.bind = bind;
hyper.define = define;
hyper.diff = diff;
hyper.hyper = hyper;
hyper.wire = wire;

// the wire content is the lazy defined
// html or svg property of each hyper.Component
setup(content);

// everything is exported directly or through the
// hyperHTML callback, when used as top level script
exports.Component = Component;
exports.bind = bind;
exports.define = define;
exports.diff = diff;
exports.hyper = hyper;
exports.wire = wire;

// by default, hyperHTML is a smart function
// that "magically" understands what's the best
// thing to do with passed arguments
function hyper(HTML) {
  return arguments.length < 2 ?
    (HTML == null ?
      content('html') :
      (typeof HTML === 'string' ?
        hyper.wire(null, HTML) :
        ('raw' in HTML ?
          content('html')(HTML) :
          ('nodeType' in HTML ?
            hyper.bind(HTML) :
            weakly(HTML, 'html')
          )
        )
      )) :
    ('raw' in HTML ?
      content('html') : hyper.wire
    ).apply(null, arguments);
}
Object.defineProperty(exports, '__esModule', {value: true}).default = hyper

},{"./3rd/domdiff.js":10,"./classes/Component.js":12,"./hyper/render.js":14,"./hyper/wire.js":15,"./objects/Intent.js":17}],17:[function(require,module,exports){
'use strict';
const attributes = {};
const intents = {};
const keys = [];
const hasOwnProperty = intents.hasOwnProperty;

let length = 0;

Object.defineProperty(exports, '__esModule', {value: true}).default = {

  // used to invoke right away hyper:attributes
  attributes,

  // hyperHTML.define('intent', (object, update) => {...})
  // can be used to define a third parts update mechanism
  // when every other known mechanism failed.
  // hyper.define('user', info => info.name);
  // hyper(node)`<p>${{user}}</p>`;
  define: (intent, callback) => {
    if (intent.indexOf('-') < 0) {
      if (!(intent in intents)) {
        length = keys.push(intent);
      }
      intents[intent] = callback;
    } else {
      attributes[intent] = callback;
    }
  },

  // this method is used internally as last resort
  // to retrieve a value out of an object
  invoke: (object, callback) => {
    for (let i = 0; i < length; i++) {
      let key = keys[i];
      if (hasOwnProperty.call(object, key)) {
        return intents[key](object[key], callback);
      }
    }
  }
};

},{}],18:[function(require,module,exports){
'use strict';
const {
  COMMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
  ELEMENT_NODE
} = require('../shared/constants.js');

// every template literal interpolation indicates
// a precise target in the DOM the template is representing.
// `<p id=${'attribute'}>some ${'content'}</p>`
// hyperHTML finds only once per template literal,
// hence once per entire application life-cycle,
// all nodes that are related to interpolations.
// These nodes are stored as indexes used to retrieve,
// once per upgrade, nodes that will change on each future update.
// A path example is [2, 0, 1] representing the operation:
// node.childNodes[2].childNodes[0].childNodes[1]
// Attributes are addressed via their owner node and their name.
const createPath = node => {
  const path = [];
  let parentNode;
  switch (node.nodeType) {
    case ELEMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      parentNode = node;
      break;
    case COMMENT_NODE:
      parentNode = node.parentNode;
      prepend(path, parentNode, node);
      break;
    default:
      parentNode = node.ownerElement;
      break;
  }
  for (
    node = parentNode;
    (parentNode = parentNode.parentNode);
    node = parentNode
  ) {
    prepend(path, parentNode, node);
  }
  return path;
};

const prepend = (path, parent, node) => {
  path.unshift(path.indexOf.call(parent.childNodes, node));
};

Object.defineProperty(exports, '__esModule', {value: true}).default = {
  create: (type, node, name) => ({type, name, node, path: createPath(node)}),
  find: (node, path) => {
    const length = path.length;
    for (let i = 0; i < length; i++) {
      node = node.childNodes[path[i]];
    }
    return node;
  }
}

},{"../shared/constants.js":21}],19:[function(require,module,exports){
'use strict';
// from https://github.com/developit/preact/blob/33fc697ac11762a1cb6e71e9847670d047af7ce5/src/constants.js
const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

// style is handled as both string and object
// even if the target is an SVG element (consistency)
Object.defineProperty(exports, '__esModule', {value: true}).default = (node, original, isSVG) => {
  if (isSVG) {
    const style = original.cloneNode(true);
    style.value = '';
    node.setAttributeNode(style);
    return update(style, isSVG);
  }
  return update(node.style, isSVG);
};

// the update takes care or changing/replacing
// only properties that are different or
// in case of string, the whole node
const update = (style, isSVG) => {
  let oldType, oldValue;
  return newValue => {
    switch (typeof newValue) {
      case 'object':
        if (newValue) {
          if (oldType === 'object') {
            if (!isSVG) {
              if (oldValue !== newValue) {
                for (const key in oldValue) {
                  if (!(key in newValue)) {
                    style[key] = '';
                  }
                }
              }
            }
          } else {
            if (isSVG)
              style.value = '';
            else
              style.cssText = '';
          }
          const info = isSVG ? {} : style;
          for (const key in newValue) {
            const value = newValue[key];
            const styleValue = typeof value === 'number' &&
                                !IS_NON_DIMENSIONAL.test(key) ?
                                (value + 'px') : value;
            if (/^--/.test(key))
              info.setProperty(key, styleValue);
            else
              info[key] = styleValue;
          }
          oldType = 'object';
          if (isSVG)
            style.value = toStyle((oldValue = info));
          else
            oldValue = newValue;
          break;
        }
      default:
        if (oldValue != newValue) {
          oldType = 'string';
          oldValue = newValue;
          if (isSVG)
            style.value = newValue || '';
          else
            style.cssText = newValue || '';
        }
        break;
    }
  };
};

const hyphen = /([^A-Z])([A-Z]+)/g;
const ized = ($0, $1, $2) => $1 + '-' + $2.toLowerCase();
const toStyle = object => {
  const css = [];
  for (const key in object) {
    css.push(key.replace(hyphen, ized), ':', object[key], ';');
  }
  return css.join('');
};
},{}],20:[function(require,module,exports){
'use strict';
const {
  CONNECTED, DISCONNECTED, COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, ELEMENT_NODE, TEXT_NODE, OWNER_SVG_ELEMENT, SHOULD_USE_TEXT_CONTENT, UID, UIDC
} = require('../shared/constants.js');

const Component = (m => m.__esModule ? m.default : m)(require('../classes/Component.js'));
const Wire = (m => m.__esModule ? m.default : m)(require('../classes/Wire.js'));
const Path = (m => m.__esModule ? m.default : m)(require('./Path.js'));
const Style = (m => m.__esModule ? m.default : m)(require('./Style.js'));
const Intent = (m => m.__esModule ? m.default : m)(require('./Intent.js'));
const domdiff = (m => m.__esModule ? m.default : m)(require('../3rd/domdiff.js'));
// see /^script$/i.test(nodeName) bit down here
// import { create as createElement, text } from '../shared/easy-dom.js';
const { text } = require('../shared/easy-dom.js');
const { Event, WeakSet, isArray, trim } = require('../shared/poorlyfills.js');
const { createFragment, getChildren, slice } = require('../shared/utils.js');

// hyper.Component have a connected/disconnected
// mechanism provided by MutationObserver
// This weak set is used to recognize components
// as DOM node that needs to trigger connected/disconnected events
const components = new WeakSet;

// a basic dictionary used to filter already cached attributes
// while looking for special hyperHTML values.
function Cache() {}
Cache.prototype = Object.create(null);

// returns an intent to explicitly inject content as html
const asHTML = html => ({html});

// returns nodes from wires and components
const asNode = (item, i) => {
  return 'ELEMENT_NODE' in item ?
    item :
    (item.constructor === Wire ?
      // in the Wire case, the content can be
      // removed, post-pended, inserted, or pre-pended and
      // all these cases are handled by domdiff already
      /* istanbul ignore next */
      ((1 / i) < 0 ?
        (i ? item.remove() : item.last) :
        (i ? item.insert() : item.first)) :
      asNode(item.render(), i));
}

// returns true if domdiff can handle the value
const canDiff = value =>  'ELEMENT_NODE' in value ||
value instanceof Wire ||
value instanceof Component;

// updates are created once per context upgrade
// within the main render function (../hyper/render.js)
// These are an Array of callbacks to invoke passing
// each interpolation value.
// Updates can be related to any kind of content,
// attributes, or special text-only cases such <style>
// elements or <textarea>
const create = (root, paths) => {
  const updates = [];
  const length = paths.length;
  for (let i = 0; i < length; i++) {
    const info = paths[i];
    const node = Path.find(root, info.path);
    switch (info.type) {
      case 'any':
        updates.push(setAnyContent(node, []));
        break;
      case 'attr':
        updates.push(setAttribute(node, info.name, info.node));
        break;
      case 'text':
        updates.push(setTextContent(node));
        node.textContent = '';
        break;
    }
  }
  return updates;
};

// finding all paths is a one-off operation performed
// when a new template literal is used.
// The goal is to map all target nodes that will be
// used to update content/attributes every time
// the same template literal is used to create content.
// The result is a list of paths related to the template
// with all the necessary info to create updates as
// list of callbacks that target directly affected nodes.
const find = (node, paths, parts) => {
  const childNodes = node.childNodes;
  const length = childNodes.length;
  for (let i = 0; i < length; i++) {
    let child = childNodes[i];
    switch (child.nodeType) {
      case ELEMENT_NODE:
        findAttributes(child, paths, parts);
        find(child, paths, parts);
        break;
      case COMMENT_NODE:
        if (child.textContent === UID) {
          parts.shift();
          paths.push(
            // basicHTML or other non standard engines
            // might end up having comments in nodes
            // where they shouldn't, hence this check.
            SHOULD_USE_TEXT_CONTENT.test(node.nodeName) ?
              Path.create('text', node) :
              Path.create('any', child)
          );
        }
        break;
      case TEXT_NODE:
        // the following ignore is actually covered by browsers
        // only basicHTML ends up on previous COMMENT_NODE case
        // instead of TEXT_NODE because it knows nothing about
        // special style or textarea behavior
        /* istanbul ignore if */
        if (
          SHOULD_USE_TEXT_CONTENT.test(node.nodeName) &&
          trim.call(child.textContent) === UIDC
        ) {
          parts.shift();
          paths.push(Path.create('text', node));
        }
        break;
    }
  }
};

// attributes are searched via unique hyperHTML id value.
// Despite HTML being case insensitive, hyperHTML is able
// to recognize attributes by name in a caseSensitive way.
// This plays well with Custom Elements definitions
// and also with XML-like environments, without trusting
// the resulting DOM but the template literal as the source of truth.
// IE/Edge has a funny bug with attributes and these might be duplicated.
// This is why there is a cache in charge of being sure no duplicated
// attributes are ever considered in future updates.
const findAttributes = (node, paths, parts) => {
  const cache = new Cache;
  const attributes = node.attributes;
  const array = slice.call(attributes);
  const remove = [];
  const length = array.length;
  for (let i = 0; i < length; i++) {
    const attribute = array[i];
    if (attribute.value === UID) {
      const name = attribute.name;
      // the following ignore is covered by IE
      // and the IE9 double viewBox test
      /* istanbul ignore else */
      if (!(name in cache)) {
        const realName = parts.shift().replace(/^(?:|[\S\s]*?\s)(\S+?)=['"]?$/, '$1');
        cache[name] = attributes[realName] ||
                      // the following ignore is covered by browsers
                      // while basicHTML is already case-sensitive
                      /* istanbul ignore next */
                      attributes[realName.toLowerCase()];
        paths.push(Path.create('attr', cache[name], realName));
      }
      remove.push(attribute);
    }
  }
  const len = remove.length;
  for (let i = 0; i < len; i++) {
    // Edge HTML bug #16878726
    const attribute = remove[i];
    if (/^id$/i.test(attribute.name))
      node.removeAttribute(attribute.name);
    // standard browsers would work just fine here
    else
      node.removeAttributeNode(remove[i]);
  }

  // This is a very specific Firefox/Safari issue
  // but since it should be a not so common pattern,
  // it's probably worth patching regardless.
  // Basically, scripts created through strings are death.
  // You need to create fresh new scripts instead.
  // TODO: is there any other node that needs such nonsense?
  const nodeName = node.nodeName;
  if (/^script$/i.test(nodeName)) {
    // this used to be like that
    // const script = createElement(node, nodeName);
    // then Edge arrived and decided that scripts created
    // through template documents aren't worth executing
    // so it became this ... hopefully it won't hurt in the wild
    const script = document.createElement(nodeName);
    for (let i = 0; i < attributes.length; i++) {
      script.setAttributeNode(attributes[i].cloneNode(true));
    }
    script.textContent = node.textContent;
    node.parentNode.replaceChild(script, node);
  }
};

// when a Promise is used as interpolation value
// its result must be parsed once resolved.
// This callback is in charge of understanding what to do
// with a returned value once the promise is resolved.
const invokeAtDistance = (value, callback) => {
  callback(value.placeholder);
  if ('text' in value) {
    Promise.resolve(value.text).then(String).then(callback);
  } else if ('any' in value) {
    Promise.resolve(value.any).then(callback);
  } else if ('html' in value) {
    Promise.resolve(value.html).then(asHTML).then(callback);
  } else {
    Promise.resolve(Intent.invoke(value, callback)).then(callback);
  }
};

// quick and dirty way to check for Promise/ish values
const isPromise_ish = value => value != null && 'then' in value;

// in a hyper(node)`<div>${content}</div>` case
// everything could happen:
//  * it's a JS primitive, stored as text
//  * it's null or undefined, the node should be cleaned
//  * it's a component, update the content by rendering it
//  * it's a promise, update the content once resolved
//  * it's an explicit intent, perform the desired operation
//  * it's an Array, resolve all values if Promises and/or
//    update the node with the resulting list of content
const setAnyContent = (node, childNodes) => {
  const diffOptions = {node: asNode, before: node};
  let fastPath = false;
  let oldValue;
  const anyContent = value => {
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
        if (fastPath) {
          if (oldValue !== value) {
            oldValue = value;
            childNodes[0].textContent = value;
          }
        } else {
          fastPath = true;
          oldValue = value;
          childNodes = domdiff(
            node.parentNode,
            childNodes,
            [text(node, value)],
            diffOptions
          );
        }
        break;
      case 'object':
      case 'undefined':
        if (value == null) {
          fastPath = false;
          childNodes = domdiff(
            node.parentNode,
            childNodes,
            [],
            diffOptions
          );
          break;
        }
      default:
        fastPath = false;
        oldValue = value;
        if (isArray(value)) {
          if (value.length === 0) {
            if (childNodes.length) {
              childNodes = domdiff(
                node.parentNode,
                childNodes,
                [],
                diffOptions
              );
            }
          } else {
            switch (typeof value[0]) {
              case 'string':
              case 'number':
              case 'boolean':
                anyContent({html: value});
                break;
              case 'object':
                if (isArray(value[0])) {
                  value = value.concat.apply([], value);
                }
                if (isPromise_ish(value[0])) {
                  Promise.all(value).then(anyContent);
                  break;
                }
              default:
                childNodes = domdiff(
                  node.parentNode,
                  childNodes,
                  value,
                  diffOptions
                );
                break;
            }
          }
        } else if (canDiff(value)) {
          childNodes = domdiff(
            node.parentNode,
            childNodes,
            value.nodeType === DOCUMENT_FRAGMENT_NODE ?
              slice.call(value.childNodes) :
              [value],
            diffOptions
          );
        } else if (isPromise_ish(value)) {
          value.then(anyContent);
        } else if ('placeholder' in value) {
          invokeAtDistance(value, anyContent);
        } else if ('text' in value) {
          anyContent(String(value.text));
        } else if ('any' in value) {
          anyContent(value.any);
        } else if ('html' in value) {
          childNodes = domdiff(
            node.parentNode,
            childNodes,
            slice.call(
              createFragment(
                node,
                [].concat(value.html).join('')
              ).childNodes
            ),
            diffOptions
          );
        } else if ('length' in value) {
          anyContent(slice.call(value));
        } else {
          anyContent(Intent.invoke(value, anyContent));
        }
        break;
    }
  };
  return anyContent;
};

// there are four kind of attributes, and related behavior:
//  * events, with a name starting with `on`, to add/remove event listeners
//  * special, with a name present in their inherited prototype, accessed directly
//  * regular, accessed through get/setAttribute standard DOM methods
//  * style, the only regular attribute that also accepts an object as value
//    so that you can style=${{width: 120}}. In this case, the behavior has been
//    fully inspired by Preact library and its simplicity.
const setAttribute = (node, name, original) => {
  const isSVG = OWNER_SVG_ELEMENT in node;
  let oldValue;
  // if the attribute is the style one
  // handle it differently from others
  if (name === 'style') {
    return Style(node, original, isSVG);
  }
  // the name is an event one,
  // add/remove event listeners accordingly
  else if (/^on/.test(name)) {
    let type = name.slice(2);
    if (type === CONNECTED || type === DISCONNECTED) {
      if (notObserving) {
        notObserving = false;
        observe();
      }
      components.add(node);
    }
    else if (name.toLowerCase() in node) {
      type = type.toLowerCase();
    }
    return newValue => {
      if (oldValue !== newValue) {
        if (oldValue) node.removeEventListener(type, oldValue, false);
        oldValue = newValue;
        if (newValue) node.addEventListener(type, newValue, false);
      }
    };
  }
  // the attribute is special ('value' in input)
  // and it's not SVG *or* the name is exactly data,
  // in this case assign the value directly
  else if (name === 'data' || (!isSVG && name in node)) {
    return newValue => {
      if (oldValue !== newValue) {
        oldValue = newValue;
        if (node[name] !== newValue) {
          node[name] = newValue;
          if (newValue == null) {
            node.removeAttribute(name);
          }
        }
      }
    };
  }
  else if (name in Intent.attributes) {
    return any => {
      oldValue = Intent.attributes[name](node, any);
      node.setAttribute(name, oldValue == null ? '' : oldValue);
    };
  }
  // in every other case, use the attribute node as it is
  // update only the value, set it as node only when/if needed
  else {
    let owner = false;
    const attribute = original.cloneNode(true);
    return newValue => {
      if (oldValue !== newValue) {
        oldValue = newValue;
        if (attribute.value !== newValue) {
          if (newValue == null) {
            if (owner) {
              owner = false;
              node.removeAttributeNode(attribute);
            }
            attribute.value = newValue;
          } else {
            attribute.value = newValue;
            if (!owner) {
              owner = true;
              node.setAttributeNode(attribute);
            }
          }
        }
      }
    };
  }
};

// style or textareas don't accept HTML as content
// it's pointless to transform or analyze anything
// different from text there but it's worth checking
// for possible defined intents.
const setTextContent = node => {
  let oldValue;
  const textContent = value => {
    if (oldValue !== value) {
      oldValue = value;
      if (typeof value === 'object' && value) {
        if (isPromise_ish(value)) {
          value.then(textContent);
        } else if ('placeholder' in value) {
          invokeAtDistance(value, textContent);
        } else if ('text' in value) {
          textContent(String(value.text));
        } else if ('any' in value) {
          textContent(value.any);
        } else if ('html' in value) {
          textContent([].concat(value.html).join(''));
        } else if ('length' in value) {
          textContent(slice.call(value).join(''));
        } else {
          textContent(Intent.invoke(value, textContent));
        }
      } else {
        node.textContent = value == null ? '' : value;
      }
    }
  };
  return textContent;
};

Object.defineProperty(exports, '__esModule', {value: true}).default = {create, find};

// hyper.Components might need connected/disconnected notifications
// used by components and their onconnect/ondisconnect callbacks.
// When one of these callbacks is encountered,
// the document starts being observed.
let notObserving = true;
function observe() {

  // when hyper.Component related DOM nodes
  // are appended or removed from the live tree
  // these might listen to connected/disconnected events
  // This utility is in charge of finding all components
  // involved in the DOM update/change and dispatch
  // related information to them
  const dispatchAll = (nodes, type) => {
    const event = new Event(type);
    const length = nodes.length;
    for (let i = 0; i < length; i++) {
      let node = nodes[i];
      if (node.nodeType === ELEMENT_NODE) {
        dispatchTarget(node, event);
      }
    }
  };

  // the way it's done is via the components weak set
  // and recursively looking for nested components too
  const dispatchTarget = (node, event) => {
    if (components.has(node)) {
      node.dispatchEvent(event);
    }

    /* istanbul ignore next */
    const children = node.children || getChildren(node);
    const length = children.length;
    for (let i = 0; i < length; i++) {
      dispatchTarget(children[i], event);
    }
  }

  // The MutationObserver is the best way to implement that
  // but there is a fallback to deprecated DOMNodeInserted/Removed
  // so that even older browsers/engines can help components life-cycle
  try {
    (new MutationObserver(records => {
      const length = records.length;
      for (let i = 0; i < length; i++) {
        let record = records[i];
        dispatchAll(record.removedNodes, DISCONNECTED);
        dispatchAll(record.addedNodes, CONNECTED);
      }
    })).observe(document, {subtree: true, childList: true});
  } catch(o_O) {
    document.addEventListener('DOMNodeRemoved', event => {
      dispatchAll([event.target], DISCONNECTED);
    }, false);
    document.addEventListener('DOMNodeInserted', event => {
      dispatchAll([event.target], CONNECTED);
    }, false);
  }
}

},{"../3rd/domdiff.js":10,"../classes/Component.js":12,"../classes/Wire.js":13,"../shared/constants.js":21,"../shared/easy-dom.js":22,"../shared/poorlyfills.js":24,"../shared/utils.js":26,"./Intent.js":17,"./Path.js":18,"./Style.js":19}],21:[function(require,module,exports){
'use strict';
const G = document.defaultView;
exports.G = G;

// Node.CONSTANTS
// 'cause some engine has no global Node defined
// (i.e. Node, NativeScript, basicHTML ... )
const ELEMENT_NODE = 1;
exports.ELEMENT_NODE = ELEMENT_NODE;
const ATTRIBUTE_NODE = 2;
exports.ATTRIBUTE_NODE = ATTRIBUTE_NODE;
const TEXT_NODE = 3;
exports.TEXT_NODE = TEXT_NODE;
const COMMENT_NODE = 8;
exports.COMMENT_NODE = COMMENT_NODE;
const DOCUMENT_FRAGMENT_NODE = 11;
exports.DOCUMENT_FRAGMENT_NODE = DOCUMENT_FRAGMENT_NODE;

// HTML related constants
const VOID_ELEMENTS = /^area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr$/i;
exports.VOID_ELEMENTS = VOID_ELEMENTS;

// SVG related constants
const OWNER_SVG_ELEMENT = 'ownerSVGElement';
exports.OWNER_SVG_ELEMENT = OWNER_SVG_ELEMENT;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
exports.SVG_NAMESPACE = SVG_NAMESPACE;

// Custom Elements / MutationObserver constants
const CONNECTED = 'connected';
exports.CONNECTED = CONNECTED;
const DISCONNECTED = 'dis' + CONNECTED;
exports.DISCONNECTED = DISCONNECTED;

// hyperHTML related constants
const EXPANDO = '_hyper: ';
exports.EXPANDO = EXPANDO;
const SHOULD_USE_TEXT_CONTENT = /^style|textarea$/i;
exports.SHOULD_USE_TEXT_CONTENT = SHOULD_USE_TEXT_CONTENT;
const UID = EXPANDO + ((Math.random() * new Date) | 0) + ';';
exports.UID = UID;
const UIDC = '<!--' + UID + '-->';
exports.UIDC = UIDC;

},{}],22:[function(require,module,exports){
'use strict';
// these are tiny helpers to simplify most common operations needed here
const create = (node, type) => doc(node).createElement(type);
exports.create = create;
const doc = node => node.ownerDocument || node;
exports.doc = doc;
const fragment = node => doc(node).createDocumentFragment();
exports.fragment = fragment;
const text = (node, text) => doc(node).createTextNode(text);
exports.text = text;

},{}],23:[function(require,module,exports){
'use strict';
const {create, fragment, text} = require('./easy-dom.js');

const testFragment = fragment(document);

// DOM4 node.append(...many)
const hasAppend = 'append' in testFragment;
exports.hasAppend = hasAppend;

// detect old browsers without HTMLTemplateElement content support
const hasContent = 'content' in create(document, 'template');
exports.hasContent = hasContent;

// IE 11 has problems with cloning templates: it "forgets" empty childNodes
testFragment.appendChild(text(testFragment, 'g'));
testFragment.appendChild(text(testFragment, ''));
const hasDoomedCloneNode = testFragment.cloneNode(true).childNodes.length === 1;
exports.hasDoomedCloneNode = hasDoomedCloneNode;

// old browsers need to fallback to cloneNode
// Custom Elements V0 and V1 will work polyfilled
// but native implementations need importNode instead
// (specially Chromium and its old V0 implementation)
const hasImportNode = 'importNode' in document;
exports.hasImportNode = hasImportNode;

},{"./easy-dom.js":22}],24:[function(require,module,exports){
'use strict';
const {G, UID} = require('./constants.js');

// you know that kind of basics you need to cover
// your use case only but you don't want to bloat the library?
// There's even a package in here:
// https://www.npmjs.com/package/poorlyfills

// used to dispatch simple events
let Event = G.Event;
try {
  new Event('Event');
} catch(o_O) {
  Event = function (type) {
    const e = document.createEvent('Event');
    e.initEvent(type, false, false);
    return e;
  };
}
exports.Event = Event;

// used to store template literals
/* istanbul ignore next */
const Map = G.Map || function Map() {
  const keys = [], values = [];
  return {
    get(obj) {
      return values[keys.indexOf(obj)];
    },
    set(obj, value) {
      values[keys.push(obj) - 1] = value;
    }
  };
};
exports.Map = Map;

// used to store wired content
let ID = 0;
const WeakMap = G.WeakMap || function WeakMap() {
  const key = UID + ID++;
  return {
    get(obj) { return obj[key]; },
    set(obj, value) {
      Object.defineProperty(obj, key, {
        configurable: true,
        value
      });
    }
  };
};
exports.WeakMap = WeakMap;

// used to store hyper.Components
const WeakSet = G.WeakSet || function WeakSet() {
  const wm = new WeakMap;
  return {
    add(obj) { wm.set(obj, true); },
    has(obj) { return wm.get(obj) === true; }
  };
};
exports.WeakSet = WeakSet;

// used to be sure IE9 or older Androids work as expected
const isArray = Array.isArray || (toString =>
  arr => toString.call(arr) === '[object Array]'
)({}.toString);
exports.isArray = isArray;

const trim = UID.trim || function () {
  return this.replace(/^\s+|\s+$/g, '');
};
exports.trim = trim;

},{"./constants.js":21}],25:[function(require,module,exports){
'use strict';
// TODO:  I'd love to code-cover RegExp too here
//        these are fundamental for this library

const spaces = ' \\f\\n\\r\\t';
const almostEverything = '[^ ' + spaces + '\\/>"\'=]+';
const attrName = '[ ' + spaces + ']+' + almostEverything;
const tagName = '<([A-Za-z]+[A-Za-z0-9:_-]*)((?:';
const attrPartials = '(?:=(?:\'[^\']*?\'|"[^"]*?"|<[^>]*?>|' + almostEverything + '))?)';

const attrSeeker = new RegExp(
  tagName + attrName + attrPartials + '+)([ ' + spaces + ']*/?>)',
  'g'
);

const selfClosing = new RegExp(
  tagName + attrName + attrPartials + '*)([ ' + spaces + ']*/>)',
  'g'
);

exports.attrName = attrName;
exports.attrSeeker = attrSeeker;
exports.selfClosing = selfClosing;

},{}],26:[function(require,module,exports){
'use strict';
const {attrName, attrSeeker} = require('./re.js');

const {
  G,
  ELEMENT_NODE,
  OWNER_SVG_ELEMENT,
  SVG_NAMESPACE,
  UID,
  UIDC
} = require('./constants.js');

const {
  hasAppend,
  hasContent,
  hasDoomedCloneNode,
  hasImportNode
} = require('./features-detection.js');

const {create, doc, fragment} = require('./easy-dom.js');

const {Map, WeakMap} = require('./poorlyfills.js');

// appends an array of nodes
// to a generic node/fragment
// When available, uses append passing all arguments at once
// hoping that's somehow faster, even if append has more checks on type
const append = hasAppend ?
  (node, childNodes) => {
    node.append.apply(node, childNodes);
  } :
  (node, childNodes) => {
    const length = childNodes.length;
    for (let i = 0; i < length; i++) {
      node.appendChild(childNodes[i]);
    }
  };
exports.append = append;

const findAttributes = new RegExp('(' + attrName + '=)([\'"]?)' + UIDC + '\\2', 'gi');
const comments = ($0, $1, $2, $3) =>
  '<' + $1 + $2.replace(findAttributes, replaceAttributes) + $3;
const replaceAttributes = ($0, $1, $2) => $1 + ($2 || '"') + UID + ($2 || '"');

// given a node and a generic HTML content,
// create either an SVG or an HTML fragment
// where such content will be injected
const createFragment = (node, html) =>
  (OWNER_SVG_ELEMENT in node ?
    SVGFragment :
    HTMLFragment
  )(node, html.replace(attrSeeker, comments));
exports.createFragment = createFragment;

// IE/Edge shenanigans proof cloneNode
// it goes through all nodes manually
// instead of relying the engine to suddenly
// merge nodes together
const cloneNode = hasDoomedCloneNode ?
  node => {
    const clone = node.cloneNode();
    const childNodes = node.childNodes ||
                      // this is an excess of caution
                      // but some node, in IE, might not
                      // have childNodes property.
                      // The following fallback ensure working code
                      // in older IE without compromising performance
                      // or any other browser/engine involved.
                      /* istanbul ignore next */
                      [];
    const length = childNodes.length;
    for (let i = 0; i < length; i++) {
      clone.appendChild(cloneNode(childNodes[i]));
    }
    return clone;
  } :
  // the following ignore is due code-coverage
  // combination of not having document.importNode
  // but having a working node.cloneNode.
  // This shenario is common on older Android/WebKit browsers
  // but basicHTML here tests just two major cases:
  // with document.importNode or with broken cloneNode.
  /* istanbul ignore next */
  node => node.cloneNode(true);

// IE and Edge do not support children in SVG nodes
/* istanbul ignore next */
const getChildren = node => {
  const children = [];
  const childNodes = node.childNodes;
  const length = childNodes.length;
  for (let i = 0; i < length; i++) {
    if (childNodes[i].nodeType === ELEMENT_NODE)
      children.push(childNodes[i]);
  }
  return children;
};
exports.getChildren = getChildren;

// used to import html into fragments
const importNode = hasImportNode ?
  (doc, node) => doc.importNode(node, true) :
  (doc, node) => cloneNode(node)
exports.importNode = importNode

// just recycling a one-off array to use slice
// in every needed place
const slice = [].slice;
exports.slice = slice;

// lazy evaluated, returns the unique identity
// of a template literal, as tempalte literal itself.
// By default, ES2015 template literals are unique
// tag`a${1}z` === tag`a${2}z`
// even if interpolated values are different
// the template chunks are in a frozen Array
// that is identical each time you use the same
// literal to represent same static content
// around its own interpolations.
const unique = template => TL(template);
exports.unique = unique;

// https://codepen.io/WebReflection/pen/dqZrpV?editors=0010
// TL returns a unique version of the template
// it needs lazy feature detection
// (cannot trust literals with transpiled code)
let TL = t => {
  if (
    // TypeScript template literals are not standard
    t.propertyIsEnumerable('raw') ||
    !Object.isFrozen(t.raw) ||
    (
        // Firefox < 55 has not standard implementation neither
        /Firefox\/(\d+)/.test((G.navigator || {}).userAgent) &&
          parseFloat(RegExp.$1) < 55
        )
  ) {
    const T = {};
    TL = t => {
      const k = '^' + t.join('^');
      return T[k] || (T[k] = t);
    };
  } else {
    // make TL an identity like function
    TL = t => t;
  }
  return TL(t);
};

// used to store templates objects
// since neither Map nor WeakMap are safe
const TemplateMap = () => {
  try {
    const wm = new WeakMap;
    const o_O = Object.freeze([]);
    wm.set(o_O, true);
    if (!wm.get(o_O))
      throw o_O;
    return wm;
  } catch(o_O) {
    // inevitable legacy code leaks due
    // https://github.com/tc39/ecma262/pull/890
    return new Map;
  }
};
exports.TemplateMap = TemplateMap;

// create document fragments via native template
// with a fallback for browsers that won't be able
// to deal with some injected element such <td> or others
const HTMLFragment = hasContent ?
  (node, html) => {
    const container = create(node, 'template');
    container.innerHTML = html;
    return container.content;
  } :
  (node, html) => {
    const container = create(node, 'template');
    const content = fragment(node);
    if (/^[^\S]*?<(col(?:group)?|t(?:head|body|foot|r|d|h))/i.test(html)) {
      const selector = RegExp.$1;
      container.innerHTML = '<table>' + html + '</table>';
      append(content, slice.call(container.querySelectorAll(selector)));
    } else {
      container.innerHTML = html;
      append(content, slice.call(container.childNodes));
    }
    return content;
  };

// creates SVG fragment with a fallback for IE that needs SVG
// within the HTML content
const SVGFragment = hasContent ?
  (node, html) => {
    const content = fragment(node);
    const container = doc(node).createElementNS(SVG_NAMESPACE, 'svg');
    container.innerHTML = html;
    append(content, slice.call(container.childNodes));
    return content;
  } :
  (node, html) => {
    const content = fragment(node);
    const container = create(node, 'div');
    container.innerHTML = '<svg xmlns="' + SVG_NAMESPACE + '">' + html + '</svg>';
    append(content, slice.call(container.firstChild.childNodes));
    return content;
  };

},{"./constants.js":21,"./easy-dom.js":22,"./features-detection.js":23,"./poorlyfills.js":24,"./re.js":25}],27:[function(require,module,exports){
"use strict";

require("../js/io-filter-table");

fetch("../tests/easylist.txt")
      .then(b => b.text())
      .then(text =>
      {
        const filters = text.replace(/^[![].*/gm, "").split("\n")
                            .filter(line => line.trim().length)
                            .map(line => ({
                              enabled: Math.random() < 0.5,
                              text: line,
                              hits: (Math.random() * 9) >>> 0,
                              slow: Math.random() < 0.2 ? "🐌" :
                                    (Math.random() < 0.3 ? "!" : "")
                            }));

        document.querySelector("io-filter-table").filters = filters.slice(0, 32);
      });

},{"../js/io-filter-table":5}]},{},[27]);
