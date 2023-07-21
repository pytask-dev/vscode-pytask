/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as utils from './utils';
import * as child from 'child_process';
import * as path from 'path';

const util = require('node:util');


// Settings for the pseudoterminal
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


var pytask_options : {[option : string] : any} = {
			'config':{
				type : 'string',
				short : 'c'
			},
			'capture':{
				type : 'string'
			},
			'database-create-db': {
				type : 'boolean'
			},
			'database-create-tables' : {
				type : 'boolean'
			},
			'database-filename' : {
				type : 'boolean'
			},
			'database-provider' : {
				type : 'string'
			},
			'debug-pytask' : {
				type : 'boolean'
			},
			'disable-warnings' : {
				type : 'boolean'
			},
			'dry-run' : {
				type : 'boolean'
			},
			'editor-url-scheme' : {
				type : 'string'
			},
			'force' : {
				type : 'boolean',
				short : 'f'
			},
			'ignore' : {
				type : 'boolean'
			},
			'expression' : {
				type : 'string',
				short : 'k'
			},
			'marker' : {
				type : 'string',
				short : 'm'
			},
			'max-failures' : {
				type : 'string'
			},
			'n-entries-in-table' : {
				type : 'string'
			},
			'pdb' : {
				type : 'boolean'
			},
			'show-capture' : {
				type : 'boolean'
			},
			'show-errors-immediately' : {
				type : 'boolean'
			},
			'show-locals' : {
				type : 'boolean'
			},
			'show-traceback' : {
				type : 'boolean'
			},
			'sort-table' : {
				type : 'boolean'
			},
			'strict-markers' : {
				type : 'boolean'
			},
			'trace' : {
				type : 'boolean'
			},
			'verbose' : {
				type : 'boolean',
				short : 'v'
			},
			'stop-after-first-failure' : {
				type : 'boolean',
				short : 'x'
			},
			};

// Cleanup inconsitent line breaks
const formatText = (text: string) => `${text.replace(/[\r\n]+/g,"\r\n")}`;

