class BubbleUI extends BaseComponent {
  constructor(details) {
    super(details);
    this.target
        .querySelector('[data-component=switcher]')
        .addEventListener('change', this);
  }
  handleEvent(event) {
    this['on' + event.type](event);
  }
  onchange(event) {
    const main = this.target.querySelector('main');
    const showingOptions = !main.classList.contains('options');
    dropNegativeTabIndex(
      showingOptions,
      main.querySelectorAll('.switcher-options button')
    );
    dropNegativeTabIndex(
      !showingOptions,
      main.querySelectorAll('.details button')
    );
    main.classList.toggle('options');
  }
}

function dropNegativeTabIndex(dropIt, list) {
  for (const element of list) {
    if (dropIt) {
      element.removeAttribute('tabindex');
    } else {
      element.setAttribute('tabindex', '-1');
    }
  }
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    const bubbles = document.querySelectorAll("[data-component=bubble-ui]");
    for (const el of bubbles)
      new BubbleUI({
        target: el
      })
  },
  {once: true}
);
