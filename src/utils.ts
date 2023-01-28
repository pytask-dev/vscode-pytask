import * as vscode from 'vscode';
import { ProposedExtensionAPI } from './proposedApiTypes';


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

