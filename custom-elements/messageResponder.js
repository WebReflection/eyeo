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

/* globals require */

"use strict";

(function(global)
{
  const {port} = require("messaging");
  const {Prefs} = require("prefs");
  const {Utils} = require("utils");
  const {FilterStorage} = require("filterStorage");
  const {FilterNotifier} = require("filterNotifier");
  const {defaultMatcher} = require("matcher");
  const {Notification: NotificationStorage} = require("notification");
  const {getActiveNotification, shouldDisplay} = require("notificationHelper");

  const {
    Filter, ActiveFilter, BlockingFilter, RegExpFilter
  } = require("filterClasses");
  const {Synchronizer} = require("synchronizer");

  const info = require("info");
  const {
    Subscription,
    DownloadableSubscription,
    SpecialSubscription
  } = require("subscriptionClasses");

  const {showOptions} = require("options");

  port.on("types.get", (message, sender) =>
  {
    let filterTypes = Array.from(require("requestBlocker").filterTypes);
    filterTypes.push(...filterTypes.splice(filterTypes.indexOf("OTHER"), 1));
    return filterTypes;
  });

  function convertObject(keys, obj)
  {
    let result = {};
    for (let key of keys)
    {
      if (key in obj)
        result[key] = obj[key];
    }
    return result;
  }

  function convertSubscription(subscription)
  {
    let obj = convertObject(["disabled", "downloadStatus", "homepage",
                             "version", "lastDownload", "lastSuccess",
                             "softExpiration", "expires", "title",
                             "url"], subscription);
    if (subscription instanceof SpecialSubscription)
      obj.filters = subscription.filters.map(convertFilter);
    obj.isDownloading = Synchronizer.isExecuting(subscription.url);
    return obj;
  }

  let convertFilter = convertObject.bind(null, ["text"]);

  let uiPorts = new Map();
  let listenedPreferences = Object.create(null);
  let listenedFilterChanges = Object.create(null);
  let messageTypes = new Map([
    ["app", "app.respond"],
    ["filter", "filters.respond"],
    ["pref", "prefs.respond"],
    ["subscription", "subscriptions.respond"]
  ]);

  function sendMessage(type, action, ...args)
  {
    if (uiPorts.size == 0)
      return;

    let convertedArgs = [];
    for (let arg of args)
    {
      if (arg instanceof Subscription)
        convertedArgs.push(convertSubscription(arg));
      else if (arg instanceof Filter)
        convertedArgs.push(convertFilter(arg));
      else
        convertedArgs.push(arg);
    }

    for (let [uiPort, filters] of uiPorts)
    {
      let actions = filters.get(type);
      if (actions && actions.indexOf(action) != -1)
      {
        uiPort.postMessage({
          type: messageTypes.get(type),
          action,
          args: convertedArgs
        });
      }
    }
  }

  function addFilterListeners(type, actions)
  {
    for (let action of actions)
    {
      let name;
      if (type == "filter" && action == "loaded")
        name = "load";
      else
        name = type + "." + action;

      if (!(name in listenedFilterChanges))
      {
        listenedFilterChanges[name] = null;
        FilterNotifier.on(name, (item) =>
        {
          sendMessage(type, action, item);
        });
      }
    }
  }

  function addSubscription(subscription, properties)
  {
    subscription.disabled = false;
    if ("title" in properties)
      subscription.title = properties.title;
    if ("homepage" in properties)
      subscription.homepage = properties.homepage;

    FilterStorage.addSubscription(subscription);
    if (subscription instanceof DownloadableSubscription &&
        !subscription.lastDownload)
      Synchronizer.execute(subscription);
  }

  port.on("app.get", (message, sender) =>
  {
    if (message.what == "issues")
    {
      let subscriptionInit = require("subscriptionInit");
      let result = subscriptionInit ? subscriptionInit.reinitialized : false;
      return {filterlistsReinitialized: result};
    }

    if (message.what == "doclink")
    {
      let {application} = info;
      if (info.platform == "chromium" && application != "opera")
        application = "chrome";
      else if (info.platform == "gecko")
        application = "firefox";

      return Utils.getDocLink(message.link.replace("{browser}", application));
    }

    if (message.what == "localeInfo")
    {
      let bidiDir;
      if ("chromeRegistry" in Utils)
      {
        let isRtl = Utils.chromeRegistry.isLocaleRTL("adblockplus");
        bidiDir = isRtl ? "rtl" : "ltr";
      }
      else
        bidiDir = Utils.readingDirection;

      return {locale: Utils.appLocale, bidiDir};
    }

    if (message.what == "features")
    {
      return {
        devToolsPanel: info.platform == "chromium" ||
                       info.application == "firefox" &&
                       parseInt(info.applicationVersion, 10) >= 54
      };
    }

    if (message.what == "senderId")
      return sender.page.id;

    return info[message.what];
  });

  port.on("app.open", (message, sender) =>
  {
    if (message.what == "options")
    {
      showOptions(() =>
      {
        if (!message.action)
          return;

        sendMessage("app", message.action, ...message.args);
      });
    }
  });

  port.on("filters.add", (message, sender) =>
  {
    let result = require("filterValidation").parseFilter(message.text);
    let errors = [];
    if (result.error)
      errors.push(result.error.toString());
    else if (result.filter)
      FilterStorage.addFilter(result.filter);

    return errors;
  });

  port.on("filters.blocked", (message, sender) =>
  {
    let filter = defaultMatcher.matchesAny(message.url,
      RegExpFilter.typeMap[message.requestType], message.docDomain,
      message.thirdParty);

    return filter instanceof BlockingFilter;
  });

  port.on("filters.get", (message, sender) =>
  {
    let subscription = Subscription.fromURL(message.subscriptionUrl);
    if (!subscription)
      return [];

    return subscription.filters.map(convertFilter);
  });

  port.on("filters.importRaw", (message, sender) =>
  {
    let result = require("filterValidation").parseFilters(message.text);
    let errors = [];
    for (let error of result.errors)
    {
      if (error.type != "unexpected-filter-list-header")
        errors.push(error.toString());
    }

    if (errors.length > 0)
      return errors;

    let seenFilter = Object.create(null);
    for (let filter of result.filters)
    {
      FilterStorage.addFilter(filter);
      seenFilter[filter.text] = null;
    }

    if (!message.removeExisting)
      return errors;

    for (let subscription of FilterStorage.subscriptions)
    {
      if (!(subscription instanceof SpecialSubscription))
        continue;

      for (let j = subscription.filters.length - 1; j >= 0; j--)
      {
        let filter = subscription.filters[j];
        if (/^@@\|\|([^/:]+)\^\$document$/.test(filter.text))
          continue;

        if (!(filter.text in seenFilter))
          FilterStorage.removeFilter(filter);
      }
    }

    return errors;
  });

  port.on("filters.remove", (message, sender) =>
  {
    let filter = Filter.fromText(message.text);
    let subscription = null;
    if (message.subscriptionUrl)
      subscription = Subscription.fromURL(message.subscriptionUrl);

    if (!subscription)
      FilterStorage.removeFilter(filter);
    else
      FilterStorage.removeFilter(filter, subscription, message.index);
  });

  port.on("prefs.get", (message, sender) =>
  {
    return Prefs[message.key];
  });

  port.on("prefs.set", (message, sender) =>
  {
    if (message.key == "notifications_ignoredcategories")
      return NotificationStorage.toggleIgnoreCategory("*", !!message.value);

    return Prefs[message.key] = message.value;
  });

  port.on("prefs.toggle", (message, sender) =>
  {
    if (message.key == "notifications_ignoredcategories")
      return NotificationStorage.toggleIgnoreCategory("*");

    return Prefs[message.key] = !Prefs[message.key];
  });

  port.on("notifications.get", (message, sender) =>
  {
    let notification = getActiveNotification();

    if (!notification ||
        "displayMethod" in message &&
        !shouldDisplay(message.displayMethod, notification.type))
      return;

    let texts = NotificationStorage.getLocalizedTexts(notification,
                                                      message.locale);
    return Object.assign({texts}, notification);
  });

  port.on("subscriptions.add", (message, sender) =>
  {
    let subscription = Subscription.fromURL(message.url);
    if (message.confirm)
    {
      if ("title" in message)
        subscription.title = message.title;
      if ("homepage" in message)
        subscription.homepage = message.homepage;

      showOptions(() =>
      {
        sendMessage("app", "addSubscription", subscription);
      });
    }
    else
    {
      addSubscription(subscription, message);
    }
  });

  port.on("subscriptions.get", (message, sender) =>
  {
    let subscriptions = FilterStorage.subscriptions.filter((s) =>
    {
      if (message.ignoreDisabled && s.disabled)
        return false;
      if (s instanceof DownloadableSubscription && message.downloadable)
        return true;
      if (s instanceof SpecialSubscription && message.special)
        return true;
      return false;
    });

    return subscriptions.map((s) =>
    {
      let result = convertSubscription(s);
      if (message.disabledFilters)
      {
        result.disabledFilters = s.filters
                      .filter((f) => f instanceof ActiveFilter && f.disabled)
                      .map((f) => f.text);
      }
      return result;
    });
  });

  port.on("subscriptions.remove", (message, sender) =>
  {
    let subscription = Subscription.fromURL(message.url);
    if (subscription.url in FilterStorage.knownSubscriptions)
      FilterStorage.removeSubscription(subscription);
  });

  port.on("subscriptions.toggle", (message, sender) =>
  {
    let subscription = Subscription.fromURL(message.url);
    if (subscription.url in FilterStorage.knownSubscriptions)
    {
      if (subscription.disabled || message.keepInstalled)
        subscription.disabled = !subscription.disabled;
      else
        FilterStorage.removeSubscription(subscription);
    }
    else
    {
      addSubscription(subscription, message);
    }
  });

  port.on("subscriptions.update", (message, sender) =>
  {
    let {subscriptions} = FilterStorage;
    if (message.url)
      subscriptions = [Subscription.fromURL(message.url)];

    for (let subscription of subscriptions)
    {
      if (subscription instanceof DownloadableSubscription)
        Synchronizer.execute(subscription, true);
    }
  });

  function listen(type, filters, newFilter)
  {
    switch (type)
    {
      case "app":
        filters.set("app", newFilter);
        break;
      case "filters":
        filters.set("filter", newFilter);
        addFilterListeners("filter", newFilter);
        break;
      case "prefs":
        filters.set("pref", newFilter);
        for (let preference of newFilter)
        {
          if (!(preference in listenedPreferences))
          {
            listenedPreferences[preference] = null;
            Prefs.on(preference, () =>
            {
              sendMessage("pref", preference, Prefs[preference]);
            });
          }
        }
        break;
      case "subscriptions":
        filters.set("subscription", newFilter);
        addFilterListeners("subscription", newFilter);
        break;
    }
  }

  function onConnect(uiPort)
  {
    if (uiPort.name != "ui")
      return;

    let filters = new Map();
    uiPorts.set(uiPort, filters);

    uiPort.onDisconnect.addListener(() =>
    {
      uiPorts.delete(uiPort);
    });

    uiPort.onMessage.addListener((message) =>
    {
      let [type, action] = message.type.split(".", 2);

      // For now we're only using long-lived connections for handling
      // "*.listen" messages to tackle #6440
      if (action == "listen")
      {
        listen(type, filters, message.filter);
      }
    });
  }

  browser.runtime.onConnect.addListener(onConnect);
})(this);
