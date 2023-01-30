import * as vscode from 'vscode';


export class TaskProvider implements vscode.TreeDataProvider<Task> {
  data: Task[];

  constructor(tasks: string) {
    let message = JSON.parse(tasks);
    let result = message.tasks;
    let list = [];
    for (const task of result) {
      list.push(new Task(task.name, task.path));
    }
    this.data = list;
  }
  getTreeItem(element: Task): vscode.TreeItem|Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: Task|undefined): vscode.ProviderResult<Task[]> {
    if (element === undefined) {
      return this.data;
    }
    return element.children;
  }
}
export function onClick(element : Task) {
  if (element.path !== undefined){
    let uri = vscode.Uri.file(element.path);
    let success = vscode.commands.executeCommand('vscode.open', uri);
  }else{
    vscode.window.showInformationMessage('err');
  }
}
export class Task extends vscode.TreeItem {
  children: Task[]|undefined;
  path : string|undefined;
  constructor(label: string, path? : string, children?: Task[]) {
    super(
        label,
        children === undefined ? vscode.TreeItemCollapsibleState.None :
                                 vscode.TreeItemCollapsibleState.Expanded);
    this.command = {'title': 'pytask.onClick','command':'pytask.onClick', arguments : [this]};
    this.iconPath = new vscode.ThemeIcon('pass');
    this.children = children;
    this.path = path;

  }
}

	