# Pytask VS Code Extension
The Extension integrates Pytask into the VS Code Test Explorer. It will discover all tasks inside the current working folder and you will be able to run them all at once by clicking "Run Pytask" inside the Test Explorer UI. The pytask output from your run will appear inside the Pytask Output Channel. You can also use pytasks debug functionality by clicking on "Debug Tasks". This will make pytask stop and start debugging on the first error it encounters. Then a mock console will appear through which you can interact with the debugger.

![Screenshot 2023-05-09 152528](https://github.com/mj023/pytask_vscode/assets/29777594/916795cd-327b-4d76-bea0-5e6a30149f7a)

## Installation
1. Download the .vsix File
2. Open VS Code
3. Open the Extensions Tab
4. Click on "Views and More Actions..." (the three dots in the upper right corner)
5. Click "Install from VSIX"
6. Untick "Activate Python Environment in all Terminals created" ('python.terminal.activateEnvironment') in the python extensions settings to use the debugger

## Running the Extension
Requires VS Code Python Extension and a python environment that can run pytask.
