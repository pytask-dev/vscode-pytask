import * as vscode from 'vscode';
import { ProposedExtensionAPI } from './proposedApiTypes';


async function getInterpreter(): Promise<string|undefined> {
    const extension = vscode.extensions.getExtension('ms-python.python');
    if (extension) {
        if (!extension.isActive) {
            await extension.activate();
        }
        const pythonApi: ProposedExtensionAPI = extension.exports as ProposedExtensionAPI;
        const environmentPath = pythonApi.environments.getActiveEnvironmentPath();
        const environment = await pythonApi.environments.resolveEnvironment(environmentPath);
        return environment?.executable.uri?.fsPath;
    }
}
export async function getPytaskCommand() : Promise<string>{
    let interpreter = await getInterpreter();
    return interpreter + " -m pytask";
}

