const KeyCode = {
  "BACKSPACE": 8,
  "TAB": 9,
  "RETURN": 13,
  "ESC": 27,
  "SPACE": 32,
  "PAGE_UP": 33,
  "PAGE_DOWN": 34,
  "END": 35,
  "HOME": 36,
  "LEFT": 37,
  "UP": 38,
  "RIGHT": 39,
  "DOWN": 40,
  "DELETE": 46
};

class Listbox extends BaseComponment {
  /**
   * @param {*} details
   * details.target (as string or as element)
   * details.items (a list of items to show/handle)
   * details.label (a label to show)
   */
  constructor(details) {
    super(details);

    // initial properties
    this.getInfo = details.getInfo;
    this.setInfo = details.setInfo;
    this.items = [];
    this.nodes = [];
    this.hoveredIndex = 0;
    this.target.classList.add('listbox');
    this.text = {
      // details.label can be either an object or a string
      default: details.label.default || details.label,
      expanded: details.label.expanded || details.label
    };

    // a button is used as label to capture the initial focus
    this.label = this.target.appendChild(document.createElement('button'));
    this.label.id = this.id + '-label';
    this.label.textContent = this.text.default;
    this.label.setAttribute('aria-haspopup', this.id + '-popup');
    this.label.setAttribute('aria-expanded', false);

    this.label.addEventListener('blur', this);
    this.label.addEventListener('focus', this);
    this.label.addEventListener('keydown', this);

    // the list of items is shown through a popup
    this.popup = this.target.appendChild(document.createElement('ul'));
    this.popup.id = this.id + '-popup';
    this.popup.setAttribute('tab-index', '-1');
    this.popup.setAttribute('role', 'listbox');
    this.popup.setAttribute('aria-labelledby', this.label.id);
    this.popup.setAttribute('hidden', '');
    for (const item of details.items)
      this.add(item);

    // if no item was selected
    if (this.hoveredIndex === 0) {
      // hover at least the first one
      this.hover(details.items[0]);
    }

    this.popup.addEventListener('click', this);
    this.popup.addEventListener('mouseover', this);

    // extra properties used to handle the listbox state
    this._blurTimer = 0;
  }

  handleEvent(event) {
    this[`on${event.type}`](event);
  }

  onblur(event) {
    this._blurTimer = setTimeout(hidePopup.bind(this), 400);
  }

  onclick(event) {
    event.preventDefault();
    clearTimeout(this._blurTimer);
    const el = event.target.closest('[role="option"]:not([aria-disabled="true"])');
    hidePopup.call(this);
    if (el) {
      const item = this.items[this.nodes.indexOf(el)];
      const selected = !JSON.parse(el.getAttribute('aria-selected'));
      this.setInfo(item, {selected, disabled: selected});
      el.setAttribute('aria-selected', selected);
      el.setAttribute('aria-disabled', selected);
    }
  }

  onfocus(event) {
    // if 0 or already cleared, nothing happens, really
    clearTimeout(this._blurTimer);
    // show the popup
    this.popup.removeAttribute('hidden');
    this.label.setAttribute('aria-expanded', true);
    this.label.textContent = this.text.expanded;
  }

  onkeydown(event) {
    event.preventDefault();
    const index = this.hoveredIndex;
    const key = event.which || event.keyCode;
    switch (key) {
      case KeyCode.BACKSPACE:
      case KeyCode.DELETE:
        break;
      /* both SPACE, RETURN and ESC hide and blur */
      case KeyCode.RETURN:
      case KeyCode.SPACE:
        /* space also trigger a click event */
        const evt = new CustomEvent('click', {bubbles: true});
        this.nodes[index].dispatchEvent(evt);
        /* eslint: fall through */
      case KeyCode.ESC:
        hidePopup.call(this);
        this.label.blur();
        break;
      case KeyCode.UP:
        const prev = findNext.call(this, index, -1);
        if (prev) this.hover(prev);
        break;
      case KeyCode.DOWN:
        const next = findNext.call(this, index, 1);
        if (next) this.hover(next);
        break;
    }
  }

  onmouseover(event) {
    const el = event.target.closest('[role="option"]');
    if (el) this.hover(this.items[this.nodes.indexOf(el)]);
  }