const pytaskTag = new vscode.TestTag('Pytask');

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pytask" is now active!');
	let disposable = vscode.commands.registerCommand('pytask.createDAG', () => {
		
		createDag();
	});
	
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
		watcher.onDidChange(uri => {if (uri.path.includes('task')){collctTasks();}}); // listen to files being changed
		watcher.onDidCreate(uri => {collctTasks();}); // listen to files/folders being created
		watcher.onDidDelete(uri => {collctTasks();}); // listen to files/folders getting deleted
	};
	controller.refreshHandler = async test => {
		collctTasks();
	};
	//Is used when the user starts a pytask run
	function runHandler(
		shouldDebug: boolean,
		request: vscode.TestRunRequest,
		token: vscode.CancellationToken
	  ) {
		if (request.include !== undefined){
			return;
		}
		if (shouldDebug === false){
			const run = controller.createTestRun(request,'Pytask',false);
			controller.items.forEach(test => {
				test.busy = true;
			});
			runPytask(run);
		} else {
			const run = controller.createTestRun(request,'Pytask',false);
			runPytask(run);
			debugTasks();
		}
	}
	// The Run Profile for Running all Tasks
	const runProfile = controller.createRunProfile(
		'Run Pytask',
		vscode.TestRunProfileKind.Run,
		(request, token) => {
		  runHandler(false, request, token);
		}
	);
	runProfile.tag = pytaskTag;
	//The Debug Profile for starting pytask in debug mode
	const debugProfile = controller.createRunProfile(
		'Debug Tasks',
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
		let myExtDirabs = vscode.extensions.getExtension("mj023.pytask")!.extensionPath;
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
				if (result.exitcode === 0) {
					let collection = [];
					for (const task of result.tasks) {
						let uri = vscode.Uri.file(task.path);
						let testitem = controller.createTestItem(task.name,task.name,uri);
						testitem.tags = [...testitem.tags, pytaskTag];
						console.log(testitem.tags);
						collection.push(testitem);
					}
					controller.items.replace(collection);
				}else {
					vscode.window.showErrorMessage("Pytask Failed during Collection: Look at the Output Channel for further Information.");
					channel.appendLine(result.message);
				}
				
				
				
			});
		});
	}
	//Run all Tasks
	async function runPytask(run : vscode.TestRun) {
		//Find the python interpreter
		let interpreter =  await utils.getInterpreter();
		let workingdirectory = "";
		let np = new child.ChildProcess;
		run.token.onCancellationRequested(() => {
			np.kill();
			run.appendOutput('Run cancelled.');
			run.end();
		});
		//Find the current working directory
		if(vscode.workspace.workspaceFolders !== undefined) {
			workingdirectory = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
			console.log(workingdirectory);

		} 
		else {
			let message = "Working folder not found, open a folder and try again" ;
			vscode.window.showErrorMessage(message);
			return;
		}
		//Find the plugins install location
		let myExtDirabs = vscode.extensions.getExtension("mj023.pytask")!.extensionPath;
		if (myExtDirabs === undefined){
			let message = "Could not find extension path!";
			vscode.window.showErrorMessage(message);
			return;
		}
		myExtDirabs = path.join(myExtDirabs, 'bundled','pytask_wrapper.py');
		//Run the Wrapper Script with the build command
		if (vscode.workspace.getConfiguration().get('pytask.enableCommandLineOptions') === 'textprompt' || vscode.workspace.getConfiguration().get('pytask.enableCommandLineOptions') === 'list'){
			
			var options:  any = {};

			if (vscode.workspace.getConfiguration().get('pytask.enableCommandLineOptions') === 'textprompt'){
				let commandLineArgs = vscode.window.showInputBox({
					placeHolder: "Command Line Arguments",
					prompt: "Provide the pytask options you want to use!"
				});
				commandLineArgs.then((args : string | undefined) => {
					if ( args !== undefined){
						let input = args.split(" ");
						if (input[0] !== ""){
							options = util.parseArgs({options : pytask_options, args: input}).values;
						};
					};
				});
			};
			if (vscode.workspace.getConfiguration().get('pytask.enableCommandLineOptions') === 'list'){
				let list = Object.keys(pytask_options);
				let selection = await vscode.window.showQuickPick(list, {canPickMany:true});
				if (selection !== undefined){
					for (let i = 0; i < selection.length; i++) {
						if (pytask_options[selection[i]].type === 'string'){
						let value =  await vscode.window.showInputBox({
							placeHolder: "Value",
							prompt: "Provide a value for " + selection[i]
						});
						if (value !== undefined && /^-?\d+$/.test(value)){
							options[selection[i]] = +value;
						} else if (value !== undefined){
							options[selection[i]] = value;
						};
						
						} else {
							options[selection[i]] = true;
						};
					};
				};					
	
				console.log(options);
				
			};
			
			np = child.execFile(interpreter, ['-Xutf8', path.resolve(myExtDirabs), 'build_options',JSON.stringify(options)], { cwd : workingdirectory, encoding: 'utf8'}, function(err,stdout,stderr){
				console.log(stderr);
				if (stderr.length >= 2) {
					vscode.window.showErrorMessage(stderr);
				}
				let result = JSON.parse(stdout);
				//Send Pytasks CLI Output to the VSCode Output channel
				run.appendOutput(formatText(result.message));
				channel.append(result.message);
				console.log(result.tasks);
				//Parse the Run results from pytask and send them to the Test API
				try {
					for (const task of result.tasks) {
						if (task.report !== 'TaskOutcome.FAIL' && task.report !== 'TaskOutcome.SKIP_PREVIOUS_FAILED'){
							run.passed(controller.items.get(task.name)!);
						} else if (task.report === 'TaskOutcome.FAIL') {
							run.failed(controller.items.get(task.name)!, new vscode.TestMessage('Failed!'));
						} else if (task.report === 'TaskOutcome.SKIP_PREVIOUS_FAILED'){
							run.failed(controller.items.get(task.name)!, new vscode.TestMessage('Skipped bedcause previous failed!'));
						};
					};
					run.end();
				} catch (error) {
					vscode.window.showErrorMessage('Script sent empty Report!');
					run.end();
				};
				
				
			});

		} else{
			const np = child.spawn(interpreter, ['-Xutf8', path.resolve(myExtDirabs), 'build'], { cwd : workingdirectory});
			np.stdout.setEncoding('utf-8');
			np.stderr.setEncoding('utf-8');
			np.stderr.on('data', (data) => {
				console.log(data);
				vscode.window.showErrorMessage(data);
			});
			np.stdout.on('data', (data) => {
				if(data === 'close'){
					run.end();
				} else{
					try {
						let result = JSON.parse(data);
						console.log(result);
						if (result.report !== 'TaskOutcome.FAIL' && result.report !== 'TaskOutcome.SKIP_PREVIOUS_FAILED'){
							run.passed(controller.items.get(result.name)!);
						} else if (result.report === 'TaskOutcome.FAIL') {
							run.failed(controller.items.get(result.name)!, new vscode.TestMessage('Failed!'));
						} else if (result.report === 'TaskOutcome.SKIP_PREVIOUS_FAILED'){
							run.failed(controller.items.get(result.name)!, new vscode.TestMessage('Skipped bedcause previous failed!'));
						};
					} catch (error) {
						console.log(error);
						run.end();
					}
				}
				
				
				
			});
		
				
		};
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
		
		//Find the install location of the plugin
		let myExtDirabs = vscode.extensions.getExtension("mj023.pytask")!.extensionPath;
		let myExtDir = path.parse(myExtDirabs);
		myExtDirabs = path.join(myExtDirabs, 'bundled','pytask_wrapper.py');
		console.log(myExtDir);
		let pythonextensionsetting = await vscode.workspace.getConfiguration().get('python.terminal.activateEnvironment');

		if (pythonextensionsetting === true){
			await vscode.workspace.getConfiguration().update('python.terminal.activateEnvironment', false, vscode.ConfigurationTarget.Global);
		}
		

		//When the Interpreter is found, start pytask in debug mode
		interpreter.then((value: string) => {
			
			//Spwan Pytask debugger
			const pytask = child.spawn(value, ['-Xutf8','-m','pytask', '--pdb'], { cwd : workingdirectory});
			//Catch stdout and send it to the writeEmitter of the Pseudoterminal
			pytask.stdout.on('data', (data) => {
				writeEmitter.fire(formatText(`${data}`));
			});
			pytask.stderr.on('data', (data) => {
				writeEmitter.fire(data);
			});
			//Define the Pseudoterminal
			const pty = {
				onDidWrite: writeEmitter.event,
				open: () => {},
				close: () => {},
				handleInput: async (char: string) => {
				switch (char) {
					case keys.enter:
						// preserve the run command line for history
						writeEmitter.fire(`\r\n`);
						// trim off leading default prompt
						const command = content.slice(defaultLine.length);
						try {
							pytask.stdin.write(`${command}\r\n`);
						} catch (error) {
							writeEmitter.fire(`error`);
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
			//Check if the Terminal is already open
			const term = utils.checkOpenTerminal(vscode.window.terminals);
			// If open => close and reopen
			if (term !== undefined){
				term.dispose();
			}
			const terminal = vscode.window.createTerminal({
			name: `Pytask Terminal`,
			pty,
			});
			terminal.show();
			
		});
		await vscode.workspace.getConfiguration().update('python.terminal.activateEnvironment',pythonextensionsetting , vscode.ConfigurationTarget.Global);
	}
	async function createDag() {
	}
	

}

// This method is called when your extension is deactivated
export function deactivate() {
}
