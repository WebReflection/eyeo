class Switcher extends BaseComponent {
  constructor(details) {
    super(details);
    this.checked = !!details.checked;
    this.label = details.label;
    this.button = this.target.appendChild(
      document.createElement('button')
    );
    if (details.labelledby)
      this.button.setAttribute('aria-labelledby', details.labelledby);
    this.button.setAttribute('role', 'checkbox');
    this.target.addEventListener('click', this);
    this.update();
  }
  handleEvent() {
    if (this.button.classList.contains('full')) return;
    this.checked = !this.checked;
    this.button.focus();
    this.update();
    this.button.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        detail: {checked: this.checked}
      })
    );
  }
  update() {
    const status = this.checked ? 'on' : 'off';
    this.button.textContent = this.label[status];
    this.button.setAttribute('aria-checked', this.checked);
  }
  setFull(isFull) {
    this.button.classList.toggle('full', !!isFull);
    if (isFull) {
      this.button.textContent = this.label.full;
    } else {
      this.update();
    }
  }
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    const switchers = document.querySelectorAll("[data-component=switcher]");
    for (const el of switchers)
      setInterval(
        switcher => {
          switcher.setFull(Math.random() < .5);
        },
        5000,
        new Switcher({
          // where to render
          target: el,
          // either true or false
          checked: false,
          // label to show accordingly
          // to the switcher checked state:
          //  on when it's true
          //  off when it's false
          label: {
            on: 'on',
            off: 'off',
            full: 'refresh'
          },
          // optional id related to the labeller
          labelledby: 'switcher-label'
        })
      );
  },
  {once: true}
);