  add(item) {
    let index = this.items.indexOf(item);
    if (index > -1) {
      // move the node at the end
      this.popup.appendChild(this.nodes[index]);
      // adjust both arrays
      this.items.push(this.items.splice(index, 1)[0]);
      this.nodes.push(this.nodes.splice(index, 1)[0]);
    } else {
      const li = this.popup.appendChild(
        document.createElement('li')
      );
      index = this.items.push(item) - 1;
      this.nodes[index] = li;
      // id is always needed to set aria-activedescendant
      li.id = this.id + '-' + index;
      const info = this.getInfo(item);
      li.setAttribute('role', 'option');
      li.setAttribute('aria-disabled', info.selected);
      li.setAttribute('aria-selected', info.selected);
      li.textContent = info.value;
      if (info.selected) {
        this.hover(item);
      }
    }
  }

  hover(item) {
    this.nodes[this.hoveredIndex].classList.remove('hover');
    const index = this.items.indexOf(item);
    const element = this.nodes[index];
    element.classList.add('hover');
    this.hoveredIndex = index;
    this.popup.setAttribute('aria-activedescendant', element.id);
    if (this.popup.scrollHeight > this.popup.clientHeight) {
      const scrollBottom = this.popup.clientHeight + this.popup.scrollTop;
      const elementBottom = element.offsetTop + element.offsetHeight;
      if (elementBottom > scrollBottom) {
        this.popup.scrollTop = elementBottom - this.popup.clientHeight;
      }
      else if (element.offsetTop < this.popup.scrollTop) {
        this.popup.scrollTop = element.offsetTop;
      }
    }
  }

  remove(item) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1)[0];
      this.nodes.splice(index, 1)[0];
    }
  }
}

function hidePopup() {
  this.popup.setAttribute('hidden', 'hidden');
  this.label.setAttribute('aria-expanded', false);
  this.label.textContent = this.text.default;
}

function findNext(index, increment) {
  let next = index;
  do {
    next += increment;
    if (increment < 0 && next < 0)
      next = this.items.length - 1;
    else if (increment > 0 && next >= this.items.length)
      next = 0;
  } while(
    // avoid infinite loops
    next !== index &&
    // keep doing this while current item is disabled
    this.getInfo(this.items[next]).disabled
  );
  return next === index ? null : this.items[next];
}


document.addEventListener(
  'DOMContentLoaded',
  () => {
    new Listbox({
      target: '#testing',
      label: {
        default: '+ Add lanugages',
        expanded: 'Select your language'
      },
      getInfo(item) {
        const selected = 'selected' in item ? item.selected : !item.disabled;
        return {
          disabled: selected,
          selected: selected,
          get value() {
            return item.value;
          }
        };
      },
      setInfo(item, info) {
        if (info.hasOwnProperty('disabled')) {
          item.disabled = info.disabled;
        }
        if (info.hasOwnProperty('selected')) {
          item.selected = info.selected;
        }
      },
      items: [
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "Bahasa Indonesia",
          "originalTitle": "ABPindo+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/abpindo+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "čeština, slovenčina",
          "originalTitle": "EasyList Czech and Slovak+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/easylistczechslovak+easylist.txt"
        },
        {
          "disabled": false,
          "downloadStatus": "synchronize_ok",
          "homepage": "https://easylist.adblockplus.org/",
          "value": "Deutsch",
          "originalTitle": "EasyList Germany+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/easylistgermany+easylist.txt",
          "lastDownload": 1234,
          "isDownloading": false
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "English",
          "originalTitle": "EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "español",
          "originalTitle": "EasyList Spanish+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/easylistspanish+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "français",
          "originalTitle": "Liste FR+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/liste_fr+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "italiano",
          "originalTitle": "EasyList Italy+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/easylistitaly+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "latviešu valoda",
          "originalTitle": "Latvian List+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/latvianlist+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "lietuvių kalba",
          "originalTitle": "EasyList Lithuania+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/easylistlithuania+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "Nederlands",
          "originalTitle": "EasyList Dutch+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/easylistdutch+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "românesc",
          "originalTitle": "ROList+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/rolist+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "Việt",
          "originalTitle": "ABPVN List+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/abpvn+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "български",
          "originalTitle": "Bulgarian list+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/bulgarian_list+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "русский, українська",
          "originalTitle": "RuAdList+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/ruadlist+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "עברית",
          "originalTitle": "EasyList Hebrew+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/israellist+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "العربية",
          "originalTitle": "Liste AR+Liste FR+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/liste_ar+liste_fr+easylist.txt"
        },
        {
          "disabled": true,
          "downloadStatus": null,
          "homepage": null,
          "value": "中文",
          "originalTitle": "EasyList China+EasyList",
          "recommended": "ads",
          "url": "https://easylist-downloads.adblockplus.org/easylistchina+easylist.txt"
        }
      ]
    })
  },
  {once: true}
);