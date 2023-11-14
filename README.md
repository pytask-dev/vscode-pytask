# Pytask VS Code Extension
This Extension integrates Pytask into the VS Code Test Explorer. It collects all tasks in the currently opened folder and gives the user the ability to run them with the simple click of a button.

## Installation
1. Search for Pytask in the Extension View of VSCode and install the extension. Icon: ![Icon](doc/icon_ext.png) 
2. Use ```pip install -i https://test.pypi.org/simple/ pytask-vscode``` to install the pytask vscode plugin.

## First Steps

1. Open the folder that contains your pytask project in VSCode.
2. Select the python environment where you installed the plugin as your current interpreter.
3. Open VSCodes's Testing View. Icon: ![Icon](doc/icon_test.png)
4. Wait for the Tasks to load.
5. Click the Run Tests Button at the top of the Testing View.
6. Inspect the results in the Test Results Tab at the bottom. If you click on a failed Task, you will be shown a summary of what went wrong in that specific Task.

![Icon](doc/pytask_run.gif)

## Passing Command Line Arguments to Pytask


