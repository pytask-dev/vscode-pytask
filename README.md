# Pytask VS Code Extension
The Extension integrates Pytask into the VS Code Test Explorer. It will discover all tasks inside the current working folder and you will be able to run them all at once by clicking "Run Pytask" inside the Test Explorer UI. The result of each task will be updated once a task is finished. The Pytask Output will appear as the Result of the Test Run. You can select your preferred way to input command line options in the extension settings.

![Screenshot 2023-05-09 152528](https://github.com/mj023/pytask_vscode/assets/29777594/916795cd-327b-4d76-bea0-5e6a30149f7a)

## Installation
1. Search for Pytask in the Extension Marketplace and install it.
2. Add the pytask-vscode plugin from https://test.pypi.org/project/pytask-vscode/ to your python environment. Or use the pip command: ```pip install -i https://test.pypi.org/simple/ pytask-vscode```.

## Requirements
Requires VS Code Python Extension and a python environment that has pytask and pytask-vscode installed.
