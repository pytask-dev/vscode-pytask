// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as utils from './utils';
import * as child from 'child_process';
import * as path from 'path';


// Settings
const defaultLine = "(Pdb++)";
const keys = {
  enter: "\r",
  backspace: "\x7f",
};
const actions = {
  cursorBack: "\x1b[D",
  deleteChar: "\x1b[P",
  clear: "\x1b[2J\x1b[3J\x1b[;H",
};

// cleanup inconsitent line breaks
const formatText = (text: string) => `${text.replace(/[\r\n]+/g,"\r\n")}`;


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pytask" is now active!');
	const writeEmitter = new vscode.EventEmitter<string>();
	const controller = vscode.tests.createTestController(
		'pytask',
		'Pytask'
	);
	vscode.commands.executeCommand('testing.clearTestResults');

	//Creates the pytask channel, where the Pytask CLI Output will be displayed
	const channel = vscode.window.createOutputChannel("Pytask");
	controller.resolveHandler = async test => {
		collctTasks();
		vscode.commands.executeCommand('testing.clearTestResults');
		const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
		watcher.onDidChange(uri => {collctTasks();}); // listen to files being changed
		watcher.onDidCreate(uri => {collctTasks();}); // listen to files/folders being created
		watcher.onDidDelete(uri => {collctTasks();}); // listen to files/folders getting deleted
	};
	controller.refreshHandler = async test => {
		collctTasks();
	};
	//Is used when a test is run
	function runHandler(
		shouldDebug: boolean,
		request: vscode.TestRunRequest,
		token: vscode.CancellationToken
	  ) {
		if (shouldDebug === false){
			const run = controller.createTestRun(request,'Pytask',false);
			runPytask(run);
		}
		if (shouldDebug === true){
			const run = controller.createTestRun(request,'Pytask',false);
			runPytask(run);
			debugTasks();
		}
	}
	// The Run Profile will be used when you want to run a test in VSCode
	const runProfile = controller.createRunProfile(
		'Run',
		vscode.TestRunProfileKind.Run,
		(request, token) => {
		  runHandler(false, request, token);
		}
	);

	const debugProfile = controller.createRunProfile(
		'Debug',
		vscode.TestRunProfileKind.Debug,
		(request, token) => {
		  runHandler(true, request, token);
		}
	  );

	// Collects all the Tasks to display them in the Test View
	async function collctTasks() {
		//Selecting the python interpreter
		let interpreter = utils.getInterpreter();
		let workingdirectory = "";
		//Find the folder that is currently opened
		if(vscode.workspace.workspaceFolders !== undefined) {
			workingdirectory = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
			console.log(workingdirectory);

		} 
		else {
			let message = "Working folder not found, open a folder and try again" ;
		
			vscode.window.showErrorMessage(message);
		}
		//Find the install location of the plugin
		let myExtDirabs = vscode.extensions.getExtension("pytask.pytask")!.extensionPath;
		if (myExtDirabs === undefined){
			let message = "Could not find extension path!";
			vscode.window.showErrorMessage(message);
		}
		let myExtDir = path.parse(myExtDirabs);
		myExtDirabs = path.join(myExtDirabs, 'bundled','pytask_wrapper.py');
		console.log(myExtDir);
		//When the Interpreter is found, run the Pytask Wrapper Script to collect the tasks
		interpreter.then((value: string) => {
			console.log(interpreter);
			const np = child.execFile(value, ['-Xutf8', path.resolve(myExtDirabs), 'dry'], { cwd : workingdirectory, encoding: 'utf8'}, function(err,stdout,stderr){
				console.log(stderr);
				if (stderr.length >= 2) {
					vscode.window.showErrorMessage(stderr);
				}
				//Parse the JSON that is printed to stdout by the wrapper script and add every task as a test item
				let result = JSON.parse(stdout);
				console.log(result);
				let collection = [];
				for (const task of result.tasks) {
					let uri = vscode.Uri.file(task.path);
					let testitem = controller.createTestItem(task.name,task.name,uri);
					collection.push(testitem);
				}
				controller.items.replace(collection);
			});
		});
	}
	//Run all Tasks
	function runPytask(run : vscode.TestRun) {
		//Find the python interpreter
		let interpreter = utils.getInterpreter();
		let workingdirectory = "";
		//Find the current working directory
		if(vscode.workspace.workspaceFolders !== undefined) {
			workingdirectory = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
			console.log(workingdirectory);

		} 
		else {
			let message = "Working folder not found, open a folder and try again" ;
		
			vscode.window.showErrorMessage(message);
		}
		//Find the plugins install location
		let myExtDirabs = vscode.extensions.getExtension("pytask.pytask")!.extensionPath;
		if (myExtDirabs === undefined){
			let message = "Could not find extension path!";
			vscode.window.showErrorMessage(message);
		}
		let myExtDir = path.parse(myExtDirabs);
		myExtDirabs = path.join(myExtDirabs, 'bundled','pytask_wrapper.py');
		//Run the Wrapper Script with the build command
		interpreter.then((value: string) => {
			const np = child.execFile(value, ['-Xutf8', path.resolve(myExtDirabs), 'build'], { cwd : workingdirectory, encoding: 'utf8'}, function(err,stdout,stderr){
				console.log(stderr);
				if (stderr.length >= 2) {
					vscode.window.showErrorMessage(stderr);
				}
				let result = JSON.parse(stdout);
				//Send Pytasks CLI Output to the VSCode Output channel
				channel.append(result.message);
				//Parse the Run results from pytask and send them to the Test API
				for (const task of result.tasks) {
					if (task.report !== 'TaskOutcome.FAIL' && task.report !== 'TaskOutcome.SKIP_PREVIOUS_FAILED'){
						run.passed(controller.items.get(task.name)!);
					} else {
						run.failed(controller.items.get(task.name)!, new vscode.TestMessage('failed'));
					}
				}
				run.end();
			});
		});
	}
	async function debugTasks() {
		//Selecting the python interpreter
		let interpreter = utils.getInterpreter();
		let workingdirectory = "";
		//Find the folder that is currently opened
		if(vscode.workspace.workspaceFolders !== undefined) {
			workingdirectory = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
			console.log(workingdirectory);

		} 
		else {
			let message = "Working folder not found, open a folder and try again" ;
		
			vscode.window.showErrorMessage(message);
		}
		let content = defaultLine;

		//When the Interpreter is found, start pytask in debug mode
		interpreter.then((value: string) => {
			
			try {
				const pytask = child.spawn(value, ['-Xutf8','-m','pytask', '--pdb'], { cwd : workingdirectory});
				//Catch pytask output and errors
				pytask.stdout.on('data', (data) => {
					writeEmitter.fire(formatText(`${data}`));
				});
				pytask.stderr.on('data', (data) => {
					vscode.window.showErrorMessage(data);
				});
				// Define the pseudoterminal used to communicate witch pytask
				const pty = {
					onDidWrite: writeEmitter.event,
					open: () => {},
					close: () => {},
					handleInput: async (char: string) => {
					switch (char) {
						case keys.enter:
							writeEmitter.fire(`\r\n`);
							// trim off leading default prompt
							const command = content.slice(defaultLine.length);
							// Send the user input to pytask
							try {
								pytask.stdin.write(`${command}\r\n`);
							} catch (error) {
								vscode.window.showErrorMessage("Error: Could not send command to pytask.");
							}
							content = defaultLine;
						case keys.backspace:
							if (content.length <= defaultLine.length) {
								return;
							}
							// remove last character
							content = content.substr(0, content.length - 1);
							writeEmitter.fire(actions.cursorBack);
							writeEmitter.fire(actions.deleteChar);
							return;
						default:
							// typing a new character
							content += char;
							writeEmitter.fire(char);
					}
					},
				};
				// Create the terminal instance
				const terminal = (<any>vscode.window).createTerminal({
					name: `Pytask Terminal`,
					pty,
				});
				terminal.show();
			} catch (error) {
				vscode.window.showErrorMessage("NodeError: Could not spawn Pytask");
			}
			

			
		});
	}
	

}

// This method is called when your extension is deactivated
export function deactivate() {
	
}
