// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as utils from './utils';
import * as child from 'child_process';
import * as data from './TaskProvider';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pytask" is now active!');
	const channel = vscode.window.createOutputChannel("Pytask");
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('pytask.build', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		let interpreter = utils.getPytaskCommand();
		let workingdirectory = "";
		if(vscode.workspace.workspaceFolders !== undefined) {
			workingdirectory = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
			console.log(workingdirectory);

		} 
		else {
			let message = "YOUR-EXTENSION: Working folder not found, open a folder an try again" ;
		
			vscode.window.showErrorMessage(message);
		}
		let myExtDir = vscode.extensions.getExtension("pytask.pytask")!.extensionPath;
		console.log(myExtDir);
		interpreter.then((value: string) => {
			console.log(value);
			let args = value.split(' ');
			const np = child.execFile(args[0], ['-Xutf8', myExtDir + '\\bundled\\pytask_wrapper.py'], { cwd : workingdirectory, encoding: 'utf8'}, function(err,stdout,stderr){
				console.log(stderr);
				let result = JSON.parse(stdout);
				channel.append(result.message);
				vscode.window.registerTreeDataProvider('tasks', new data.TaskProvider(stdout));
			});
		  });
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
