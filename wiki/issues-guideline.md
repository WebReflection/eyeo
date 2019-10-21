# Issues Guideline

This document aim is to define what is a [good issue](#definition-of-a-good-issue) and what is one [hard to deliver](#definition-of-a-hard-to-deliver-issue), where latter one could compromise planning, deadlines, but it also might add unnecessary confusion for developers, testers, designers, or product owners.

### Definition of a "good issue"

A good issue is one that reflects the following points:

  * the title is consistent with what's being implemented
  * the content of the issue description follows our templates steps
  * the specs are aligned with the required change, feature, or bug fix
  * there are no unrelated changes landing within the same issue or its related code

### Definition of a "hard to deliver" issue

Following the list of things that makes it harder to _track_, in terms of history, _test_, in terms of landed changes, or _complete_ an issue within the planned time:

  * UI changes sneaked in during discussions related to the issue
  * unrelated changes landing within the code related to the issue
  * sudden specs change that would make the issue irrelevant for its initial purpose

## Meta

  * is the issue in _implementation_ state?
  * does the title properly describe what is the change about?
  * are specs aligned with the issue proposed changes?
  * are sudden changes to specs, UI, or architecture, welcome?
  * are translations needed?

## Description

  * if the issue has **not** an _implementation_ label:
    * avoid any further step in this list until this point has been resolved
  * if the issue **title** does not reflect or describe landing changes:
    * improve the issue title to help testers, designers, or developers understand what is the issue about
    * avoid any further step in this list until this point has been resolved and start from the first step of this list once this step has been resolved
  * if the issue related **specs** are not aligned:
    * drop the _implementation_ label as it's clear the issue cannot be implemented in the current state
    * avoid any further step in this list until this point has been resolved and start from the first step of this list once this step has been resolved
  * if the issue implies **UI changes**:
    * ensure all screenshots or links related to such UI changes are available in the description
    * avoid any further step in this list until this point has been resolved and start from the first step of this list once this step has been resolved
  * if there are **UI changes** not strictly related to the issue itself:
    * implement the functionality with what's already available, and create a new ticket to explicit UI changes related to such functionality
    * the current issue would be eventually completed, and no other changes are steps are needed from this list.
  * if there are UI changes needed due **newly discovered issues** during implementation:
    * brainstorm and align specs with all necessary changes for the same issue.
    * if the issue becomes different from the current one, close it and create a new issue.
    * if the issue can be resolved keeping current title and description, move forward, otherwise revisit all steps of this list from the first one and, once all checked, move forward
  * if the implementation needs changes or updated translations:
    * add the label _Waiting to be Translated_ to the issue so it'll show up in the right board
  * once merged, flag the issue as _Feature QA_ ready

