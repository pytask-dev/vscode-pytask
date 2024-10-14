/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as utils from './utils';
import * as child from 'child_process';
import * as path from 'path';
import * as express from 'express';

const util = require('node:util');
const EventEmitter = require('node:events');


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

// List of possible command line options for pytask
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

// Function to cleanup inconsitent line breaks
const formatText = (text: string) => `${text.replace(/[\r\n]+/g,"\r\n")}`;

// Test Tag for tests created by the extension
const pytaskTag = new vscode.TestTag('Pytask');

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pytask" is now active!');
	let disposable = vscode.commands.registerCommand('pytask.createDAG', () => {

		createDag();
	});
	let RunEnd = new EventEmitter();
	const writeEmitter = new vscode.EventEmitter<string>();
	const controller = vscode.tests.createTestController(
		'pytask',
		'Pytask'
	);
	var current_run : vscode.TestRun;
	RunEnd.on('end', (data: any) => {current_run.end();});
	vscode.commands.executeCommand('testing.clearTestResults');
	//Creates the pytask channel, where the Pytask CLI Output will be displayed
	const channel = vscode.window.createOutputChannel("Pytask");
	const express = require('express');
	const bodyParser = require('body-parser');
	const app = express();
	var response_counter = 0;
	var all_reports_rec = false;
	var end_report = false;
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.post('/pytask/collect', (req: any, res: any) => {
		console.log(req.body);
		if (req.body.exitcode === "OK") {
			let collection = [];
			for (const task of req.body.tasks) {
				let uri = vscode.Uri.file(task.path);
				let testitem = controller.createTestItem(task.name,task.name,uri);
				testitem.tags = [...testitem.tags, pytaskTag];
				collection.push(testitem);
			}
			controller.items.replace(collection);
		}else {
			vscode.window.showErrorMessage("Pytask Failed during Collection: Look at the Output Channel for further Information.");
		}
		res.json({answer : 'res'});
	});
	app.post('/pytask/run', (req: any, res: any) => {
		try {

			let test = controller.items.get(req.body.name);
			if (req.body.outcome !== 'TaskOutcome.FAIL' && req.body.outcome !== 'TaskOutcome.SKIP_PREVIOUS_FAILED'){
				console.log(test);
				current_run.passed(test!);
			} else if (req.body.outcome === 'TaskOutcome.FAIL') {
				current_run.failed(test!, new vscode.TestMessage(req.body.exc_info));
			} else if (req.body.outcome === 'TaskOutcome.SKIP_PREVIOUS_FAILED'){
				current_run.failed(test!, new vscode.TestMessage('Skipped bedcause previous failed!'));
			};
			response_counter++;
			test!.busy = false;
		} catch (error) {
			console.log(error);
			RunEnd.emit('end');
		}
		console.log(response_counter);
		if (response_counter === controller.items.size){
			all_reports_rec = true;
			response_counter = 0;
		}
		if (all_reports_rec && end_report){
			RunEnd.emit('end');
			all_reports_rec = false;
			end_report = false;
		}
		res.json({answer : 'response'});
	});
	let server = app.listen(vscode.workspace.getConfiguration().get('pytask.port'),'localhost');
	vscode.workspace.onDidChangeConfiguration(e => {if(e.affectsConfiguration('pytask.port')){server = app.listen(vscode.workspace.getConfiguration().get('pytask.port'),'localhost');};});
	// Checks for tasks the first time the testing window is opened
	controller.resolveHandler = async test => {
		try {
			collctTasks();
		} catch (error) {
			vscode.window.showErrorMessage('The following Error occured during Collection: ' + error);
		}

		vscode.commands.executeCommand('testing.clearTestResults');
		const watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
		watcher.onDidChange(uri => {if (uri.path.includes('task')){collctTasks();}}); // listen to files being changed
		watcher.onDidCreate(uri => {if (uri.path.includes('task')){collctTasks();}}); // listen to files/folders being created
		watcher.onDidDelete(uri => {if (uri.path.includes('task')){collctTasks();}}); // listen to files/folders getting deleted
	};
	// Checks for tasks when the refresh button is clicked
	controller.refreshHandler = async test => {
		try {
			collctTasks();
		} catch (error:any) {
			vscode.window.showErrorMessage('The following Error occured during Collection: ' + error);
		}

	};
	//Is used when the user starts a pytask run
	function runHandler(
		shouldDebug: boolean,
		request: vscode.TestRunRequest,
		token: vscode.CancellationToken
	  ) {
		// Can't run single tests, therefore return
		if (request.include !== undefined){
			vscode.window.showErrorMessage('Unable to run single test, please use Run Button at the top.');
			return;
		}
		if (shouldDebug === false){
			vscode.commands.executeCommand('testing.clearTestResults');
			let run = controller.createTestRun(request,'Pytask');
			current_run = run;
			controller.items.forEach(test => {
				run.started(test);
			});
			try {
				runPytask(run);
			} catch (error:any) {
				vscode.window.showErrorMessage('The following Error occured during durin the Run: ' + error);
			}

		} else {
			let run = controller.createTestRun(request,'Pytask');
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
		let interpreter = await utils.getInterpreter();
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
		//When the Interpreter is found, check if the Pytask-VSCode Module is installed
		if (!utils.checkIfModulesInstalled(interpreter)){
			vscode.window.showErrorMessage('Pytask-Vscode is not installed in your current environment (' + await utils.getEnvName(interpreter) + ')');
			return;
		}
		// Start Pytask Collection
		const np = child.execFile(interpreter, ['-Xutf8', '-m', 'pytask', 'collect'], { cwd : workingdirectory, encoding: 'utf8', env : {...process.env, PYTASK_VSCODE: vscode.workspace.getConfiguration().get('pytask.port')}}, function(err,stdout,stderr){
			if (stderr.length > 2){
				vscode.window.showErrorMessage(stderr);
			}
			channel.appendLine(stdout);


		});
	}
	//Run all Tasks
	async function runPytask(run : vscode.TestRun) {
		//Find the python interpreter
		let interpreter =  await utils.getInterpreter();
		let response_counter = 0;
		if (!utils.checkIfModulesInstalled(interpreter)){
			run.end();
			vscode.window.showErrorMessage('Pytask-Vscode is not installed in your current environment (' + await utils.getEnvName(interpreter) + ')');
			return;
		}
		let workingdirectory = "";
		let np = new child.ChildProcess;
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
		// If one of the Option Modes is selected, promt user for options and create the command line string that will be passed to pytask
		if (vscode.workspace.getConfiguration().get('pytask.enableCommandLineOptions') === 'textprompt' || vscode.workspace.getConfiguration().get('pytask.enableCommandLineOptions') === 'list'){

			var options: string[] = [];

			if (vscode.workspace.getConfiguration().get('pytask.enableCommandLineOptions') === 'textprompt'){
				let commandLineArgs = await vscode.window.showInputBox({
					placeHolder: "Command Line Arguments",
					prompt: "Provide the pytask options you want to use!"
				});
				if (commandLineArgs !== undefined){
					options = commandLineArgs.split(' ');
				}
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
								if (pytask_options[selection[i]].short){
									options = options.concat(['-' + pytask_options[selection[i]].short, value]);
								} else {
									options = options.concat(['--' + selection[i], value]);
								}

							} else if (value !== undefined){
								if (pytask_options[selection[i]].short){
									options = options.concat(['-' + pytask_options[selection[i]].short, value]);
								} else {
									options = options.concat(['--' + selection[i], value]);
								}
							};

						} else {
							if (pytask_options[selection[i]].short){
								options = options.concat(['-' + pytask_options[selection[i]].short]);
							} else {
								options = options.concat(['--' + selection[i]]);
							}
						};
					};
				};

				console.log(options);

			};

			// Start Pytask
			np = child.execFile(interpreter, ['-Xutf8', '-m', 'pytask', 'build'].concat(options), { cwd : workingdirectory, encoding: 'utf8', env : {...process.env, PYTASK_VSCODE: vscode.workspace.getConfiguration().get('pytask.port')}}, function(err,stdout,stderr){

				if (stderr.length > 2){
					vscode.window.showErrorMessage(stderr);
					run.appendOutput('Run failed!');
				}
				channel.appendLine(stdout);
				run.appendOutput(formatText(stdout));
				while (response_counter !== controller.items.size){

				}
				run.end();
			});

		} else{

			run.token.onCancellationRequested(() => {
				np.kill();
				run.appendOutput('Run cancelled.\n');
				run.end();
				console.log('cancelled');

			});
			if (!run.token.isCancellationRequested){
				np = child.execFile(interpreter, ['-Xutf8', '-m', 'pytask', 'build'], { cwd : workingdirectory, encoding: 'utf8', env : {...process.env, PYTASK_VSCODE: vscode.workspace.getConfiguration().get('pytask.port')}}, function(err,stdout,stderr){
					if (stderr.length > 2){
						vscode.window.showErrorMessage(stderr);
					}
					console.log(stdout);
					channel.appendLine(stdout);
					run.appendOutput(formatText(stdout));
					end_report = true;
					if (all_reports_rec && end_report){
						RunEnd.emit('end');
						all_reports_rec = false;
						end_report = false;
					}
				});
			};
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
