/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-present eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

function mobileScroll(view, state, update) {

  const mobile = {
    timer: 0,
    clear() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = 0;
      }
    },
    handleEvent(event) {
      this[`on${event.type}`](event);
    },
    ontouchstart(event) {
      this.clear();
      this.clientY = event.touches[0].clientY;
      this.previousY = this.clientY;
      this.initialY = state.scroll.top + this.clientY;
    },
    ontouchmove(event) {
      this.previousY = this.clientY;
      this.clientY = event.touches[0].clientY;
      state.scroll.top = this.initialY - this.clientY;
      update();
    },
    ontouchend() {
      this.clear();
      const diff = this.previousY < this.clientY ?
        (this.clientY - this.previousY) :
        (this.previousY - this.clientY);
      const direction = this.previousY < this.clientY ? -1 : 1;
      const goal = 32 * direction * diff + state.scroll.top;
      this.timer = setInterval(() => {
        const next = (goal - state.scroll.top) * 0.05;
        const scroll = state.scroll;
        scroll.top += next;
        if (scroll.top <= 0 || scroll.top >= scroll.height || Math.abs(next) < .5) {
          const top = Math.min(scroll.height, scroll.top);
          scroll.top = Math.max(0, top);
          this.clear();
        }
        update();
      }, 1000/60);
    },
    ontouchcancel() {
      this.clear();
    }
  };

  view.addEventListener('touchstart', mobile, {passive: false});
  view.addEventListener('touchmove', mobile, {passive: false});
  view.addEventListener('touchend', mobile, {passive: false});
  view.addEventListener('touchcancel', mobile, {passive: false});

}
