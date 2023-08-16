import * as vscode from 'vscode';
import { ProposedExtensionAPI } from './proposedApiTypes';
import * as child from 'child_process';
import { stderr } from 'process';

//This function uses the Python Plugins API to locate the currently selected python interpreter
export async function getInterpreter(): Promise<string> {
    const extension = vscode.extensions.getExtension('ms-python.python');
    let path;
    if (extension) {
        if (!extension.isActive) {
            await extension.activate();
        }
        const pythonApi: ProposedExtensionAPI = extension.exports as ProposedExtensionAPI;
        const environmentPath = pythonApi.environments.getActiveEnvironmentPath();
        const environment = await pythonApi.environments.resolveEnvironment(environmentPath);
        path = environment?.executable.uri?.fsPath;
    }
    if (path !== undefined) {
        return path;
    }else {
        vscode.window.showErrorMessage('No python interpreter found!');
        return 'undefined';
    }
        
    
}
export async function getEnvName(path:string) {
    const extension = vscode.extensions.getExtension('ms-python.python');
    let name;
    if (extension) {
        if (!extension.isActive) {
            await extension.activate();
        }
        const pythonApi: ProposedExtensionAPI = extension.exports as ProposedExtensionAPI;
        const environmentPath = pythonApi.environments.getActiveEnvironmentPath();
        const environment = await pythonApi.environments.resolveEnvironment(environmentPath);
        name = environment?.environment?.name;
    }
    if (name !== undefined) {
        return name;
    }else {
        return 'undefined';
    }
}
export function checkIfModulesInstalled(interpreter: string) : Boolean{
    const stdout = child.execSync(interpreter + " -m pip list");
        
    if (stdout.includes('pytask-vscode')){
        return true;
    };
    return false;
}
export function checkOpenTerminal(terminals: readonly vscode.Terminal[]): vscode.Terminal | undefined{
    let value;
    terminals.forEach(term => {
        if (term.name === 'Pytask Terminal'){
            value = term;
        }
    });
    return value;
}

