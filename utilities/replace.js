/**
 * @example
 *  past these functions in irccloud then:
 *
replaceAll(
  '.messageRow .content',
  /ui#(\d+)/g,
  '<a href="https://gitlab.com/eyeo/adblockplus/adblockplusui/issues/$1">ui:$1</a>'
);
 *
 * Alternatively, setup a mutation observer
 * once and let this script work by its own.
 *
 * @example
 *
replaceAuto(
  '.buffermainwrapper',
  /ui#(\d+)/g,
  '<a href="https://gitlab.com/eyeo/adblockplus/adblockplusui/issues/$1">ui:$1</a>'
);
 */

function replace(re, place) {
  function $(childNodes) {
    for (var i = childNodes.length; i--;) {
      var child = childNodes[i];
      switch (child.nodeType) {
        case 3:
          var template = document.createElement('template');
          template.innerHTML = child.textContent.replace(re, place);
          child.parentNode.replaceChild(
            template.content || template,
            child
          );
          break;
        case 1:
          $(child.childNodes);
      }
    }
  }
  return function (el) {
    $(el.childNodes);
  };
}

function replaceAll(where, re, place) {
  [].forEach.call(
    document.querySelectorAll(where),
    replace(re, place)
  );
}

function replaceAuto(where, re, place) {
  var el = document.querySelector(where);
  replace(re, place)(el);
  new MutationObserver(
    function (mutationList) {
      mutationList.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(replace(re, place));
        }
      });
    }
  ).observe(el, {childList: true, subtree: true});
}
