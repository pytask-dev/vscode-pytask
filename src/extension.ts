// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as utils from './utils';
import * as child from 'child_process';
import * as data from './TaskProvider';
import * as path from 'path';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pytask" is now active!');
	const controller = vscode.tests.createTestController(
		'pytask',
		'Pytask'
	  );
	controller.resolveHandler = async test => {
		if (!test) {
			let interpreter = utils.getInterpreter();
			let workingdirectory = "";
			if(vscode.workspace.workspaceFolders !== undefined) {
				workingdirectory = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
				console.log(workingdirectory);
	
			} 
			else {
				let message = "Working folder not found, open a folder and try again" ;
			
				vscode.window.showErrorMessage(message);
			}
			let myExtDirabs = vscode.extensions.getExtension("pytask.pytask")!.extensionPath;
			let myExtDir = path.parse(myExtDirabs);
			myExtDirabs = path.join(myExtDirabs, 'bundled','pytask_wrapper.py');
			console.log(myExtDir);
			interpreter.then((value: string) => {
				const np = child.execFile(value, ['-Xutf8', path.resolve(myExtDirabs)], { cwd : workingdirectory, encoding: 'utf8'}, function(err,stdout,stderr){
					console.log(stderr);
					if (stderr.length >= 2) {
						vscode.window.showErrorMessage(stderr);
					}
					let result = JSON.parse(stdout);
					channel.append(result.message);
					channel.append(result.tasks);
					for (const task of result.tasks) {
						let testitem = controller.createTestItem(task.name,task.name);
						controller.items.add(testitem);
					}
					
				});
			});
		
		}
	  };
	const channel = vscode.window.createOutputChannel("Pytask");
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	vscode.commands.registerCommand('pytask.onClick', (e) => data.onClick(e));
	let disposable = vscode.commands.registerCommand('pytask.build', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		let interpreter = utils.getInterpreter();
		let workingdirectory = "";
		if(vscode.workspace.workspaceFolders !== undefined) {
			workingdirectory = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
			console.log(workingdirectory);

		} 
		else {
			let message = "Working folder not found, open a folder and try again" ;
		
			vscode.window.showErrorMessage(message);
		}
		let myExtDirabs = vscode.extensions.getExtension("pytask.pytask")!.extensionPath;
		let myExtDir = path.parse(myExtDirabs);
		myExtDirabs = path.join(myExtDirabs, 'bundled','pytask_wrapper.py');
		console.log(myExtDir);
		interpreter.then((value: string) => {
			const np = child.execFile(value, ['-Xutf8', path.resolve(myExtDirabs)], { cwd : workingdirectory, encoding: 'utf8'}, function(err,stdout,stderr){
				console.log(stderr);
				if (stderr.length >= 2) {
					vscode.window.showErrorMessage(stderr);
				}
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
