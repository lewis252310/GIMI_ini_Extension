## What is GIMI ini extension

If you are modder or normal user, you should see [README.md](https://github.com/lewis252310/GIMI_ini_Extension/blob/main/README.md) on the upper level.

<!-- You want to asking why this url is not local?
Because when package vsce it will get ERROR -->

---

### About current folder level

This level is the real GIMI ini extension entrance.

So it is relatively correct to open the folder from the current layer.

But this way will lose the [json to yaml conversion](../building_tools/convertYamlJson.js) script.

---

### Attention

The compilation settings for TS are not fully automated.

Need run `npm: watch` task to call it processing on backgroung

And __**PLEASE**__ look [convertYamlJson.py](../building_tools/convertYamlJson.py) first.

That is a script can convert between YAML and JSON.

Builded this because YAML is more readable them JSON.

**This Script Will Override tmLanguage.json Which One Use On GIMI ini Every Debug Execute.**

Can change its default behavior in [launch.json](../.vscode/launch.json)'s `preLaunchTask`

And script running config is in [tasks.json](../.vscode/tasks.json)

---

Edit:

Changed to Python secipt, because ~~JS is suck~~.

In Python script, I changed default '>' mark of multiline strings value in yaml file processing

For now can correctly ignores all leading spaces and newlines

---

I think I should change this convert script to Python.

JS need some weird environment to install dependencies.

But I not sure how to make Python run automatically.