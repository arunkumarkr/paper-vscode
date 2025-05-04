import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { INTERNAL_TODO_FILENAME } from "./constants";

export class NotesTreeDataProvider
  implements vscode.TreeDataProvider<NoteItem>
{
  private notesDir: string;
  private _onDidChangeTreeData: vscode.EventEmitter<
    NoteItem | undefined | void
  > = new vscode.EventEmitter<NoteItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<NoteItem | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {
    const notesPath = this.context.workspaceState.get<string>("notesDirectory");
    if (!notesPath) {
      throw new Error("Notes directory not set.");
    }
    this.notesDir = notesPath;

    if (!fs.existsSync(this.notesDir)) {
      fs.mkdirSync(this.notesDir, { recursive: true });
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: NoteItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<NoteItem[]> {
    const files = fs.readdirSync(this.notesDir).filter((file) => {
      const fullPath = path.join(this.notesDir, file);
      return fs.statSync(fullPath).isFile() && file !== INTERNAL_TODO_FILENAME;
    });
    const items = files.map((file) => {
      const filePath = path.join(this.notesDir, file);
      return new NoteItem(vscode.Uri.file(filePath));
    });
    return Promise.resolve(items);
  }

  createNewNote() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `note-${timestamp}.txt`;
    const filePath = path.join(this.notesDir, fileName);
    fs.writeFileSync(filePath, "", "utf8");
    this.refresh();
    vscode.workspace.openTextDocument(filePath).then((doc) => {
      vscode.window.showTextDocument(doc);
    });
  }
}

class NoteItem extends vscode.TreeItem {
  constructor(public readonly resourceUri: vscode.Uri) {
    super(resourceUri, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: "paper.openNote",
      title: "Open Note",
      arguments: [this.resourceUri],
    };

    this.contextValue = "noteItem";
  }
}
