addEventListener('DOMContentLoaded', () => {

  var bubbleAnchor = document.getElementById("bubble_ui_anchor");
  var toggleCanvas = document.getElementById('toggle_canvas');
  var toggleCanvas2 = document.getElementById('toggle_canvas2');
  
  const divs = document.querySelectorAll("footer .container > div");
  const timeline = document.querySelector("footer .timeline");
  const items = timeline.querySelectorAll("span");
  let i = -1;
  let raf = 0;
  let lastTarget = null;

  const onFrame = currentTarget => {
    lastTarget = currentTarget;
    for (const div of divs)
      div.style.setProperty('--index', i);
    currentTarget.addEventListener("transitionend", next);
    currentTarget.classList.add("active");
  };

  const onEnd = currentTarget => {
    currentTarget.removeEventListener("transitionend", next);
    currentTarget.classList.remove("active");
  };


    function next(event) {
      if (event) {
        const {currentTarget, propertyName} = event;
        if (propertyName !== "width")
          return;
        onEnd(currentTarget);
      }
      i = (i + 1) % items.length;
      raf = requestAnimationFrame(() => {
        onFrame(items[i]);
      });
    }

    timeline.addEventListener('click', ({target}) => {
      cancelAnimationFrame(raf);
      onEnd(lastTarget);
      lastTarget = target;
      i = [].indexOf.call(items, target);
      onFrame(target);
      target.removeEventListener("transitionend", next);
    });

    toggleCanvas.addEventListener('click', function () {
      this.classList.toggle("toggle-off");
      });
      
      
      toggleCanvas.onkeydown = function(e) {
        if (e.key == "Enter") {
          this.classList.toggle("toggle-off");
        }
        e.preventDefault();
      };

    toggleCanvas2.addEventListener('click', function () {
      this.classList.toggle("toggle-off2");
      });
      
      
      toggleCanvas2.onkeydown = function(e) {
        if (e.key == "Enter") {
          this.classList.toggle("toggle-off2");
        }
        e.preventDefault();
      };


    bubbleAnchor.addEventListener("click", function () {
      document.getElementById("bubble_ui").classList.toggle("hidden-bubble");
      this.classList.toggle("active-bubble");
      cancelAnimationFrame(raf);
      if (lastTarget)
        onEnd(lastTarget);
      i = -1;
      next();
    });

});