class Listbox {
  /**
   * @param {*} details
   * details.target (as string or as element)
   * details.items (a list of items to show/handle)
   * details.label (a label to show)
   */
  constructor(details) {

    // initial properties
    this.id = 'listbox-' + ('' + Math.random()).replace(/\D/, '');
    this.details = details;
    this.items = [];
    this.nodes = [];
    this.selectedItem = -1;
    this.target = typeof details.target === 'string' ?
                  document.querySelector(details.target) : details.target;

    // a button is used as label to capture the initial focus
    this.label = this.target.appendChild(document.createElement('button'));
    this.label.id = this.id + '-label';
    this.label.textContent = details.label;
    this.label.setAttribute('aria-haspopup', this.id + '-popup');

    // the list of items is shown through a popup
    this.popup = this.target.appendChild(document.createElement('ul'));
    this.popup.id = this.id + '-popup';
    this.popup.setAttribute('tab-index', '-1');
    this.popup.setAttribute('role', 'listbox');
    this.popup.setAttribute('aria-labelledby', '-1');
    for (const item of details.items)
      this.add(item);
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
      li.setAttribute('role', 'option');
      li.setAttribute('aria-disabled', item.disabled);
      li.textContent = item.value;
      if (item.selected) {
        this.selectedItem = index;
        this.target.setAttribute('aria-activedescendant', li.id);
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


document.addEventListener(
  'DOMContentLoaded',
  () => {
    new Listbox({
      target: '#testing',
      label: 'Select your language',
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