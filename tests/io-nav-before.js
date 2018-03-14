customElements.define('io-nav-before', class extends HTMLElement {
  connectedCallback() {
    this.tabs = this.querySelectorAll('io-tab');
    console.log(this.tabs);
    console.log(this.outerHTML);
  }
});