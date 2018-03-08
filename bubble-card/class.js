class BubbleCard extends BaseComponent {
  constructor(details) {
    super(details);
    this.count = details.count || 0;
    this.update();
  }
  update() {
    this.target.querySelector('.count').textContent = this.count;
  }
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    const cards = document.querySelectorAll("[data-component=bubble-card]");
    for (const el of cards)
      new BubbleCard({
        target: el,
        count: (Math.random() * 20) >>> 0
      })
  },
  {once: true}
);