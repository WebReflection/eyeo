// provides a unique-id suffix
let counter = 0;

// ensure each component has an ID as soon as it's upgraded
const setID = self => {
  const id = `${self.nodeName.toLowerCase()}-${counter++}`;
  self.setAttribute('id', id);
  return id;
};

class IOElement extends HyperHTMLElement {

  get id() {
    return this.getAttribute('id') || setID(this);
  }

  created() { this.render(); }

  render() {
    return this.html`<div>hello ${{i18n:'test <b>ok</b>'}}</div>`;
  }
}

IOElement.intent('i18n', id => {
  return [id];
});

IOElement.define('io-element');

document.body.innerHTML = '<io-element></io-element>';