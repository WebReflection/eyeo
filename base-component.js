class BaseComponment {
  constructor(details) {
    this.id = [
      this.constructor.name.toLowerCase(),
      String(Math.random()).replace(/\D/, '')
    ].join('-');
    this.target = typeof details.target === 'string' ?
                  document.querySelector(details.target) : details.target;
  }
}