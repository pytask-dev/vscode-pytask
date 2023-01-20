import * as vscode from 'vscode';


export class TaskProvider implements vscode.TreeDataProvider<Task> {
  onDidChangeTreeData?: vscode.Event<Task|null|undefined>|undefined;

  data: Task[];

  constructor(tasks : string) {
    let array = JSON.parse(tasks);
    this.data = [new Task('cars', )];
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

export class Task extends vscode.TreeItem {
  children: Task[]|undefined;

  constructor(label: string, children?: Task[]) {
    super(
        label,
        children === undefined ? vscode.TreeItemCollapsibleState.None :
                                 vscode.TreeItemCollapsibleState.Expanded);
    this.children = children;
  }
}

	