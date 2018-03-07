class Switcher extends BaseComponment {
  constructor(details) {
    super(details);
    this.status = details.status || 'off';
    this.label = details.label;
    this.button = this.target.appendChild(
      document.createElement('button')
    );
    this.button.setAttribute('role', 'checkbox');
    this.button.addEventListener('click', this);
    this.update();
  }
  handleEvent() {
    this.status = this.status === 'on' ? 'off' : 'on';
    this.update();
  }
  update() {
    const checked = this.status === 'on';
    this.button.textContent = this.label[this.status];
    this.button.setAttribute('aria-checked', JSON.stringify(checked));
  }
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    const switchers = document.querySelectorAll("[data-component=switcher]");
    for (const el of switchers)
      new Switcher({
        // where to render
        target: el,
        // it must match label keys
        // either 'on' or 'off'
        status: 'off',
        // label to show accordingly
        // to the switcher state
        label: {
          on: 'on',
          off: 'off'
        }
      })
  },
  {once: true}
);