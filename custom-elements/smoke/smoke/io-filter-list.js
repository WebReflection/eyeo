"use strict";

require("../js/io-filter-list");

fetch("https://easylist.to/easylist/easylist.txt")
      .then(b => b.text())
      .then(text =>
      {
        const filters = text.replace(/^[![].*/gm, "").split("\n")
                            .filter(line => line.trim().length)
                            .map(line => ({
                              enabled: true,
                              text: line,
                              hits: (Math.random() * 9) >>> 0,
                              slow: Math.random() < .2 ? "🐌" : ""
                            }));

        document.querySelector("io-filter-list").filters =
          filters.slice(0, 20);
      });
