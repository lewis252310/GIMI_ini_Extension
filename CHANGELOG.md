# Change Log

All notable changes to the "GIMI_ini_extension" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

Added:

Changed:

Deprecated:

Removed:

Fixed:

<!-- Security: -->

Experimental:


## [0.4.1]

Added:
 - More detailed conditional diagnostics support.
   - Logical NOT Operator
   - Numeric sign
 - More syntaxes, keyword highlight.
 - Condition diagnostics switch. 

Fixed:
 - Conditional diagnostics logic error.

Experimental:
 - Highlight for usable key and legaled value check. (Only `Key` section now)

## [0.4.0]

Change:
 - Internal parsing engine completely rebuild.
 Now can processed files with 30k+ lines, and still quickly.
 - Scope of single files and projects are properly detached

Added:
 - Better code diagnostics
   - key-value pair.
   - Namespace check.
   - Condition expression.
 - Better highlight colors.

Fixed:
 - When `key` keyword at Key section have `;` get wrong highlight

## [0.3.7-beta]

Added:
 - Project definition jump
    - Section
 - Code folding
    - Comment separation
 - Code snippets
    - Section `(8)`

Change:
 - Auto completion
    -  variable is better looking
 - Code snippets
    - section snippets now have range limits

## [0.2.2-beta]

Added:
 - Code highlight
 - Comment position check
 - Auto completion
    -  Variable
 - Definition jump
    - Variable
    - Section
 - Code folding
    - Section
    - `if else` block
 - Code snippets
    - Section `(7)`
    - `if else` block `(4)`
    - Hollow GIMI

## [0.2.1]

Added:
 - Variable auto completion
 - Variable and section definition jump
 - Diagnostic for illegal comment

## [0.1.0]

Very huge changes. They have tow types.
 1. Feasibility testing in progress:
   - Keyword range checking.
   - Keyword meaning hover tips.
 2. Already working:
   - The rules of tmLanguage has been change,
     including but not limited to nesting, area checking, possible range guessing.

## [0.0.1]

Initial builded of ...
