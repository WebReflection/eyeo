/* eslint-disable */(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
/* globals module, require */

"use strict";

const {wire} = require("./io-element");

// at this point this is just a helper class
// for op-highlighter component but it could
// become a generic draw-on-canvas helper too
module.exports = class DrawingHandler
{
  constructor(canvas, maxSize)
  {
    this.paths = [];
    this.canvas = canvas;
    this.maxSize = maxSize;

    // the canvas needs proper width and height
    const canvasRect = canvas.getBoundingClientRect();
    canvas.width = canvasRect.width;
    canvas.height = canvasRect.height;

    // it also needs to intercept all events
    if ("onpointerup" in canvas)
    {
      // the instance is the handler itself, no need to bind anything
      canvas.addEventListener("pointerdown", this, {passive: false});
      canvas.addEventListener("pointermove", this, {passive: false});
      canvas.addEventListener("pointerup", this, {passive: false});
    }
    else
    {
      // some browser might not have pointer events.
      // the fallback should be regular mouse events
      this.onmousedown = this.onpointerdown;
      this.onmousemove = this.onpointermove;
      this.onmouseup = this.onpointerup;
      canvas.addEventListener("mousedown", this, {passive: false});
      canvas.addEventListener("mousemove", this, {passive: false});
      canvas.addEventListener("mouseup", this, {passive: false});
    }
  }

  // draws an image and it starts processing its data
  // in an asynchronous, not CPU greedy, way.
  // It returns a promise that will resolve only
  // once the image has been fully processed.
  // Meanwhile, it is possible to draw rectangles on top.
  changeImageDepth(image)
  {
    this.clear();
    const startW = image.naturalWidth;
    const startH = image.naturalHeight;
    const ratioW = Math.min(this.canvas.width, this.maxSize) / startW;
    const ratioH = Math.min(this.canvas.height, this.maxSize) / startH;
    const ratio = Math.min(ratioW, ratioH);
    const endW = startW * ratio;
    const endH = startH * ratio;
    this.ctx.drawImage(image,
                      0, 0, startW, startH,
                      0, 0, endW, endH);
    this.imageData = this.ctx.getImageData(
                      0, 0, this.canvas.width, this.canvas.height);
    const data = this.imageData.data;
    const mapping = [0x00, 0x55, 0xAA, 0xFF];
    const promise = resolvable();
    const remap = i =>
    {
      for (; i < data.length; i++)
      {
        data[i] = mapping[data[i] >> 6];
        if (i > 0 && i % 5000 == 0)
        {
          // faster when possible, otherwise less intrusive
          // than a promise based on setTimeout as in legacy code
          return requestIdleCallback(() =>
          {
            this.draw();
            requestIdleCallback(() => remap(i + 1));
          });
        }
      }
      promise.resolve();
    };
    remap(0);
    return promise;
  }

  // setup the context the first time, and clean the area
  clear()
  {
    if (!this.ctx)
    {
      this.ctx = this.canvas.getContext("2d");
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = "rgb(208,1,27)";
      this.ctx.fillStyle = "rgb(0,0,0)";
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // draw the image during or after its being processed
  // and draw on top all rectangles
  draw()
  {
    this.clear();
    if (this.imageData)
    {
      this.ctx.putImageData(this.imageData, 0, 0);
    }
    for (const rect of this.paths)
    {
      const method = `${rect.type}Rect`;
      this.ctx[method](
        rect.x,
        rect.y,
        rect.width,
        rect.height
      );
    }
  }

  // central event dispatcher
  // https://dom.spec.whatwg.org/#interface-eventtarget
  handleEvent(event)
  {
    this[`on${event.type}`](event);
  }

  // pointer events to draw on canvas
  onpointerdown(event)
  {
    // avoid multiple pointers/fingers
    if (!this.drawing)
    {
      // react only if not drawing already
      stop(event);
      this.drawing = true;
      const start = getCoordinates(event);
      // set current rect to speed up coordinates updates
      this.rect = {
        type: this.mode,
        x: start.x,
        y: start.y,
        width: 0,
        height: 0
      };
      this.paths.push(this.rect);
    }
  }

  onpointermove(event)
  {
    // only if drawing
    if (this.drawing)
    {
      // update the current rect coordinates
      stop(event);
      this.updateRect(event);
      // update the canvas view
      this.draw();
    }
  }

  onpointerup(event)
  {
    // drop only if drawing
    // avoid issues when this event happens
    // outside the expected DOM node (or outside the browser)
    if (this.drawing)
    {
      stop(event);
      this.updateRect(event);
      this.drawing = false;

      // get out of here if the mouse didn't move at all
      if (!this.rect.width && !this.rect.height)
      {
        // also drop current rect from the list: it's useless.
        this.paths.pop();
        return;
      }
      const rect = this.rect;
      const parent = this.canvas.parentNode;
      const closeCoords = getPageCoordinates(
        event,
        this.rect,
        getCoordinates(event)
      );
      // use the DOM to show the close event
      //  - always visible, even outside the canvas
      //  - no need to re-invent hit-test coordinates
      //  - no need to redraw without closers later on
      parent.appendChild(wire()`
        <span
          class="closer"
          onclick="${evt =>
          {
            // when clicked, remove the related rectangle
            // and draw the canvas again
            stop(evt);
            parent.removeChild(evt.currentTarget);
            this.paths.splice(this.paths.indexOf(rect), 1);
            this.draw();
          }}"
          style="${{
            // always top right corner
            top: closeCoords.y + "px",
            left: closeCoords.x + "px"
          }}"
        />`);
    }
  }

  // update current rectangle size
  updateRect(event)
  {
    const coords = getCoordinates(event);
    this.rect.width = coords.x - this.rect.x;
    this.rect.height = coords.y - this.rect.y;
  }
};

// helper to retrieve absolute coordinates
const getCoordinates = event =>
{
  let el = event.currentTarget;
  let x = 0;
  let y = 0;
  do
  {
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
  } while (
    (el = el.offsetParent) &&
    !isNaN(el.offsetLeft) &&
    !isNaN(el.offsetTop)
  );
  return {x: event.clientX - x, y: event.clientY - y};
};

// helper to retrieve absolute page coordinates
// of a generic target node
const getPageCoordinates = (event, start, end) =>
{
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ("x" in rect ? rect.x : rect.left) + Math.max(start.x, end.x);
  const y = ("y" in rect ? rect.y : rect.top) + Math.min(start.y, end.y);
  return {x: Math.round(x), y: Math.round(y)};
};

// basic polyfill for older browsers
const requestIdleCallback = window.requestIdleCallback || setTimeout;

// returns a promise that can be resolved directly
const resolvable = () =>
{
  let resolve;
  const promise = new Promise(res => (resolve = res));
  promise.resolve = resolve;
  return promise;
};

// prevent events from doing anything
// in the current node, and every parent too
const stop = event =>
{
  event.preventDefault();
  event.stopPropagation();
};

},{"./io-element":2}],2:[function(require,module,exports){
/* globals module, require */

"use strict";

// Custom Elements ponyfill (a polyfill triggered on demand)
const customElementsPonyfill = require("document-register-element/pony");
if (typeof customElements !== "object")
  customElementsPonyfill(window);

// external dependencies
const {default: HyperHTMLElement} = require("hyperhtml-element/cjs");

// provides a unique-id suffix per each component
let counter = 0;

// common Custom Element class to extend
class IOElement extends HyperHTMLElement
{
  // get a unique ID or, if null, set one and returns it
  static getID(element)
  {
    return element.getAttribute("id") || IOElement.setID(element);
  }

  // set a unique ID to a generic element and returns the ID
  static setID(element)
  {
    const id = `${element.nodeName.toLowerCase()}-${counter++}`;
    element.setAttribute("id", id);
    return id;
  }

  // lazily retrieve or define a custom element ID
  get id()
  {
    return IOElement.getID(this);
  }

  // whenever an element is created, render its content once
  created() { this.render(); }

  // by default, render is a no-op
  render() {}
}

// whenever an interpolation with ${{i18n: 'string-id'}} is found
// transform such value into the expected content
// example:
//  render() {
//    return this.html`<div>${{i18n:'about-abp'}}</div>`;
//  }
const {setElementText} = ext.i18n;
IOElement.intent("i18n", id =>
{
  const fragment = document.createDocumentFragment();
  setElementText(fragment, id);
  return fragment;
});

module.exports = IOElement;

},{"document-register-element/pony":4,"hyperhtml-element/cjs":5}],3:[function(require,module,exports){
/* globals module, require */

"use strict";

const IOElement = require("./io-element");
const DrawingHandler = require("./drawing-handler");

// <io-highlighter data-max-size=800 />
class IOHighlighter extends IOElement
{
  // define an initial state per each new instance
  // https://viperhtml.js.org/hyperhtml/documentation/#components-2
  get defaultState()
  {
    return {drawing: "", changeDepth: null};
  }

  // resolves once the image depth has been fully changed
  // comp.changeDepth.then(...)
  get changeDepth()
  {
    return this.state.changeDepth;
  }

  // process an image and setup changeDepth promise
  // returns the component for chainability sake
  // comp.edit(imageOrString).changeDepth.then(...);
  edit(source)
  {
    return this.setState({
      changeDepth: new Promise(res =>
      {
        const changeDepth = image =>
        {
          this.drawingHandler.changeImageDepth(image).then(res);
        };

        if (typeof source === "string")
        {
          // create an image and use the source as data
          const img = this.ownerDocument.createElement("img");
          img.onload = () => changeDepth(img);
          img.src = source;
        }
        else
        {
          // assume the source is an Image already
          // (or anything that can be drawn on a canvas)
          changeDepth(source);
        }
      })
    });
  }

  // the component content (invoked automatically on state change too)
  render()
  {
    // extra classes for highlight and edit
    const highClass = this.state.drawing === "highlight" ? " active" : "";
    const hideClass = this.state.drawing === "hide" ? " active" : "";

    this.html`
    <div class="split">
      <div class="options">
        <button
          class="${"highlight" + highClass}"
          onclick="${() => changeMode(this, "highlight")}"
        >Highlight</button>
        <button
          class="${"hide" + hideClass}"
          onclick="${() => changeMode(this, "hide")}"
        >Hide</button>
      </div>
      <canvas class="${this.state.drawing ? "active" : ""}" />
    </div>`;

    // first time only, initialize the DrawingHandler
    // through the newly created canvas
    if (!this.drawingHandler)
      this.drawingHandler = new DrawingHandler(
        this.querySelector("canvas"),
        parseInt(this.dataset.maxSize, 10) || 800
      );
  }

  // shortcut for internal canvas.toDataURL()
  toDataURL()
  {
    return this.querySelector("canvas").toDataURL();
  }
}

IOHighlighter.define("io-highlighter");

const changeMode = (self, mode) =>
{
  let drawing = self.state.drawing === mode ? "" : mode;
  self.drawingHandler.mode = mode === "hide" ? "fill" : "stroke";
  self.setState({drawing});
};

},{"./drawing-handler":1,"./io-element":2}],4:[function(require,module,exports){
/*!

Copyright (C) 2014-2016 by Andrea Giammarchi - @WebReflection

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
// global window Object
// optional polyfill info
//    'auto' used by default, everything is feature detected
//    'force' use the polyfill even if not fully needed
function installCustomElements(window, polyfill) {'use strict';

  // DO NOT USE THIS FILE DIRECTLY, IT WON'T WORK
  // THIS IS A PROJECT BASED ON A BUILD SYSTEM
  // THIS FILE IS JUST WRAPPED UP RESULTING IN
  // build/document-register-element.node.js

  var
    document = window.document,
    Object = window.Object
  ;

  var htmlClass = (function (info) {
    // (C) Andrea Giammarchi - @WebReflection - MIT Style
    var
      catchClass = /^[A-Z]+[a-z]/,
      filterBy = function (re) {
        var arr = [], tag;
        for (tag in register) {
          if (re.test(tag)) arr.push(tag);
        }
        return arr;
      },
      add = function (Class, tag) {
        tag = tag.toLowerCase();
        if (!(tag in register)) {
          register[Class] = (register[Class] || []).concat(tag);
          register[tag] = (register[tag.toUpperCase()] = Class);
        }
      },
      register = (Object.create || Object)(null),
      htmlClass = {},
      i, section, tags, Class
    ;
    for (section in info) {
      for (Class in info[section]) {
        tags = info[section][Class];
        register[Class] = tags;
        for (i = 0; i < tags.length; i++) {
          register[tags[i].toLowerCase()] =
          register[tags[i].toUpperCase()] = Class;
        }
      }
    }
    htmlClass.get = function get(tagOrClass) {
      return typeof tagOrClass === 'string' ?
        (register[tagOrClass] || (catchClass.test(tagOrClass) ? [] : '')) :
        filterBy(tagOrClass);
    };
    htmlClass.set = function set(tag, Class) {
      return (catchClass.test(tag) ?
        add(tag, Class) :
        add(Class, tag)
      ), htmlClass;
    };
    return htmlClass;
  }({
    "collections": {
      "HTMLAllCollection": [
        "all"
      ],
      "HTMLCollection": [
        "forms"
      ],
      "HTMLFormControlsCollection": [
        "elements"
      ],
      "HTMLOptionsCollection": [
        "options"
      ]
    },
    "elements": {
      "Element": [
        "element"
      ],
      "HTMLAnchorElement": [
        "a"
      ],
      "HTMLAppletElement": [
        "applet"
      ],
      "HTMLAreaElement": [
        "area"
      ],
      "HTMLAttachmentElement": [
        "attachment"
      ],
      "HTMLAudioElement": [
        "audio"
      ],
      "HTMLBRElement": [
        "br"
      ],
      "HTMLBaseElement": [
        "base"
      ],
      "HTMLBodyElement": [
        "body"
      ],
      "HTMLButtonElement": [
        "button"
      ],
      "HTMLCanvasElement": [
        "canvas"
      ],
      "HTMLContentElement": [
        "content"
      ],
      "HTMLDListElement": [
        "dl"
      ],
      "HTMLDataElement": [
        "data"
      ],
      "HTMLDataListElement": [
        "datalist"
      ],
      "HTMLDetailsElement": [
        "details"
      ],
      "HTMLDialogElement": [
        "dialog"
      ],
      "HTMLDirectoryElement": [
        "dir"
      ],
      "HTMLDivElement": [
        "div"
      ],
      "HTMLDocument": [
        "document"
      ],
      "HTMLElement": [
        "element",
        "abbr",
        "address",
        "article",
        "aside",
        "b",
        "bdi",
        "bdo",
        "cite",
        "code",
        "command",
        "dd",
        "dfn",
        "dt",
        "em",
        "figcaption",
        "figure",
        "footer",
        "header",
        "i",
        "kbd",
        "mark",
        "nav",
        "noscript",
        "rp",
        "rt",
        "ruby",
        "s",
        "samp",
        "section",
        "small",
        "strong",
        "sub",
        "summary",
        "sup",
        "u",
        "var",
        "wbr"
      ],
      "HTMLEmbedElement": [
        "embed"
      ],
      "HTMLFieldSetElement": [
        "fieldset"
      ],
      "HTMLFontElement": [
        "font"
      ],
      "HTMLFormElement": [
        "form"
      ],
      "HTMLFrameElement": [
        "frame"
      ],
      "HTMLFrameSetElement": [
        "frameset"
      ],
      "HTMLHRElement": [
        "hr"
      ],
      "HTMLHeadElement": [
        "head"
      ],
      "HTMLHeadingElement": [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6"
      ],
      "HTMLHtmlElement": [
        "html"
      ],
      "HTMLIFrameElement": [
        "iframe"
      ],
      "HTMLImageElement": [
        "img"
      ],
      "HTMLInputElement": [
        "input"
      ],
      "HTMLKeygenElement": [
        "keygen"
      ],
      "HTMLLIElement": [
        "li"
      ],
      "HTMLLabelElement": [
        "label"
      ],
      "HTMLLegendElement": [
        "legend"
      ],
      "HTMLLinkElement": [
        "link"
      ],
      "HTMLMapElement": [
        "map"
      ],
      "HTMLMarqueeElement": [
        "marquee"
      ],
      "HTMLMediaElement": [
        "media"
      ],
      "HTMLMenuElement": [
        "menu"
      ],
      "HTMLMenuItemElement": [
        "menuitem"
      ],
      "HTMLMetaElement": [
        "meta"
      ],
      "HTMLMeterElement": [
        "meter"
      ],
      "HTMLModElement": [
        "del",
        "ins"
      ],
      "HTMLOListElement": [
        "ol"
      ],
      "HTMLObjectElement": [
        "object"
      ],
      "HTMLOptGroupElement": [
        "optgroup"
      ],
      "HTMLOptionElement": [
        "option"
      ],
      "HTMLOutputElement": [
        "output"
      ],
      "HTMLParagraphElement": [
        "p"
      ],
      "HTMLParamElement": [
        "param"
      ],
      "HTMLPictureElement": [
        "picture"
      ],
      "HTMLPreElement": [
        "pre"
      ],
      "HTMLProgressElement": [
        "progress"
      ],
      "HTMLQuoteElement": [
        "blockquote",
        "q",
        "quote"
      ],
      "HTMLScriptElement": [
        "script"
      ],
      "HTMLSelectElement": [
        "select"
      ],
      "HTMLShadowElement": [
        "shadow"
      ],
      "HTMLSlotElement": [
        "slot"
      ],
      "HTMLSourceElement": [
        "source"
      ],
      "HTMLSpanElement": [
        "span"
      ],
      "HTMLStyleElement": [
        "style"
      ],
      "HTMLTableCaptionElement": [
        "caption"
      ],
      "HTMLTableCellElement": [
        "td",
        "th"
      ],
      "HTMLTableColElement": [
        "col",
        "colgroup"
      ],
      "HTMLTableElement": [
        "table"
      ],
      "HTMLTableRowElement": [
        "tr"
      ],
      "HTMLTableSectionElement": [
        "thead",
        "tbody",
        "tfoot"
      ],
      "HTMLTemplateElement": [
        "template"
      ],
      "HTMLTextAreaElement": [
        "textarea"
      ],
      "HTMLTimeElement": [
        "time"
      ],
      "HTMLTitleElement": [
        "title"
      ],
      "HTMLTrackElement": [
        "track"
      ],
      "HTMLUListElement": [
        "ul"
      ],
      "HTMLUnknownElement": [
        "unknown",
        "vhgroupv",
        "vkeygen"
      ],
      "HTMLVideoElement": [
        "video"
      ]
    },
    "nodes": {
      "Attr": [
        "node"
      ],
      "Audio": [
        "audio"
      ],
      "CDATASection": [
        "node"
      ],
      "CharacterData": [
        "node"
      ],
      "Comment": [
        "#comment"
      ],
      "Document": [
        "#document"
      ],
      "DocumentFragment": [
        "#document-fragment"
      ],
      "DocumentType": [
        "node"
      ],
      "HTMLDocument": [
        "#document"
      ],
      "Image": [
        "img"
      ],
      "Option": [
        "option"
      ],
      "ProcessingInstruction": [
        "node"
      ],
      "ShadowRoot": [
        "#shadow-root"
      ],
      "Text": [
        "#text"
      ],
      "XMLDocument": [
        "xml"
      ]
    }
  }));
  
  
    
  // passed at runtime, configurable via nodejs module
  if (typeof polyfill !== 'object') polyfill = {type: polyfill || 'auto'};
  
  var
    // V0 polyfill entry
    REGISTER_ELEMENT = 'registerElement',
  
    // IE < 11 only + old WebKit for attributes + feature detection
    EXPANDO_UID = '__' + REGISTER_ELEMENT + (window.Math.random() * 10e4 >> 0),
  
    // shortcuts and costants
    ADD_EVENT_LISTENER = 'addEventListener',
    ATTACHED = 'attached',
    CALLBACK = 'Callback',
    DETACHED = 'detached',
    EXTENDS = 'extends',
  
    ATTRIBUTE_CHANGED_CALLBACK = 'attributeChanged' + CALLBACK,
    ATTACHED_CALLBACK = ATTACHED + CALLBACK,
    CONNECTED_CALLBACK = 'connected' + CALLBACK,
    DISCONNECTED_CALLBACK = 'disconnected' + CALLBACK,
    CREATED_CALLBACK = 'created' + CALLBACK,
    DETACHED_CALLBACK = DETACHED + CALLBACK,
  
    ADDITION = 'ADDITION',
    MODIFICATION = 'MODIFICATION',
    REMOVAL = 'REMOVAL',
  
    DOM_ATTR_MODIFIED = 'DOMAttrModified',
    DOM_CONTENT_LOADED = 'DOMContentLoaded',
    DOM_SUBTREE_MODIFIED = 'DOMSubtreeModified',
  
    PREFIX_TAG = '<',
    PREFIX_IS = '=',
  
    // valid and invalid node names
    validName = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/,
    invalidNames = [
      'ANNOTATION-XML',
      'COLOR-PROFILE',
      'FONT-FACE',
      'FONT-FACE-SRC',
      'FONT-FACE-URI',
      'FONT-FACE-FORMAT',
      'FONT-FACE-NAME',
      'MISSING-GLYPH'
    ],
  
    // registered types and their prototypes
    types = [],
    protos = [],
  
    // to query subnodes
    query = '',
  
    // html shortcut used to feature detect
    documentElement = document.documentElement,
  
    // ES5 inline helpers || basic patches
    indexOf = types.indexOf || function (v) {
      for(var i = this.length; i-- && this[i] !== v;){}
      return i;
    },
  
    // other helpers / shortcuts
    OP = Object.prototype,
    hOP = OP.hasOwnProperty,
    iPO = OP.isPrototypeOf,
  
    defineProperty = Object.defineProperty,
    empty = [],
    gOPD = Object.getOwnPropertyDescriptor,
    gOPN = Object.getOwnPropertyNames,
    gPO = Object.getPrototypeOf,
    sPO = Object.setPrototypeOf,
  
    // jshint proto: true
    hasProto = !!Object.__proto__,
  
    // V1 helpers
    fixGetClass = false,
    DRECEV1 = '__dreCEv1',
    customElements = window.customElements,
    usableCustomElements = !/^force/.test(polyfill.type) && !!(
      customElements &&
      customElements.define &&
      customElements.get &&
      customElements.whenDefined
    ),
    Dict = Object.create || Object,
    Map = window.Map || function Map() {
      var K = [], V = [], i;
      return {
        get: function (k) {
          return V[indexOf.call(K, k)];
        },
        set: function (k, v) {
          i = indexOf.call(K, k);
          if (i < 0) V[K.push(k) - 1] = v;
          else V[i] = v;
        }
      };
    },
    Promise = window.Promise || function (fn) {
      var
        notify = [],
        done = false,
        p = {
          'catch': function () {
            return p;
          },
          'then': function (cb) {
            notify.push(cb);
            if (done) setTimeout(resolve, 1);
            return p;
          }
        }
      ;
      function resolve(value) {
        done = true;
        while (notify.length) notify.shift()(value);
      }
      fn(resolve);
      return p;
    },
    justCreated = false,
    constructors = Dict(null),
    waitingList = Dict(null),
    nodeNames = new Map(),
    secondArgument = function (is) {
      return is.toLowerCase();
    },
  
    // used to create unique instances
    create = Object.create || function Bridge(proto) {
      // silly broken polyfill probably ever used but short enough to work
      return proto ? ((Bridge.prototype = proto), new Bridge()) : this;
    },
  
    // will set the prototype if possible
    // or copy over all properties
    setPrototype = sPO || (
      hasProto ?
        function (o, p) {
          o.__proto__ = p;
          return o;
        } : (
      (gOPN && gOPD) ?
        (function(){
          function setProperties(o, p) {
            for (var
              key,
              names = gOPN(p),
              i = 0, length = names.length;
              i < length; i++
            ) {
              key = names[i];
              if (!hOP.call(o, key)) {
                defineProperty(o, key, gOPD(p, key));
              }
            }
          }
          return function (o, p) {
            do {
              setProperties(o, p);
            } while ((p = gPO(p)) && !iPO.call(p, o));
            return o;
          };
        }()) :
        function (o, p) {
          for (var key in p) {
            o[key] = p[key];
          }
          return o;
        }
    )),
  
    // DOM shortcuts and helpers, if any
  
    MutationObserver = window.MutationObserver ||
                       window.WebKitMutationObserver,
  
    HTMLElementPrototype = (
      window.HTMLElement ||
      window.Element ||
      window.Node
    ).prototype,
  
    IE8 = !iPO.call(HTMLElementPrototype, documentElement),
  
    safeProperty = IE8 ? function (o, k, d) {
      o[k] = d.value;
      return o;
    } : defineProperty,
  
    isValidNode = IE8 ?
      function (node) {
        return node.nodeType === 1;
      } :
      function (node) {
        return iPO.call(HTMLElementPrototype, node);
      },
  
    targets = IE8 && [],
  
    attachShadow = HTMLElementPrototype.attachShadow,
    cloneNode = HTMLElementPrototype.cloneNode,
    dispatchEvent = HTMLElementPrototype.dispatchEvent,
    getAttribute = HTMLElementPrototype.getAttribute,
    hasAttribute = HTMLElementPrototype.hasAttribute,
    removeAttribute = HTMLElementPrototype.removeAttribute,
    setAttribute = HTMLElementPrototype.setAttribute,
  
    // replaced later on
    createElement = document.createElement,
    patchedCreateElement = createElement,
  
    // shared observer for all attributes
    attributesObserver = MutationObserver && {
      attributes: true,
      characterData: true,
      attributeOldValue: true
    },
  
    // useful to detect only if there's no MutationObserver
    DOMAttrModified = MutationObserver || function(e) {
      doesNotSupportDOMAttrModified = false;
      documentElement.removeEventListener(
        DOM_ATTR_MODIFIED,
        DOMAttrModified
      );
    },
  
    // will both be used to make DOMNodeInserted asynchronous
    asapQueue,
    asapTimer = 0,
  
    // internal flags
    V0 = REGISTER_ELEMENT in document &&
         !/^force-all/.test(polyfill.type),
    setListener = true,
    justSetup = false,
    doesNotSupportDOMAttrModified = true,
    dropDomContentLoaded = true,
  
    // needed for the innerHTML helper
    notFromInnerHTMLHelper = true,
  
    // optionally defined later on
    onSubtreeModified,
    callDOMAttrModified,
    getAttributesMirror,
    observer,
    observe,
  
    // based on setting prototype capability
    // will check proto or the expando attribute
    // in order to setup the node once
    patchIfNotAlready,
    patch
  ;
  
  // only if needed
  if (!V0) {
  
    if (sPO || hasProto) {
        patchIfNotAlready = function (node, proto) {
          if (!iPO.call(proto, node)) {
            setupNode(node, proto);
          }
        };
        patch = setupNode;
    } else {
        patchIfNotAlready = function (node, proto) {
          if (!node[EXPANDO_UID]) {
            node[EXPANDO_UID] = Object(true);
            setupNode(node, proto);
          }
        };
        patch = patchIfNotAlready;
    }
  
    if (IE8) {
      doesNotSupportDOMAttrModified = false;
      (function (){
        var
          descriptor = gOPD(HTMLElementPrototype, ADD_EVENT_LISTENER),
          addEventListener = descriptor.value,
          patchedRemoveAttribute = function (name) {
            var e = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true});
            e.attrName = name;
            e.prevValue = getAttribute.call(this, name);
            e.newValue = null;
            e[REMOVAL] = e.attrChange = 2;
            removeAttribute.call(this, name);
            dispatchEvent.call(this, e);
          },
          patchedSetAttribute = function (name, value) {
            var
              had = hasAttribute.call(this, name),
              old = had && getAttribute.call(this, name),
              e = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true})
            ;
            setAttribute.call(this, name, value);
            e.attrName = name;
            e.prevValue = had ? old : null;
            e.newValue = value;
            if (had) {
              e[MODIFICATION] = e.attrChange = 1;
            } else {
              e[ADDITION] = e.attrChange = 0;
            }
            dispatchEvent.call(this, e);
          },
          onPropertyChange = function (e) {
            // jshint eqnull:true
            var
              node = e.currentTarget,
              superSecret = node[EXPANDO_UID],
              propertyName = e.propertyName,
              event
            ;
            if (superSecret.hasOwnProperty(propertyName)) {
              superSecret = superSecret[propertyName];
              event = new CustomEvent(DOM_ATTR_MODIFIED, {bubbles: true});
              event.attrName = superSecret.name;
              event.prevValue = superSecret.value || null;
              event.newValue = (superSecret.value = node[propertyName] || null);
              if (event.prevValue == null) {
                event[ADDITION] = event.attrChange = 0;
              } else {
                event[MODIFICATION] = event.attrChange = 1;
              }
              dispatchEvent.call(node, event);
            }
          }
        ;
        descriptor.value = function (type, handler, capture) {
          if (
            type === DOM_ATTR_MODIFIED &&
            this[ATTRIBUTE_CHANGED_CALLBACK] &&
            this.setAttribute !== patchedSetAttribute
          ) {
            this[EXPANDO_UID] = {
              className: {
                name: 'class',
                value: this.className
              }
            };
            this.setAttribute = patchedSetAttribute;
            this.removeAttribute = patchedRemoveAttribute;
            addEventListener.call(this, 'propertychange', onPropertyChange);
          }
          addEventListener.call(this, type, handler, capture);
        };
        defineProperty(HTMLElementPrototype, ADD_EVENT_LISTENER, descriptor);
      }());
    } else if (!MutationObserver) {
      documentElement[ADD_EVENT_LISTENER](DOM_ATTR_MODIFIED, DOMAttrModified);
      documentElement.setAttribute(EXPANDO_UID, 1);
      documentElement.removeAttribute(EXPANDO_UID);
      if (doesNotSupportDOMAttrModified) {
        onSubtreeModified = function (e) {
          var
            node = this,
            oldAttributes,
            newAttributes,
            key
          ;
          if (node === e.target) {
            oldAttributes = node[EXPANDO_UID];
            node[EXPANDO_UID] = (newAttributes = getAttributesMirror(node));
            for (key in newAttributes) {
              if (!(key in oldAttributes)) {
                // attribute was added
                return callDOMAttrModified(
                  0,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  ADDITION
                );
              } else if (newAttributes[key] !== oldAttributes[key]) {
                // attribute was changed
                return callDOMAttrModified(
                  1,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  MODIFICATION
                );
              }
            }
            // checking if it has been removed
            for (key in oldAttributes) {
              if (!(key in newAttributes)) {
                // attribute removed
                return callDOMAttrModified(
                  2,
                  node,
                  key,
                  oldAttributes[key],
                  newAttributes[key],
                  REMOVAL
                );
              }
            }
          }
        };
        callDOMAttrModified = function (
          attrChange,
          currentTarget,
          attrName,
          prevValue,
          newValue,
          action
        ) {
          var e = {
            attrChange: attrChange,
            currentTarget: currentTarget,
            attrName: attrName,
            prevValue: prevValue,
            newValue: newValue
          };
          e[action] = attrChange;
          onDOMAttrModified(e);
        };
        getAttributesMirror = function (node) {
          for (var
            attr, name,
            result = {},
            attributes = node.attributes,
            i = 0, length = attributes.length;
            i < length; i++
          ) {
            attr = attributes[i];
            name = attr.name;
            if (name !== 'setAttribute') {
              result[name] = attr.value;
            }
          }
          return result;
        };
      }
    }
  
    // set as enumerable, writable and configurable
    document[REGISTER_ELEMENT] = function registerElement(type, options) {
      upperType = type.toUpperCase();
      if (setListener) {
        // only first time document.registerElement is used
        // we need to set this listener
        // setting it by default might slow down for no reason
        setListener = false;
        if (MutationObserver) {
          observer = (function(attached, detached){
            function checkEmAll(list, callback) {
              for (var i = 0, length = list.length; i < length; callback(list[i++])){}
            }
            return new MutationObserver(function (records) {
              for (var
                current, node, newValue,
                i = 0, length = records.length; i < length; i++
              ) {
                current = records[i];
                if (current.type === 'childList') {
                  checkEmAll(current.addedNodes, attached);
                  checkEmAll(current.removedNodes, detached);
                } else {
                  node = current.target;
                  if (notFromInnerHTMLHelper &&
                      node[ATTRIBUTE_CHANGED_CALLBACK] &&
                      current.attributeName !== 'style') {
                    newValue = getAttribute.call(node, current.attributeName);
                    if (newValue !== current.oldValue) {
                      node[ATTRIBUTE_CHANGED_CALLBACK](
                        current.attributeName,
                        current.oldValue,
                        newValue
                      );
                    }
                  }
                }
              }
            });
          }(executeAction(ATTACHED), executeAction(DETACHED)));
          observe = function (node) {
            observer.observe(
              node,
              {
                childList: true,
                subtree: true
              }
            );
            return node;
          };
          observe(document);
          if (attachShadow) {
            HTMLElementPrototype.attachShadow = function () {
              return observe(attachShadow.apply(this, arguments));
            };
          }
        } else {
          asapQueue = [];
          document[ADD_EVENT_LISTENER]('DOMNodeInserted', onDOMNode(ATTACHED));
          document[ADD_EVENT_LISTENER]('DOMNodeRemoved', onDOMNode(DETACHED));
        }
  
        document[ADD_EVENT_LISTENER](DOM_CONTENT_LOADED, onReadyStateChange);
        document[ADD_EVENT_LISTENER]('readystatechange', onReadyStateChange);
  
        HTMLElementPrototype.cloneNode = function (deep) {
          var
            node = cloneNode.call(this, !!deep),
            i = getTypeIndex(node)
          ;
          if (-1 < i) patch(node, protos[i]);
          if (deep && query.length) loopAndSetup(node.querySelectorAll(query));
          return node;
        };
      }
  
      if (justSetup) return (justSetup = false);
  
      if (-2 < (
        indexOf.call(types, PREFIX_IS + upperType) +
        indexOf.call(types, PREFIX_TAG + upperType)
      )) {
        throwTypeError(type);
      }
  
      if (!validName.test(upperType) || -1 < indexOf.call(invalidNames, upperType)) {
        throw new Error('The type ' + type + ' is invalid');
      }
  
      var
        constructor = function () {
          return extending ?
            document.createElement(nodeName, upperType) :
            document.createElement(nodeName);
        },
        opt = options || OP,
        extending = hOP.call(opt, EXTENDS),
        nodeName = extending ? options[EXTENDS].toUpperCase() : upperType,
        upperType,
        i
      ;
  
      if (extending && -1 < (
        indexOf.call(types, PREFIX_TAG + nodeName)
      )) {
        throwTypeError(nodeName);
      }
  
      i = types.push((extending ? PREFIX_IS : PREFIX_TAG) + upperType) - 1;
  
      query = query.concat(
        query.length ? ',' : '',
        extending ? nodeName + '[is="' + type.toLowerCase() + '"]' : nodeName
      );
  
      constructor.prototype = (
        protos[i] = hOP.call(opt, 'prototype') ?
          opt.prototype :
          create(HTMLElementPrototype)
      );
  
      if (query.length) loopAndVerify(
        document.querySelectorAll(query),
        ATTACHED
      );
  
      return constructor;
    };
  
    document.createElement = (patchedCreateElement = function (localName, typeExtension) {
      var
        is = getIs(typeExtension),
        node = is ?
          createElement.call(document, localName, secondArgument(is)) :
          createElement.call(document, localName),
        name = '' + localName,
        i = indexOf.call(
          types,
          (is ? PREFIX_IS : PREFIX_TAG) +
          (is || name).toUpperCase()
        ),
        setup = -1 < i
      ;
      if (is) {
        node.setAttribute('is', is = is.toLowerCase());
        if (setup) {
          setup = isInQSA(name.toUpperCase(), is);
        }
      }
      notFromInnerHTMLHelper = !document.createElement.innerHTMLHelper;
      if (setup) patch(node, protos[i]);
      return node;
    });
  
  }
  
  function ASAP() {
    var queue = asapQueue.splice(0, asapQueue.length);
    asapTimer = 0;
    while (queue.length) {
      queue.shift().call(
        null, queue.shift()
      );
    }
  }
  
  function loopAndVerify(list, action) {
    for (var i = 0, length = list.length; i < length; i++) {
      verifyAndSetupAndAction(list[i], action);
    }
  }
  
  function loopAndSetup(list) {
    for (var i = 0, length = list.length, node; i < length; i++) {
      node = list[i];
      patch(node, protos[getTypeIndex(node)]);
    }
  }
  
  function executeAction(action) {
    return function (node) {
      if (isValidNode(node)) {
        verifyAndSetupAndAction(node, action);
        if (query.length) loopAndVerify(
          node.querySelectorAll(query),
          action
        );
      }
    };
  }
  
  function getTypeIndex(target) {
    var
      is = getAttribute.call(target, 'is'),
      nodeName = target.nodeName.toUpperCase(),
      i = indexOf.call(
        types,
        is ?
            PREFIX_IS + is.toUpperCase() :
            PREFIX_TAG + nodeName
      )
    ;
    return is && -1 < i && !isInQSA(nodeName, is) ? -1 : i;
  }
  
  function isInQSA(name, type) {
    return -1 < query.indexOf(name + '[is="' + type + '"]');
  }
  
  function onDOMAttrModified(e) {
    var
      node = e.currentTarget,
      attrChange = e.attrChange,
      attrName = e.attrName,
      target = e.target,
      addition = e[ADDITION] || 2,
      removal = e[REMOVAL] || 3
    ;
    if (notFromInnerHTMLHelper &&
        (!target || target === node) &&
        node[ATTRIBUTE_CHANGED_CALLBACK] &&
        attrName !== 'style' && (
          e.prevValue !== e.newValue ||
          // IE9, IE10, and Opera 12 gotcha
          e.newValue === '' && (
            attrChange === addition ||
            attrChange === removal
          )
    )) {
      node[ATTRIBUTE_CHANGED_CALLBACK](
        attrName,
        attrChange === addition ? null : e.prevValue,
        attrChange === removal ? null : e.newValue
      );
    }
  }
  
  function onDOMNode(action) {
    var executor = executeAction(action);
    return function (e) {
      asapQueue.push(executor, e.target);
      if (asapTimer) clearTimeout(asapTimer);
      asapTimer = setTimeout(ASAP, 1);
    };
  }
  
  function onReadyStateChange(e) {
    if (dropDomContentLoaded) {
      dropDomContentLoaded = false;
      e.currentTarget.removeEventListener(DOM_CONTENT_LOADED, onReadyStateChange);
    }
    if (query.length) loopAndVerify(
      (e.target || document).querySelectorAll(query),
      e.detail === DETACHED ? DETACHED : ATTACHED
    );
    if (IE8) purge();
  }
  
  function patchedSetAttribute(name, value) {
    // jshint validthis:true
    var self = this;
    setAttribute.call(self, name, value);
    onSubtreeModified.call(self, {target: self});
  }
  
  function setupNode(node, proto) {
    setPrototype(node, proto);
    if (observer) {
      observer.observe(node, attributesObserver);
    } else {
      if (doesNotSupportDOMAttrModified) {
        node.setAttribute = patchedSetAttribute;
        node[EXPANDO_UID] = getAttributesMirror(node);
        node[ADD_EVENT_LISTENER](DOM_SUBTREE_MODIFIED, onSubtreeModified);
      }
      node[ADD_EVENT_LISTENER](DOM_ATTR_MODIFIED, onDOMAttrModified);
    }
    if (node[CREATED_CALLBACK] && notFromInnerHTMLHelper) {
      node.created = true;
      node[CREATED_CALLBACK]();
      node.created = false;
    }
  }
  
  function purge() {
    for (var
      node,
      i = 0,
      length = targets.length;
      i < length; i++
    ) {
      node = targets[i];
      if (!documentElement.contains(node)) {
        length--;
        targets.splice(i--, 1);
        verifyAndSetupAndAction(node, DETACHED);
      }
    }
  }
  
  function throwTypeError(type) {
    throw new Error('A ' + type + ' type is already registered');
  }
  
  function verifyAndSetupAndAction(node, action) {
    var
      fn,
      i = getTypeIndex(node),
      counterAction
    ;
    if (-1 < i) {
      patchIfNotAlready(node, protos[i]);
      i = 0;
      if (action === ATTACHED && !node[ATTACHED]) {
        node[DETACHED] = false;
        node[ATTACHED] = true;
        counterAction = 'connected';
        i = 1;
        if (IE8 && indexOf.call(targets, node) < 0) {
          targets.push(node);
        }
      } else if (action === DETACHED && !node[DETACHED]) {
        node[ATTACHED] = false;
        node[DETACHED] = true;
        counterAction = 'disconnected';
        i = 1;
      }
      if (i && (fn = (
        node[action + CALLBACK] ||
        node[counterAction + CALLBACK]
      ))) fn.call(node);
    }
  }
  
  
  
  // V1 in da House!
  function CustomElementRegistry() {}
  
  CustomElementRegistry.prototype = {
    constructor: CustomElementRegistry,
    // a workaround for the stubborn WebKit
    define: usableCustomElements ?
      function (name, Class, options) {
        if (options) {
          CERDefine(name, Class, options);
        } else {
          var NAME = name.toUpperCase();
          constructors[NAME] = {
            constructor: Class,
            create: [NAME]
          };
          nodeNames.set(Class, NAME);
          customElements.define(name, Class);
        }
      } :
      CERDefine,
    get: usableCustomElements ?
      function (name) {
        return customElements.get(name) || get(name);
      } :
      get,
    whenDefined: usableCustomElements ?
      function (name) {
        return Promise.race([
          customElements.whenDefined(name),
          whenDefined(name)
        ]);
      } :
      whenDefined
  };
  
  function CERDefine(name, Class, options) {
    var
      is = options && options[EXTENDS] || '',
      CProto = Class.prototype,
      proto = create(CProto),
      attributes = Class.observedAttributes || empty,
      definition = {prototype: proto}
    ;
    // TODO: is this needed at all since it's inherited?
    // defineProperty(proto, 'constructor', {value: Class});
    safeProperty(proto, CREATED_CALLBACK, {
        value: function () {
          if (justCreated) justCreated = false;
          else if (!this[DRECEV1]) {
            this[DRECEV1] = true;
            new Class(this);
            if (CProto[CREATED_CALLBACK])
              CProto[CREATED_CALLBACK].call(this);
            var info = constructors[nodeNames.get(Class)];
            if (!usableCustomElements || info.create.length > 1) {
              notifyAttributes(this);
            }
          }
      }
    });
    safeProperty(proto, ATTRIBUTE_CHANGED_CALLBACK, {
      value: function (name) {
        if (-1 < indexOf.call(attributes, name))
          CProto[ATTRIBUTE_CHANGED_CALLBACK].apply(this, arguments);
      }
    });
    if (CProto[CONNECTED_CALLBACK]) {
      safeProperty(proto, ATTACHED_CALLBACK, {
        value: CProto[CONNECTED_CALLBACK]
      });
    }
    if (CProto[DISCONNECTED_CALLBACK]) {
      safeProperty(proto, DETACHED_CALLBACK, {
        value: CProto[DISCONNECTED_CALLBACK]
      });
    }
    if (is) definition[EXTENDS] = is;
    name = name.toUpperCase();
    constructors[name] = {
      constructor: Class,
      create: is ? [is, secondArgument(name)] : [name]
    };
    nodeNames.set(Class, name);
    document[REGISTER_ELEMENT](name.toLowerCase(), definition);
    whenDefined(name);
    waitingList[name].r();
  }
  
  function get(name) {
    var info = constructors[name.toUpperCase()];
    return info && info.constructor;
  }
  
  function getIs(options) {
    return typeof options === 'string' ?
        options : (options && options.is || '');
  }
  
  function notifyAttributes(self) {
    var
      callback = self[ATTRIBUTE_CHANGED_CALLBACK],
      attributes = callback ? self.attributes : empty,
      i = attributes.length,
      attribute
    ;
    while (i--) {
      attribute =  attributes[i]; // || attributes.item(i);
      callback.call(
        self,
        attribute.name || attribute.nodeName,
        null,
        attribute.value || attribute.nodeValue
      );
    }
  }
  
  function whenDefined(name) {
    name = name.toUpperCase();
    if (!(name in waitingList)) {
      waitingList[name] = {};
      waitingList[name].p = new Promise(function (resolve) {
        waitingList[name].r = resolve;
      });
    }
    return waitingList[name].p;
  }
  
  function polyfillV1() {
    if (customElements) delete window.customElements;
    defineProperty(window, 'customElements', {
      configurable: true,
      value: new CustomElementRegistry()
    });
    defineProperty(window, 'CustomElementRegistry', {
      configurable: true,
      value: CustomElementRegistry
    });
    for (var
      patchClass = function (name) {
        var Class = window[name];
        if (Class) {
          window[name] = function CustomElementsV1(self) {
            var info, isNative;
            if (!self) self = this;
            if (!self[DRECEV1]) {
              justCreated = true;
              info = constructors[nodeNames.get(self.constructor)];
              isNative = usableCustomElements && info.create.length === 1;
              self = isNative ?
                Reflect.construct(Class, empty, info.constructor) :
                document.createElement.apply(document, info.create);
              self[DRECEV1] = true;
              justCreated = false;
              if (!isNative) notifyAttributes(self);
            }
            return self;
          };
          window[name].prototype = Class.prototype;
          try {
            Class.prototype.constructor = window[name];
          } catch(WebKit) {
            fixGetClass = true;
            defineProperty(Class, DRECEV1, {value: window[name]});
          }
        }
      },
      Classes = htmlClass.get(/^HTML[A-Z]*[a-z]/),
      i = Classes.length;
      i--;
      patchClass(Classes[i])
    ) {}
    (document.createElement = function (name, options) {
      var is = getIs(options);
      return is ?
        patchedCreateElement.call(this, name, secondArgument(is)) :
        patchedCreateElement.call(this, name);
    });
    if (!V0) {
      justSetup = true;
      document[REGISTER_ELEMENT]('');
    }
  }
  
  // if customElements is not there at all
  if (!customElements || /^force/.test(polyfill.type)) polyfillV1();
  else if(!polyfill.noBuiltIn) {
    // if available test extends work as expected
    try {
      (function (DRE, options, name) {
        options[EXTENDS] = 'a';
        DRE.prototype = create(HTMLAnchorElement.prototype);
        DRE.prototype.constructor = DRE;
        window.customElements.define(name, DRE, options);
        if (
          getAttribute.call(document.createElement('a', {is: name}), 'is') !== name ||
          (usableCustomElements && getAttribute.call(new DRE(), 'is') !== name)
        ) {
          throw options;
        }
      }(
        function DRE() {
          return Reflect.construct(HTMLAnchorElement, [], DRE);
        },
        {},
        'document-register-element-a'
      ));
    } catch(o_O) {
      // or force the polyfill if not
      // and keep internal original reference
      polyfillV1();
    }
  }
  
  // FireFox only issue
  if(!polyfill.noBuiltIn) {
    try {
      createElement.call(document, 'a', 'a');
    } catch(FireFox) {
      secondArgument = function (is) {
        return {is: is.toLowerCase()};
      };
    }
  }
  
}

module.exports = installCustomElements;

},{}],5:[function(require,module,exports){
'use strict';
/*! (C) 2017 Andrea Giammarchi - ISC Style License */

const {Component, bind, define, hyper, wire} = require('hyperhtml/cjs');

const _init$ = {value: false};

const defineProperty = Object.defineProperty;

class HyperHTMLElement extends HTMLElement {

  // define a custom-element in the CustomElementsRegistry
  // class MyEl extends HyperHTMLElement {}
  // MyEl.define('my-el');
  static define(name) {
    const Class = this;
    const proto = Class.prototype;

    // if observedAttributes contains attributes to observe
    // HyperHTMLElement will directly reflect get/setAttribute
    // operation once these attributes are used, example:
    // el.observed = 123;
    // will automatically do
    // el.setAttribute('observed', 123);
    // triggering also the attributeChangedCallback
    (Class.observedAttributes || []).forEach(name => {
      if (!(name in proto)) defineProperty(
        proto,
        name.replace(/-([a-z])/g, ($0, $1) => $1.toUpperCase()),
        {
          configurable: true,
          get() { return this.getAttribute(name); },
          set(value) { this.setAttribute(name, value); }
        }
      );
    });

    const onChanged = proto.attributeChangedCallback;
    const hasChange = !!onChanged;

    // created() {} is the entry point to do whatever you want.
    // Once the node is live and upgraded as Custom Element.
    // This method grants to be triggered at the right time,
    // which is always once, and right before either
    // attributeChangedCallback or connectedCallback
    const created = proto.created;
    if (created) {
      // used to ensure create() is called once and once only
      defineProperty(
        proto,
        '_init$',
        {
          configurable: true,
          writable: true,
          value: true
        }
      );

      // ⚠️ if you need to overwrite/change attributeChangedCallback method
      //    at runtime after class definition, be sure you do so
      //    via Object.defineProperty to preserve its non-enumerable nature.
      defineProperty(
        proto,
        'attributeChangedCallback',
        {
          configurable: true,
          value(name, prev, curr) {
            if (this._init$) {
              created.call(defineProperty(this, '_init$', _init$));
            }
            // ensure setting same value twice
            // won't trigger twice attributeChangedCallback
            if (hasChange && prev !== curr) {
              onChanged.apply(this, arguments);
            }
          }
        }
      );

      // ⚠️ if you need to overwrite/change connectedCallback method
      //    at runtime after class definition, be sure you do so
      //    via Object.defineProperty to preserve its non-enumerable nature.
      const onConnected = proto.connectedCallback;
      const hasConnect = !!onConnected;
      defineProperty(
        proto,
        'connectedCallback',
        {
          configurable: true,
          value() {
            if (this._init$) {
              created.call(defineProperty(this, '_init$', _init$));
            }
            if (hasConnect) {
              onConnected.apply(this, arguments);
            }
          }
        }
      );
    } else if (hasChange) {
      // ⚠️ if you need to overwrite/change attributeChangedCallback method
      //    at runtime after class definition, be sure you do so
      //    via Object.defineProperty to preserve its non-enumerable nature.
      defineProperty(
        proto,
        'attributeChangedCallback',
        {
          configurable: true,
          value(name, prev, curr) {
            // ensure setting same value twice
            // won't trigger twice attributeChangedCallback
            if (prev !== curr) {
              onChanged.apply(this, arguments);
            }
          }
        }
      );
    }

    // define lazily all handlers
    // class { handleClick() { ... }
    // render() { `<a onclick=${this.handleClick}>` } }
    Object.getOwnPropertyNames(proto).forEach(key => {
      if (/^handle[A-Z]/.test(key)) {
        const _key$ = '_' + key + '$';
        const method = proto[key];
        defineProperty(proto, key, {
          configurable: true,
          get() {
            return  this[_key$] ||
                    (this[_key$] = method.bind(this));
          }
        });
      }
    });

    // whenever you want to directly use the component itself
    // as EventListener, you can pass it directly.
    // https://medium.com/@WebReflection/dom-handleevent-a-cross-platform-standard-since-year-2000-5bf17287fd38
    //  class Reactive extends HyperHTMLElement {
    //    oninput(e) { console.log(this, 'changed', e.target.value); }
    //    render() { this.html`<input oninput="${this}">`; }
    //  }
    if (!('handleEvent' in proto)) {
      // ⚠️ if you need to overwrite/change handleEvent method
      //    at runtime after class definition, be sure you do so
      //    via Object.defineProperty to preserve its non-enumerable nature.
      defineProperty(
        proto,
        'handleEvent',
        {
          configurable: true,
          value(event) {
            this[
              (event.currentTarget.dataset || {}).call ||
              ('on' + event.type)
            ](event);
          }
        }
      );
    }

    customElements.define(name, Class);
    return Class;
  }

  // lazily bind once hyperHTML logic
  // to either the shadowRoot, if present and open,
  // the _shadowRoot property, if set due closed shadow root,
  // or the custom-element itself if no Shadow DOM is used.
  get html() {
    return this._html$ || (this.html = bind(
      // in case of Shadow DOM {mode: "open"}, use it
      this.shadowRoot ||
      // in case of Shadow DOM {mode: "close"}, use it
      // this needs the following reference created upfront
      // this._shadowRoot = this.attachShadow({mode: "close"});
      this._shadowRoot ||
      // if no Shadow DOM is used, simply use the component
      // as container for its own content (it just works too)
      this
    ));
  }

  // it can be set too if necessary, it won't invoke render()
  set html(value) {
    defineProperty(this, '_html$', {configurable: true, value: value});
  }

  // ---------------------//
  // Basic State Handling //
  // ---------------------//

  // overwrite this method with your own render
  render() {}

  // define the default state object
  // you could use observed properties too
  get defaultState() { return {}; }

  // the state with a default
  get state() {
    return this._state$ || (this.state = this.defaultState);
  }

  // it can be set too if necessary, it won't invoke render()
  set state(value) {
    defineProperty(this, '_state$', {configurable: true, value: value});
  }

  // currently a state is a shallow copy, like in Preact or other libraries.
  // after the state is updated, the render() method will be invoked.
  // ⚠️ do not ever call this.setState() inside this.render()
  setState(state, render) {
    const target = this.state;
    const source = typeof state === 'function' ? state.call(this, target) : state;
    for (const key in source) target[key] = source[key];
    if (render !== false) this.render();
    return this;
  }

};

// exposing hyperHTML utilities
HyperHTMLElement.Component = Component;
HyperHTMLElement.bind = bind;
HyperHTMLElement.intent = define;
HyperHTMLElement.wire = wire;
HyperHTMLElement.hyper = hyper;

Object.defineProperty(exports, '__esModule', {value: true}).default = HyperHTMLElement;

},{"hyperhtml/cjs":10}],6:[function(require,module,exports){
'use strict';
const { UID } = require('../shared/constants.js');
const { WeakMap } = require('../shared/poorlyfills.js');

// hyperHTML.Component is a very basic class
// able to create Custom Elements like components
// including the ability to listen to connect/disconnect
// events via onconnect/ondisconnect attributes
// Components can be created imperatively or declaratively.
// The main difference is that declared components
// will not automatically render on setState(...)
// to simplify state handling on render.
function Component() {}
Object.defineProperty(exports, '__esModule', {value: true}).default = Component

// components will lazily define html or svg properties
// as soon as these are invoked within the .render() method
// Such render() method is not provided by the base class
// but it must be available through the Component extend.
// Declared components could implement a
// render(props) method too and use props as needed.
function setup(content) {
  const children = new WeakMap;
  const create = Object.create;
  const createEntry = (wm, id, component) => {
    wm.set(id, component);
    return component;
  };
  const get = (Class, info, id) => {
    switch (typeof id) {
      case 'object':
      case 'function':
        const wm = info.w || (info.w = new WeakMap);
        return wm.get(id) || createEntry(wm, id, new Class);
      default:
        const sm = info.p || (info.p = create(null));
        return sm[id] || (sm[id] = new Class);
    }
  };
  const set = context => {
    const info = {w: null, p: null};
    children.set(context, info);
    return info;
  };
  Object.defineProperties(
    Component,
    {
      for: {
        configurable: true,
        value(context, id) {
          const info = children.get(context) || set(context);
          return get(this, info, id == null ? 'default' : id);
        }
      }
    }
  );
  Object.defineProperties(
    Component.prototype,
    {
      handleEvent: {value(e) {
        const ct = e.currentTarget;
        this[
          ('getAttribute' in ct && ct.getAttribute('data-call')) ||
          ('on' + e.type)
        ](e);
      }},
      html: lazyGetter('html', content),
      svg: lazyGetter('svg', content),
      state: lazyGetter('state', function () { return this.defaultState; }),
      defaultState: {get() { return {}; }},
      setState: {value(state, render) {
        const target = this.state;
        const source = typeof state === 'function' ? state.call(this, target) : state;
        for (const key in source) target[key] = source[key];
        if (render !== false) this.render();
        return this;
      }}
    }
  );
}
exports.setup = setup

// instead of a secret key I could've used a WeakMap
// However, attaching a property directly will result
// into better performance with thousands of components
// hanging around, and less memory pressure caused by the WeakMap
const lazyGetter = (type, fn) => {
  const secret = '_' + type + '$';
  return {
    get() {
      return this[secret] || (this[type] = fn.call(this, type));
    },
    set(value) {
      Object.defineProperty(this, secret, {configurable: true, value});
    }
  };
};

},{"../shared/constants.js":15,"../shared/poorlyfills.js":19}],7:[function(require,module,exports){
'use strict';
const { append } = require('../shared/utils.js');
const { doc, fragment } = require('../shared/easy-dom.js');

function Wire(childNodes) {
  this.childNodes = childNodes;
  this.length = childNodes.length;
  this.first = childNodes[0];
  this.last = childNodes[this.length - 1];
}
Object.defineProperty(exports, '__esModule', {value: true}).default = Wire

// when a wire is inserted, all its nodes will follow
Wire.prototype.insert = function insert() {
  const df = fragment(this.first);
  append(df, this.childNodes);
  return df;
};

// when a wire is removed, all its nodes must be removed as well
Wire.prototype.remove = function remove() {
  const first = this.first;
  const last = this.last;
  if (this.length === 2) {
    last.parentNode.removeChild(last);
  } else {
    const range = doc(first).createRange();
    range.setStartBefore(this.childNodes[1]);
    range.setEndAfter(last);
    range.deleteContents();
  }
  return first;
};

},{"../shared/easy-dom.js":17,"../shared/utils.js":21}],8:[function(require,module,exports){
'use strict';
const {Map, WeakMap} = require('../shared/poorlyfills.js');
const {UIDC, VOID_ELEMENTS} = require('../shared/constants.js');
const Updates = (m => m.__esModule ? m.default : m)(require('../objects/Updates.js'));
const {
  createFragment,
  importNode,
  unique
} = require('../shared/utils.js');

const {selfClosing} = require('../shared/re.js');

// a weak collection of contexts that
// are already known to hyperHTML
const bewitched = new WeakMap;

// the collection of all template literals
// since these are unique and immutable
// for the whole application life-cycle
const templates = new Map;

// better known as hyper.bind(node), the render is
// the main tag function in charge of fully upgrading
// or simply updating, contexts used as hyperHTML targets.
// The `this` context is either a regular DOM node or a fragment.
function render(template) {
  const wicked = bewitched.get(this);
  if (wicked && wicked.template === unique(template)) {
    update.apply(wicked.updates, arguments);
  } else {
    upgrade.apply(this, arguments);
  }
  return this;
}

// an upgrade is in charge of collecting template info,
// parse it once, if unknown, to map all interpolations
// as single DOM callbacks, relate such template
// to the current context, and render it after cleaning the context up
function upgrade(template) {
  template = unique(template);
  const info =  templates.get(template) ||
                createTemplate.call(this, template);
  const fragment = importNode(this.ownerDocument, info.fragment);
  const updates = Updates.create(fragment, info.paths);
  bewitched.set(this, {template, updates});
  update.apply(updates, arguments);
  this.textContent = '';
  this.appendChild(fragment);
}

// an update simply loops over all mapped DOM operations
function update() {
  const length = arguments.length;
  for (let i = 1; i < length; i++) {
    this[i - 1](arguments[i]);
  }
}

// a template can be used to create a document fragment
// aware of all interpolations and with a list
// of paths used to find once those nodes that need updates,
// no matter if these are attributes, text nodes, or regular one
function createTemplate(template) {
  const paths = [];
  const html = template.join(UIDC).replace(SC_RE, SC_PLACE);
  const fragment = createFragment(this, html);
  Updates.find(fragment, paths, template.slice());
  const info = {fragment, paths};
  templates.set(template, info);
  return info;
}

// some node could be special though, like a custom element
// with a self closing tag, which should work through these changes.
const SC_RE = selfClosing;
const SC_PLACE = ($0, $1, $2) => {
  return VOID_ELEMENTS.test($1) ? $0 : ('<' + $1 + $2 + '></' + $1 + '>');
};

Object.defineProperty(exports, '__esModule', {value: true}).default = render;

},{"../objects/Updates.js":14,"../shared/constants.js":15,"../shared/poorlyfills.js":19,"../shared/re.js":20,"../shared/utils.js":21}],9:[function(require,module,exports){
'use strict';
const {ELEMENT_NODE, SVG_NAMESPACE} = require('../shared/constants.js');
const {WeakMap, trim} = require('../shared/poorlyfills.js');
const {fragment} = require('../shared/easy-dom.js');
const {append, slice, unique} = require('../shared/utils.js');
const Wire = (m => m.__esModule ? m.default : m)(require('../classes/Wire.js'));
const render = (m => m.__esModule ? m.default : m)(require('./render.js'));

// all wires used per each context
const wires = new WeakMap;

// A wire is a callback used as tag function
// to lazily relate a generic object to a template literal.
// hyper.wire(user)`<div id=user>${user.name}</div>`; => the div#user
// This provides the ability to have a unique DOM structure
// related to a unique JS object through a reusable template literal.
// A wire can specify a type, as svg or html, and also an id
// via html:id or :id convention. Such :id allows same JS objects
// to be associated to different DOM structures accordingly with
// the used template literal without losing previously rendered parts.
const wire = (obj, type) => obj == null ?
  content(type || 'html') :
  weakly(obj, type || 'html');

// A wire content is a virtual reference to one or more nodes.
// It's represented by either a DOM node, or an Array.
// In both cases, the wire content role is to simply update
// all nodes through the list of related callbacks.
// In few words, a wire content is like an invisible parent node
// in charge of updating its content like a bound element would do.
const content = type => {
  let wire, container, content, template, updates;
  return function (statics) {
    statics = unique(statics);
    let setup = template !== statics;
    if (setup) {
      template = statics;
      content = fragment(document);
      container = type === 'svg' ?
        document.createElementNS(SVG_NAMESPACE, 'svg') :
        content;
      updates = render.bind(container);
    }
    updates.apply(null, arguments);
    if (setup) {
      if (type === 'svg') {
        append(content, slice.call(container.childNodes));
      }
      wire = wireContent(content);
    }
    return wire;
  };
};

// wires are weakly created through objects.
// Each object can have multiple wires associated
// and this is thanks to the type + :id feature.
const weakly = (obj, type) => {
  const i = type.indexOf(':');
  let wire = wires.get(obj);
  let id = type;
  if (-1 < i) {
    id = type.slice(i + 1);
    type = type.slice(0, i) || 'html';
  }
  if (!wire) wires.set(obj, wire = {});
  return wire[id] || (wire[id] = content(type));
};

// a document fragment loses its nodes as soon
// as it's appended into another node.
// This would easily lose wired content
// so that on a second render call, the parent
// node wouldn't know which node was there
// associated to the interpolation.
// To prevent hyperHTML to forget about wired nodes,
// these are either returned as Array or, if there's ony one entry,
// as single referenced node that won't disappear from the fragment.
// The initial fragment, at this point, would be used as unique reference.
const wireContent = node => {
  const childNodes = node.childNodes;
  const length = childNodes.length;
  const wireNodes = [];
  for (let i = 0; i < length; i++) {
    let child = childNodes[i];
    if (
      child.nodeType === ELEMENT_NODE ||
      trim.call(child.textContent).length !== 0
    ) {
      wireNodes.push(child);
    }
  }
  return wireNodes.length === 1 ? wireNodes[0] : new Wire(wireNodes);
};

exports.content = content;
exports.weakly = weakly;
Object.defineProperty(exports, '__esModule', {value: true}).default = wire;

},{"../classes/Wire.js":7,"../shared/constants.js":15,"../shared/easy-dom.js":17,"../shared/poorlyfills.js":19,"../shared/utils.js":21,"./render.js":8}],10:[function(require,module,exports){
'use strict';
/*! (c) Andrea Giammarchi (ISC) */

const Component = (m => m.__esModule ? m.default : m)(require('./classes/Component.js'));
const {setup} = require('./classes/Component.js');
const Intent = (m => m.__esModule ? m.default : m)(require('./objects/Intent.js'));
const wire = (m => m.__esModule ? m.default : m)(require('./hyper/wire.js'));
const {content, weakly} = require('./hyper/wire.js');
const render = (m => m.__esModule ? m.default : m)(require('./hyper/render.js'));
const diff = (m => m.__esModule ? m.default : m)(require('./shared/domdiff.js'));

// all functions are self bound to the right context
// you can do the following
// const {bind, wire} = hyperHTML;
// and use them right away: bind(node)`hello!`;
const bind = context => render.bind(context);
const define = Intent.define;

hyper.Component = Component;
hyper.bind = bind;
hyper.define = define;
hyper.diff = diff;
hyper.hyper = hyper;
hyper.wire = wire;

// the wire content is the lazy defined
// html or svg property of each hyper.Component
setup(content);

// everything is exported directly or through the
// hyperHTML callback, when used as top level script
exports.Component = Component;
exports.bind = bind;
exports.define = define;
exports.diff = diff;
exports.hyper = hyper;
exports.wire = wire;

// by default, hyperHTML is a smart function
// that "magically" understands what's the best
// thing to do with passed arguments
function hyper(HTML) {
  return arguments.length < 2 ?
    (HTML == null ?
      content('html') :
      (typeof HTML === 'string' ?
        hyper.wire(null, HTML) :
        ('raw' in HTML ?
          content('html')(HTML) :
          ('nodeType' in HTML ?
            hyper.bind(HTML) :
            weakly(HTML, 'html')
          )
        )
      )) :
    ('raw' in HTML ?
      content('html') : hyper.wire
    ).apply(null, arguments);
}
Object.defineProperty(exports, '__esModule', {value: true}).default = hyper

},{"./classes/Component.js":6,"./hyper/render.js":8,"./hyper/wire.js":9,"./objects/Intent.js":11,"./shared/domdiff.js":16}],11:[function(require,module,exports){
'use strict';
const intents = {};
const keys = [];
const hasOwnProperty = intents.hasOwnProperty;

let length = 0;

Object.defineProperty(exports, '__esModule', {value: true}).default = {

  // hyperHTML.define('intent', (object, update) => {...})
  // can be used to define a third parts update mechanism
  // when every other known mechanism failed.
  // hyper.define('user', info => info.name);
  // hyper(node)`<p>${{user}}</p>`;
  define: (intent, callback) => {
    if (!(intent in intents)) {
      length = keys.push(intent);
    }
    intents[intent] = callback;
  },

  // this method is used internally as last resort
  // to retrieve a value out of an object
  invoke: (object, callback) => {
    for (let i = 0; i < length; i++) {
      let key = keys[i];
      if (hasOwnProperty.call(object, key)) {
        return intents[key](object[key], callback);
      }
    }
  }
};

},{}],12:[function(require,module,exports){
'use strict';
const {
  COMMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
  ELEMENT_NODE
} = require('../shared/constants.js');

// every template literal interpolation indicates
// a precise target in the DOM the template is representing.
// `<p id=${'attribute'}>some ${'content'}</p>`
// hyperHTML finds only once per template literal,
// hence once per entire application life-cycle,
// all nodes that are related to interpolations.
// These nodes are stored as indexes used to retrieve,
// once per upgrade, nodes that will change on each future update.
// A path example is [2, 0, 1] representing the operation:
// node.childNodes[2].childNodes[0].childNodes[1]
// Attributes are addressed via their owner node and their name.
const createPath = node => {
  const path = [];
  let parentNode;
  switch (node.nodeType) {
    case ELEMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      parentNode = node;
      break;
    case COMMENT_NODE:
      parentNode = node.parentNode;
      prepend(path, parentNode, node);
      break;
    default:
      parentNode = node.ownerElement;
      break;
  }
  for (
    node = parentNode;
    (parentNode = parentNode.parentNode);
    node = parentNode
  ) {
    prepend(path, parentNode, node);
  }
  return path;
};

const prepend = (path, parent, node) => {
  path.unshift(path.indexOf.call(parent.childNodes, node));
};

Object.defineProperty(exports, '__esModule', {value: true}).default = {
  create: (type, node, name) => ({type, name, node, path: createPath(node)}),
  find: (node, path) => {
    const length = path.length;
    for (let i = 0; i < length; i++) {
      node = node.childNodes[path[i]];
    }
    return node;
  }
}

},{"../shared/constants.js":15}],13:[function(require,module,exports){
'use strict';
// from https://github.com/developit/preact/blob/33fc697ac11762a1cb6e71e9847670d047af7ce5/src/constants.js
const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

// style is handled as both string and object
// even if the target is an SVG element (consistency)
Object.defineProperty(exports, '__esModule', {value: true}).default = (node, original, isSVG) => {
  if (isSVG) {
    const style = original.cloneNode(true);
    style.value = '';
    node.setAttributeNode(style);
    return update(style, isSVG);
  }
  return update(node.style, isSVG);
};

// the update takes care or changing/replacing
// only properties that are different or
// in case of string, the whole node
const update = (style, isSVG) => {
  let oldType, oldValue;
  return newValue => {
    switch (typeof newValue) {
      case 'object':
        if (newValue) {
          if (oldType === 'object') {
            if (!isSVG) {
              if (oldValue !== newValue) {
                for (const key in oldValue) {
                  if (!(key in newValue)) {
                    style[key] = '';
                  }
                }
              }
            }
          } else {
            if (isSVG) style.value = '';
            else style.cssText = '';
          }
          const info = isSVG ? {} : style;
          for (const key in newValue) {
            const value = newValue[key];
            info[key] = typeof value === 'number' &&
                        !IS_NON_DIMENSIONAL.test(key) ?
                          (value + 'px') : value;
          }
          oldType = 'object';
          if (isSVG) style.value = toStyle((oldValue = info));
          else oldValue = newValue;
          break;
        }
      default:
        if (oldValue != newValue) {
          oldType = 'string';
          oldValue = newValue;
          if (isSVG) style.value = newValue || '';
          else style.cssText = newValue || '';
        }
        break;
    }
  };
};

const hyphen = /([^A-Z])([A-Z]+)/g;
const ized = ($0, $1, $2) => $1 + '-' + $2.toLowerCase();
const toStyle = object => {
  const css = [];
  for (const key in object) {
    css.push(key.replace(hyphen, ized), ':', object[key], ';');
  }
  return css.join('');
};
},{}],14:[function(require,module,exports){
'use strict';
const {
  CONNECTED, DISCONNECTED, COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, ELEMENT_NODE, TEXT_NODE, OWNER_SVG_ELEMENT, SHOULD_USE_TEXT_CONTENT, UID, UIDC
} = require('../shared/constants.js');

const Component = (m => m.__esModule ? m.default : m)(require('../classes/Component.js'));
const Wire = (m => m.__esModule ? m.default : m)(require('../classes/Wire.js'));
const Path = (m => m.__esModule ? m.default : m)(require('./Path.js'));
const Style = (m => m.__esModule ? m.default : m)(require('./Style.js'));
const Intent = (m => m.__esModule ? m.default : m)(require('./Intent.js'));
const domdiff = (m => m.__esModule ? m.default : m)(require('../shared/domdiff.js'));
const { create: createElement, text } = require('../shared/easy-dom.js');
const { Event, WeakSet, isArray, trim } = require('../shared/poorlyfills.js');
const { createFragment, slice } = require('../shared/utils.js');

// hyper.Component have a connected/disconnected
// mechanism provided by MutationObserver
// This weak set is used to recognize components
// as DOM node that needs to trigger connected/disconnected events
const components = new WeakSet;

// a basic dictionary used to filter already cached attributes
// while looking for special hyperHTML values.
function Cache() {}
Cache.prototype = Object.create(null);

// returns an intent to explicitly inject content as html
const asHTML = html => ({html});

// returns nodes from wires and components
const asNode = (item, i) => {
  return 'ELEMENT_NODE' in item ?
    item :
    (item.constructor === Wire ?
      // in the Wire case, the content can be
      // removed, post-pended, inserted, or pre-pended and
      // all these cases are handled by domdiff already
      /* istanbul ignore next */
      ((1 / i) < 0 ?
        (i ? item.remove() : item.last) :
        (i ? item.insert() : item.first)) :
      asNode(item.render(), i));
}

// returns true if domdiff can handle the value
const canDiff = value =>  'ELEMENT_NODE' in value ||
value instanceof Wire ||
value instanceof Component;

// updates are created once per context upgrade
// within the main render function (../hyper/render.js)
// These are an Array of callbacks to invoke passing
// each interpolation value.
// Updates can be related to any kind of content,
// attributes, or special text-only cases such <style>
// elements or <textarea>
const create = (root, paths) => {
  const updates = [];
  const length = paths.length;
  for (let i = 0; i < length; i++) {
    const info = paths[i];
    const node = Path.find(root, info.path);
    switch (info.type) {
      case 'any':
        updates.push(setAnyContent(node, []));
        break;
      case 'attr':
        updates.push(setAttribute(node, info.name, info.node));
        break;
      case 'text':
        updates.push(setTextContent(node));
        break;
    }
  }
  return updates;
};

// finding all paths is a one-off operation performed
// when a new template literal is used.
// The goal is to map all target nodes that will be
// used to update content/attributes every time
// the same template literal is used to create content.
// The result is a list of paths related to the template
// with all the necessary info to create updates as
// list of callbacks that target directly affected nodes.
const find = (node, paths, parts) => {
  const childNodes = node.childNodes;
  const length = childNodes.length;
  for (let i = 0; i < length; i++) {
    let child = childNodes[i];
    switch (child.nodeType) {
      case ELEMENT_NODE:
        findAttributes(child, paths, parts);
        find(child, paths, parts);
        break;
      case COMMENT_NODE:
        if (child.textContent === UID) {
          parts.shift();
          paths.push(
            // basicHTML or other non standard engines
            // might end up having comments in nodes
            // where they shouldn't, hence this check.
            SHOULD_USE_TEXT_CONTENT.test(node.nodeName) ?
              Path.create('text', node) :
              Path.create('any', child)
          );
        }
        break;
      case TEXT_NODE:
        // the following ignore is actually covered by browsers
        // only basicHTML ends up on previous COMMENT_NODE case
        // instead of TEXT_NODE because it knows nothing about
        // special style or textarea behavior
        /* istanbul ignore if */
        if (
          SHOULD_USE_TEXT_CONTENT.test(node.nodeName) &&
          trim.call(child.textContent) === UIDC
        ) {
          parts.shift();
          paths.push(Path.create('text', node));
        }
        break;
    }
  }
};

// attributes are searched via unique hyperHTML id value.
// Despite HTML being case insensitive, hyperHTML is able
// to recognize attributes by name in a caseSensitive way.
// This plays well with Custom Elements definitions
// and also with XML-like environments, without trusting
// the resulting DOM but the template literal as the source of truth.
// IE/Edge has a funny bug with attributes and these might be duplicated.
// This is why there is a cache in charge of being sure no duplicated
// attributes are ever considered in future updates.
const findAttributes = (node, paths, parts) => {
  const cache = new Cache;
  const attributes = node.attributes;
  const array = slice.call(attributes);
  const remove = [];
  const length = array.length;
  for (let i = 0; i < length; i++) {
    const attribute = array[i];
    if (attribute.value === UID) {
      const name = attribute.name;
      // the following ignore is covered by IE
      // and the IE9 double viewBox test
      /* istanbul ignore else */
      if (!(name in cache)) {
        const realName = parts.shift().replace(/^(?:|[\S\s]*?\s)(\S+?)=['"]?$/, '$1');
        cache[name] = attributes[realName] ||
                      // the following ignore is covered by browsers
                      // while basicHTML is already case-sensitive
                      /* istanbul ignore next */
                      attributes[realName.toLowerCase()];
        paths.push(Path.create('attr', cache[name], realName));
      }
      remove.push(attribute);
    }
  }
  const len = remove.length;
  for (let i = 0; i < len; i++) {
    node.removeAttributeNode(remove[i]);
  }

  // This is a very specific Firefox/Safari issue
  // but since it should be a not so common pattern,
  // it's probably worth patching regardless.
  // Basically, scripts created through strings are death.
  // You need to create fresh new scripts instead.
  // TODO: is there any other node that needs such nonsense ?
  const nodeName = node.nodeName;
  if (/^script$/i.test(nodeName)) {
    const script = createElement(node, nodeName);
    for (let i = 0; i < attributes.length; i++) {
      script.setAttributeNode(attributes[i].cloneNode(true));
    }
    script.textContent = node.textContent;
    node.parentNode.replaceChild(script, node);
  }
};

// when a Promise is used as interpolation value
// its result must be parsed once resolved.
// This callback is in charge of understanding what to do
// with a returned value once the promise is resolved.
const invokeAtDistance = (value, callback) => {
  callback(value.placeholder);
  if ('text' in value) {
    Promise.resolve(value.text).then(String).then(callback);
  } else if ('any' in value) {
    Promise.resolve(value.any).then(callback);
  } else if ('html' in value) {
    Promise.resolve(value.html).then(asHTML).then(callback);
  } else {
    Promise.resolve(Intent.invoke(value, callback)).then(callback);
  }
};

// quick and dirty way to check for Promise/ish values
const isPromise_ish = value => value != null && 'then' in value;

// in a hyper(node)`<div>${content}</div>` case
// everything could happen:
//  * it's a JS primitive, stored as text
//  * it's null or undefined, the node should be cleaned
//  * it's a component, update the content by rendering it
//  * it's a promise, update the content once resolved
//  * it's an explicit intent, perform the desired operation
//  * it's an Array, resolve all values if Promises and/or
//    update the node with the resulting list of content
const setAnyContent = (node, childNodes) => {
  let fastPath = false;
  let oldValue;
  const anyContent = value => {
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
        if (fastPath) {
          if (oldValue !== value) {
            oldValue = value;
            childNodes[0].textContent = value;
          }
        } else {
          fastPath = true;
          oldValue = value;
          childNodes = domdiff(
            node.parentNode,
            childNodes,
            [text(node, value)],
            asNode,
            node
          );
        }
        break;
      case 'object':
      case 'undefined':
        if (value == null) {
          fastPath = false;
          childNodes = domdiff(
            node.parentNode,
            childNodes,
            [],
            asNode,
            node
          );
          break;
        }
      default:
        fastPath = false;
        oldValue = value;
        if (isArray(value)) {
          if (value.length === 0) {
            if (childNodes.length) {
              childNodes = domdiff(
                node.parentNode,
                childNodes,
                [],
                asNode,
                node
              );
            }
          } else {
            switch (typeof value[0]) {
              case 'string':
              case 'number':
              case 'boolean':
                anyContent({html: value});
                break;
              case 'object':
                if (isArray(value[0])) {
                  value = value.concat.apply([], value);
                }
                if (isPromise_ish(value[0])) {
                  Promise.all(value).then(anyContent);
                  break;
                }
              default:
                childNodes = domdiff(
                  node.parentNode,
                  childNodes,
                  value,
                  asNode,
                  node
                );
                break;
            }
          }
        } else if (canDiff(value)) {
          childNodes = domdiff(
            node.parentNode,
            childNodes,
            value.nodeType === DOCUMENT_FRAGMENT_NODE ?
              slice.call(value.childNodes) :
              [value],
            asNode,
            node
          );
        } else if (isPromise_ish(value)) {
          value.then(anyContent);
        } else if ('placeholder' in value) {
          invokeAtDistance(value, anyContent);
        } else if ('text' in value) {
          anyContent(String(value.text));
        } else if ('any' in value) {
          anyContent(value.any);
        } else if ('html' in value) {
          childNodes = domdiff(
            node.parentNode,
            childNodes,
            slice.call(
              createFragment(
                node,
                [].concat(value.html).join('')
              ).childNodes
            ),
            asNode,
            node
          );
        } else if ('length' in value) {
          anyContent(slice.call(value));
        } else {
          anyContent(Intent.invoke(value, anyContent));
        }
        break;
    }
  };
  return anyContent;
};

// there are four kind of attributes, and related behavior:
//  * events, with a name starting with `on`, to add/remove event listeners
//  * special, with a name present in their inherited prototype, accessed directly
//  * regular, accessed through get/setAttribute standard DOM methods
//  * style, the only regular attribute that also accepts an object as value
//    so that you can style=${{width: 120}}. In this case, the behavior has been
//    fully inspired by Preact library and its simplicity.
const setAttribute = (node, name, original) => {
  const isSVG = OWNER_SVG_ELEMENT in node;
  let oldValue;
  // if the attribute is the style one
  // handle it differently from others
  if (name === 'style') {
    return Style(node, original, isSVG);
  }
  // the name is an event one,
  // add/remove event listeners accordingly
  else if (/^on/.test(name)) {
    let type = name.slice(2);
    if (type === CONNECTED || type === DISCONNECTED) {
      if (notObserving) {
        notObserving = false;
        observe();
      }
      components.add(node);
    }
    else if (name.toLowerCase() in node) {
      type = type.toLowerCase();
    }
    return newValue => {
      if (oldValue !== newValue) {
        if (oldValue) node.removeEventListener(type, oldValue, false);
        oldValue = newValue;
        if (newValue) node.addEventListener(type, newValue, false);
      }
    };
  }
  // the attribute is special ('value' in input)
  // and it's not SVG *or* the name is exactly data,
  // in this case assign the value directly
  else if (name === 'data' || (!isSVG && name in node)) {
    return newValue => {
      if (oldValue !== newValue) {
        oldValue = newValue;
        if (node[name] !== newValue) {
          node[name] = newValue;
          if (newValue == null) {
            node.removeAttribute(name);
          }
        }
      }
    };
  }
  // in every other case, use the attribute node as it is
  // update only the value, set it as node only when/if needed
  else {
    let owner = false;
    const attribute = original.cloneNode(true);
    return newValue => {
      if (oldValue !== newValue) {
        oldValue = newValue;
        if (attribute.value !== newValue) {
          if (newValue == null) {
            if (owner) {
              owner = false;
              node.removeAttributeNode(attribute);
            }
            attribute.value = newValue;
          } else {
            attribute.value = newValue;
            if (!owner) {
              owner = true;
              node.setAttributeNode(attribute);
            }
          }
        }
      }
    };
  }
};

// style or textareas don't accept HTML as content
// it's pointless to transform or analyze anything
// different from text there but it's worth checking
// for possible defined intents.
const setTextContent = node => {
  // avoid hyper comments inside textarea/style when value is undefined
  let oldValue = '';
  const textContent = value => {
    if (oldValue !== value) {
      oldValue = value;
      if (typeof value === 'object' && value) {
        if (isPromise_ish(value)) {
          value.then(textContent);
        } else if ('placeholder' in value) {
          invokeAtDistance(value, textContent);
        } else if ('text' in value) {
          textContent(String(value.text));
        } else if ('any' in value) {
          textContent(value.any);
        } else if ('html' in value) {
          textContent([].concat(value.html).join(''));
        } else if ('length' in value) {
          textContent(slice.call(value).join(''));
        } else {
          textContent(Intent.invoke(value, textContent));
        }
      } else {
        node.textContent = value == null ? '' : value;
      }
    }
  };
  return textContent;
};

Object.defineProperty(exports, '__esModule', {value: true}).default = {create, find};

// hyper.Components might need connected/disconnected notifications
// used by components and their onconnect/ondisconnect callbacks.
// When one of these callbacks is encountered,
// the document starts being observed.
let notObserving = true;
function observe() {

  // when hyper.Component related DOM nodes
  // are appended or removed from the live tree
  // these might listen to connected/disconnected events
  // This utility is in charge of finding all components
  // involved in the DOM update/change and dispatch
  // related information to them
  const dispatchAll = (nodes, type) => {
    const event = new Event(type);
    const length = nodes.length;
    for (let i = 0; i < length; i++) {
      let node = nodes[i];
      if (node.nodeType === ELEMENT_NODE) {
        dispatchTarget(node, event);
      }
    }
  };

  // the way it's done is via the components weak set
  // and recursively looking for nested components too
  const dispatchTarget = (node, event) => {
    if (components.has(node)) {
      node.dispatchEvent(event);
    }

    const children = node.children;
    const length = children.length;
    for (let i = 0; i < length; i++) {
      dispatchTarget(children[i], event);
    }
  }

  // The MutationObserver is the best way to implement that
  // but there is a fallback to deprecated DOMNodeInserted/Removed
  // so that even older browsers/engines can help components life-cycle
  try {
    (new MutationObserver(records => {
      const length = records.length;
      for (let i = 0; i < length; i++) {
        let record = records[i];
        dispatchAll(record.removedNodes, DISCONNECTED);
        dispatchAll(record.addedNodes, CONNECTED);
      }
    })).observe(document, {subtree: true, childList: true});
  } catch(o_O) {
    document.addEventListener('DOMNodeRemoved', event => {
      dispatchAll([event.target], DISCONNECTED);
    }, false);
    document.addEventListener('DOMNodeInserted', event => {
      dispatchAll([event.target], CONNECTED);
    }, false);
  }
}

},{"../classes/Component.js":6,"../classes/Wire.js":7,"../shared/constants.js":15,"../shared/domdiff.js":16,"../shared/easy-dom.js":17,"../shared/poorlyfills.js":19,"../shared/utils.js":21,"./Intent.js":11,"./Path.js":12,"./Style.js":13}],15:[function(require,module,exports){
'use strict';
const G = document.defaultView;
exports.G = G;

// Node.CONSTANTS
// 'cause some engine has no global Node defined
// (i.e. Node, NativeScript, basicHTML ... )
const ELEMENT_NODE = 1;
exports.ELEMENT_NODE = ELEMENT_NODE;
const ATTRIBUTE_NODE = 2;
exports.ATTRIBUTE_NODE = ATTRIBUTE_NODE;
const TEXT_NODE = 3;
exports.TEXT_NODE = TEXT_NODE;
const COMMENT_NODE = 8;
exports.COMMENT_NODE = COMMENT_NODE;
const DOCUMENT_FRAGMENT_NODE = 11;
exports.DOCUMENT_FRAGMENT_NODE = DOCUMENT_FRAGMENT_NODE;

// HTML related constants
const VOID_ELEMENTS = /^area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr$/i;
exports.VOID_ELEMENTS = VOID_ELEMENTS;

// SVG related constants
const OWNER_SVG_ELEMENT = 'ownerSVGElement';
exports.OWNER_SVG_ELEMENT = OWNER_SVG_ELEMENT;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
exports.SVG_NAMESPACE = SVG_NAMESPACE;

// Custom Elements / MutationObserver constants
const CONNECTED = 'connected';
exports.CONNECTED = CONNECTED;
const DISCONNECTED = 'dis' + CONNECTED;
exports.DISCONNECTED = DISCONNECTED;

// hyperHTML related constants
const EXPANDO = '_hyper: ';
exports.EXPANDO = EXPANDO;
const SHOULD_USE_TEXT_CONTENT = /^style|textarea$/i;
exports.SHOULD_USE_TEXT_CONTENT = SHOULD_USE_TEXT_CONTENT;
const UID = EXPANDO + ((Math.random() * new Date) | 0) + ';';
exports.UID = UID;
const UIDC = '<!--' + UID + '-->';
exports.UIDC = UIDC;

},{}],16:[function(require,module,exports){
'use strict';
/* AUTOMATICALLY IMPORTED, DO NOT MODIFY */
/*! (c) 2017 Andrea Giammarchi (ISC) */

/**
 * This code is a revisited port of the snabbdom vDOM diffing logic,
 * the same that fuels as fork Vue.js or other libraries.
 * @credits https://github.com/snabbdom/snabbdom
 */

const identity = O => O;

const domdiff = (
  parentNode,     // where changes happen
  currentNodes,   // Array of current items/nodes
  futureNodes,    // Array of future items/nodes
  getNode,        // optional way to retrieve a node from an item
  beforeNode      // optional item/node to use as insertBefore delimiter
) => {
  const get = getNode || identity;
  const before = beforeNode == null ? null : get(beforeNode, 0);
  let currentStart = 0, futureStart = 0;
  let currentEnd = currentNodes.length - 1;
  let currentStartNode = currentNodes[0];
  let currentEndNode = currentNodes[currentEnd];
  let futureEnd = futureNodes.length - 1;
  let futureStartNode = futureNodes[0];
  let futureEndNode = futureNodes[futureEnd];
  while (currentStart <= currentEnd && futureStart <= futureEnd) {
    if (currentStartNode == null) {
      currentStartNode = currentNodes[++currentStart];
    }
    else if (currentEndNode == null) {
      currentEndNode = currentNodes[--currentEnd];
    }
    else if (futureStartNode == null) {
      futureStartNode = futureNodes[++futureStart];
    }
    else if (futureEndNode == null) {
      futureEndNode = futureNodes[--futureEnd];
    }
    else if (currentStartNode == futureStartNode) {
      currentStartNode = currentNodes[++currentStart];
      futureStartNode = futureNodes[++futureStart];
    }
    else if (currentEndNode == futureEndNode) {
      currentEndNode = currentNodes[--currentEnd];
      futureEndNode = futureNodes[--futureEnd];
    }
    else if (currentStartNode == futureEndNode) {
      parentNode.insertBefore(
        get(currentStartNode, 1),
        get(currentEndNode, -0).nextSibling
      );
      currentStartNode = currentNodes[++currentStart];
      futureEndNode = futureNodes[--futureEnd];
    }
    else if (currentEndNode == futureStartNode) {
      parentNode.insertBefore(
        get(currentEndNode, 1),
        get(currentStartNode, 0)
      );
      currentEndNode = currentNodes[--currentEnd];
      futureStartNode = futureNodes[++futureStart];
    }
    else {
      let index = currentNodes.indexOf(futureStartNode);
      if (index < 0) {
        parentNode.insertBefore(
          get(futureStartNode, 1),
          get(currentStartNode, 0)
        );
        futureStartNode = futureNodes[++futureStart];
      }
      else {
        let el = currentNodes[index];
        currentNodes[index] = null;
        parentNode.insertBefore(
          get(el, 1),
          get(currentStartNode, 0)
        );
        futureStartNode = futureNodes[++futureStart];
      }
    }
  }
  if (currentStart <= currentEnd || futureStart <= futureEnd) {
    if (currentStart > currentEnd) {
      const pin = futureNodes[futureEnd + 1];
      const place = pin == null ? before : get(pin, 0);
      if (futureStart === futureEnd) {
        parentNode.insertBefore(get(futureNodes[futureStart], 1), place);
      }
      else {
        const fragment = parentNode.ownerDocument.createDocumentFragment();
        while (futureStart <= futureEnd) {
          fragment.appendChild(get(futureNodes[futureStart++], 1));
        }
        parentNode.insertBefore(fragment, place);
      }
    }
    else {
      if (currentNodes[currentStart] == null) currentStart++;
      if (currentStart === currentEnd) {
        parentNode.removeChild(get(currentNodes[currentStart], -1));
      }
      else {
        const range = parentNode.ownerDocument.createRange();
        range.setStartBefore(get(currentNodes[currentStart], -1));
        range.setEndAfter(get(currentNodes[currentEnd], -1));
        range.deleteContents();
      }
    }
  }
  return futureNodes;
};

Object.defineProperty(exports, '__esModule', {value: true}).default = domdiff;

},{}],17:[function(require,module,exports){
'use strict';
// these are tiny helpers to simplify most common operations needed here
const create = (node, type) => doc(node).createElement(type);
exports.create = create;
const doc = node => node.ownerDocument || node;
exports.doc = doc;
const fragment = node => doc(node).createDocumentFragment();
exports.fragment = fragment;
const text = (node, text) => doc(node).createTextNode(text);
exports.text = text;

},{}],18:[function(require,module,exports){
'use strict';
const {create, fragment, text} = require('./easy-dom.js');

const testFragment = fragment(document);

// DOM4 node.append(...many)
const hasAppend = 'append' in testFragment;
exports.hasAppend = hasAppend;

// detect old browsers without HTMLTemplateElement content support
const hasContent = 'content' in create(document, 'template');
exports.hasContent = hasContent;

// IE 11 has problems with cloning templates: it "forgets" empty childNodes
testFragment.appendChild(text(testFragment, 'g'));
testFragment.appendChild(text(testFragment, ''));
const hasDoomedCloneNode = testFragment.cloneNode(true).childNodes.length === 1;
exports.hasDoomedCloneNode = hasDoomedCloneNode;

// old browsers need to fallback to cloneNode
// Custom Elements V0 and V1 will work polyfilled
// but native implementations need importNode instead
// (specially Chromium and its old V0 implementation)
const hasImportNode = 'importNode' in document;
exports.hasImportNode = hasImportNode;

},{"./easy-dom.js":17}],19:[function(require,module,exports){
'use strict';
const {G, UID} = require('./constants.js');

// you know that kind of basics you need to cover
// your use case only but you don't want to bloat the library?
// There's even a package in here:
// https://www.npmjs.com/package/poorlyfills

// used to dispatch simple events
let Event = G.Event;
try {
  new Event('Event');
} catch(o_O) {
  Event = function (type) {
    const e = document.createEvent('Event');
    e.initEvent(type, false, false);
    return e;
  };
}
exports.Event = Event;

// used to store template literals
const Map = G.Map || function Map() {
  const keys = [], values = [];
  return {
    get(obj) {
      return values[keys.indexOf(obj)];
    },
    set(obj, value) {
      values[keys.push(obj) - 1] = value;
    }
  };
};
exports.Map = Map;

// used to store wired content
const WeakMap = G.WeakMap || function WeakMap() {
  return {
    get(obj) { return obj[UID]; },
    set(obj, value) {
      Object.defineProperty(obj, UID, {
        configurable: true,
        value
      });
    }
  };
};
exports.WeakMap = WeakMap;

// used to store hyper.Components
const WeakSet = G.WeakSet || function WeakSet() {
  const wm = new WeakMap;
  return {
    add(obj) { wm.set(obj, true); },
    has(obj) { return wm.get(obj) === true; }
  };
};
exports.WeakSet = WeakSet;

// used to be sure IE9 or older Androids work as expected
const isArray = Array.isArray || (toString =>
  arr => toString.call(arr) === '[object Array]'
)({}.toString);
exports.isArray = isArray;

const trim = UID.trim || function () {
  return this.replace(/^\s+|\s+$/g, '');
};
exports.trim = trim;

},{"./constants.js":15}],20:[function(require,module,exports){
'use strict';
// TODO:  I'd love to code-cover RegExp too here
//        these are fundamental for this library

const spaces = ' \\f\\n\\r\\t';
const almostEverything = '[^ ' + spaces + '\\/>"\'=]+';
const attrName = '[ ' + spaces + ']+' + almostEverything;
const tagName = '<([A-Za-z]+[A-Za-z0-9:_-]*)((?:';
const attrPartials = '(?:=(?:\'[^\']*?\'|"[^"]*?"|<[^>]*?>|' + almostEverything + '))?)';

const attrSeeker = new RegExp(
  tagName + attrName + attrPartials + '+)([ ' + spaces + ']*/?>)',
  'g'
);

const selfClosing = new RegExp(
  tagName + attrName + attrPartials + '*)([ ' + spaces + ']*/>)',
  'g'
);

exports.attrName = attrName;
exports.attrSeeker = attrSeeker;
exports.selfClosing = selfClosing;

},{}],21:[function(require,module,exports){
'use strict';
const {attrName, attrSeeker} = require('./re.js');

const {
  G,
  OWNER_SVG_ELEMENT,
  SVG_NAMESPACE,
  UID,
  UIDC
} = require('./constants.js');

const {
  hasAppend,
  hasContent,
  hasDoomedCloneNode,
  hasImportNode
} = require('./features-detection.js');

const {create, doc, fragment} = require('./easy-dom.js');

// appends an array of nodes
// to a generic node/fragment
// When available, uses append passing all arguments at once
// hoping that's somehow faster, even if append has more checks on type
const append = hasAppend ?
  (node, childNodes) => {
    node.append.apply(node, childNodes);
  } :
  (node, childNodes) => {
    const length = childNodes.length;
    for (let i = 0; i < length; i++) {
      node.appendChild(childNodes[i]);
    }
  };
exports.append = append;

const findAttributes = new RegExp('(' + attrName + '=)([\'"]?)' + UIDC + '\\2', 'gi');
const comments = ($0, $1, $2, $3) =>
  '<' + $1 + $2.replace(findAttributes, replaceAttributes) + $3;
const replaceAttributes = ($0, $1, $2) => $1 + ($2 || '"') + UID + ($2 || '"');

// given a node and a generic HTML content,
// create either an SVG or an HTML fragment
// where such content will be injected
const createFragment = (node, html) =>
  (OWNER_SVG_ELEMENT in node ?
    SVGFragment :
    HTMLFragment
  )(node, html.replace(attrSeeker, comments));
exports.createFragment = createFragment;

// IE/Edge shenanigans proof cloneNode
// it goes through all nodes manually
// instead of relying the engine to suddenly
// merge nodes together
const cloneNode = hasDoomedCloneNode ?
  node => {
    const clone = node.cloneNode();
    const childNodes = node.childNodes ||
                      // this is an excess of caution
                      // but some node, in IE, might not
                      // have childNodes property.
                      // The following fallback ensure working code
                      // in older IE without compromising performance
                      // or any other browser/engine involved.
                      /* istanbul ignore next */
                      [];
    const length = childNodes.length;
    for (let i = 0; i < length; i++) {
      clone.appendChild(cloneNode(childNodes[i]));
    }
    return clone;
  } :
  // the following ignore is due code-coverage
  // combination of not having document.importNode
  // but having a working node.cloneNode.
  // This shenario is common on older Android/WebKit browsers
  // but basicHTML here tests just two major cases:
  // with document.importNode or with broken cloneNode.
  /* istanbul ignore next */
  node => node.cloneNode(true);

// used to import html into fragments
const importNode = hasImportNode ?
  (doc, node) => doc.importNode(node, true) :
  (doc, node) => cloneNode(node)
exports.importNode = importNode

// just recycling a one-off array to use slice
// in every needed place
const slice = [].slice;
exports.slice = slice;

// lazy evaluated, returns the unique identity
// of a template literal, as tempalte literal itself.
// By default, ES2015 template literals are unique
// tag`a${1}z` === tag`a${2}z`
// even if interpolated values are different
// the template chunks are in a frozen Array
// that is identical each time you use the same
// literal to represent same static content
// around its own interpolations.
const unique = template => TL(template);
exports.unique = unique;

// TL returns a unique version of the template
// it needs lazy feature detection
// (cannot trust literals with transpiled code)
let TL = template => {
  if (
    // TypeScript template literals are not standard
    template.propertyIsEnumerable('raw') ||
    (
      // Firefox < 55 has not standard implementation neither
      /Firefox\/(\d+)/.test((G.navigator || {}).userAgent) &&
      parseFloat(RegExp.$1) < 55
    )
  ) {
    // in these cases, address templates once
    const templateObjects = {};
    // but always return the same template
    TL = template => {
      const key = '_' + template.join(UID);
      return templateObjects[key] || (
        templateObjects[key] = template
      );
    };
  }
  else {
    // make TL an identity like function
    TL = template => template;
  }
  return TL(template);
};

// create document fragments via native template
// with a fallback for browsers that won't be able
// to deal with some injected element such <td> or others
const HTMLFragment = hasContent ?
  (node, html) => {
    const container = create(node, 'template');
    container.innerHTML = html;
    return container.content;
  } :
  (node, html) => {
    const container = create(node, 'template');
    const content = fragment(node);
    if (/^[^\S]*?<(col(?:group)?|t(?:head|body|foot|r|d|h))/i.test(html)) {
      const selector = RegExp.$1;
      container.innerHTML = '<table>' + html + '</table>';
      append(content, slice.call(container.querySelectorAll(selector)));
    } else {
      container.innerHTML = html;
      append(content, slice.call(container.childNodes));
    }
    return content;
  };

// creates SVG fragment with a fallback for IE that needs SVG
// within the HTML content
const SVGFragment = hasContent ?
  (node, html) => {
    const content = fragment(node);
    const container = doc(node).createElementNS(SVG_NAMESPACE, 'svg');
    container.innerHTML = html;
    append(content, slice.call(container.childNodes));
    return content;
  } :
  (node, html) => {
    const content = fragment(node);
    const container = create(node, 'div');
    container.innerHTML = '<svg xmlns="' + SVG_NAMESPACE + '">' + html + '</svg>';
    append(content, slice.call(container.firstChild.childNodes));
    return content;
  };

},{"./constants.js":15,"./easy-dom.js":17,"./features-detection.js":18,"./re.js":20}],22:[function(require,module,exports){
/* globals require */

"use strict";

require("../js/io-highlighter");

document.addEventListener(
  "DOMContentLoaded",
  () =>
  {
    const ioHighlighter = document.querySelector("io-highlighter");
    ioHighlighter.edit("data:image/png;base64,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");
    ioHighlighter.changeDepth.then(() =>
    {
      document.querySelector("#snapshot").disabled = false;
    });
  }
);

},{"../js/io-highlighter":3}]},{},[22]);
