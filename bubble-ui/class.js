class BubbleUI extends BaseComponent {
  constructor(details) {
    super(details);
  }
  update() {}
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
