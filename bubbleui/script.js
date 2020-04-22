addEventListener('DOMContentLoaded', () => {

  var bubbleAnchor = document.getElementById("bubble_ui_anchor");
  const divs = document.querySelectorAll("footer .container > div");
  const items = document.querySelectorAll("footer .timeline > span");
  let i = -1;
  next();
  function next(event) {
    if (event) {
      const {currentTarget, propertyName} = event;
      if (propertyName !== "width")
        return;
      currentTarget.removeEventListener("transitionend", next);
      currentTarget.classList.remove("active");
    }
    i = (i + 1) % items.length;
    requestAnimationFrame(() => {
      const currentTarget = items[i];
      for (const div of divs)
        div.style.setProperty('--index', i);
      currentTarget.addEventListener("transitionend", next);
      currentTarget.classList.add("active");
    });
  }

  bubbleAnchor.addEventListener("click", function () {
    document.getElementById("bubble_ui").classList.toggle("hidden-bubble");
  });

});
