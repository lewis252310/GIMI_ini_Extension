### For modder and normal user

Just keep reading.

### For developer

Please read other README at deeper folders.

---

## What is GIMI ini extension 

A famous anime game mod ini config file support extension

## Features

This is a simple extension so not have more features.

And it is still in development.

 - [x] Highlighting
 - [ ] Keyword range check
 - [ ] Simple keyword explanation
 - [x] Condition expression diagnostics

 - Auto completion
   - [x] In file variable
   - [x] Other file variable
   - [x] In file Section (specific case)
   - [ ] Other file Section
 - Buildin snippet
   - [x] Default section example
 - Code block floding
   - [x] Section
   - [x] If-else block
   - [ ] Comment
   - [ ] Convention comment separator
 - Hover message
   - [x] Section description
   - [ ] Variable description
 - Definition jump
   - [x] In file variable
   - [x] In file section
   - [x] Other file variable
   - [ ] Other file section


Static highlight preview.

![static_highlight](images/static_highlight_v1.png)


Comment position diagnostics.

![comment_diagnostic](images/comment_diagnostic.jpg)


<!-- Also section call diagnostics.

![section_call_diagnostic](images/section_call_diagnostic.jpg) -->


Keyword explanation preview, Default disabled.

![keyword explanation](images/hover_msg_v1.gif)


Auto completion for variable.

![auto_completion_variable](images/auto_completion_variable.gif)


Simple section snippets.

![section_snippets](images/section_snippets.gif)


Definition jump for variables and sections. If open as project (workspace), jumping between files is also supported.

![definition_jump_variable](images/definition_jump_variable.gif)

![definition_jump_section](images/definition_jump_section.gif)

![definition_jump_section_files](images/definition_jump_section_files.gif)


Code folding for section and `if else` block.

![code_folding](images/code_folding.gif)


A comment separation type, just like Markdown's horizontal line.

<!-- Of course more description on it. Leave a empty line above and below to work.

![separation_folding](images/separation_folding.jpg) -->


> Tip: No more image or animations from now.

## Version Requirements
 - VScode 1.91.0

## Requirements

 - Don't be rude
 - Don't make a big deal about it
 - Don't jump face with the official

## Extension Settings

Condition diagnostics enable/disable.

<!-- Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something. -->

## Known Issues

~~This extension is a piece of sh--~~

The following types of editing can starting make features get error.

 - Any editing when range is contain or on section title line
 - Quick copy lines (Both up and down).
 - Move line (Both up and down)

## How to fix any weird things?

It is very simple. Just restart VScode.

## Note

I need some color style suggestions, and tmLanguage token namespace regularization...

## Released

See [CHANGELOG](./CHANGELOG.md)

---

### Participants

 - SinsOfSeven 
 - LeoMods 
 - !someone name has 63B long? 

<!-- ## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!** -->
