// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { NotesTreeDataProvider } from "./notesTreeData";
import { TodoPanelProvider } from "./todoPanel";
import * as fs from "fs";
import * as path from "path";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "paper-vscode" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "paper-vscode.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from paper-vscode!");
    }
  );

  const notesProvider = new NotesTreeDataProvider(context);

  vscode.window.createTreeView("notesView", {
    treeDataProvider: notesProvider,
  });

  const openNoteCommand = vscode.commands.registerCommand(
    "paper.openNote",
    (uri: vscode.Uri) => {
      vscode.workspace.openTextDocument(uri).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    }
  );

  const newNoteCommand = vscode.commands.registerCommand(
    "paper.newNote",
    () => {
      notesProvider.createNewNote();
    }
  );

  const deleteNoteCommand = vscode.commands.registerCommand(
    "paper.deleteNote",
    (item: vscode.TreeItem) => {
      const uri = item.resourceUri;
      if (!uri || !uri.fsPath) {
        vscode.window.showErrorMessage("No note selected.");
        return;
      }
      const fileName = uri.fsPath.split("/").pop();

      vscode.window
        .showWarningMessage(`Delete "${fileName}"?`, { modal: true }, "Delete")
        .then((answer) => {
          if (answer === "Delete") {
            fs.unlink(uri.fsPath, (err) => {
              if (err) {
                vscode.window.showErrorMessage(
                  `Failed to delete note: ${err.message}`
                );
              } else {
                vscode.window.showInformationMessage("Note deleted.");
                notesProvider.refresh();
              }
            });
          }
        });
    }
  );

  const renameNoteCommand = vscode.commands.registerCommand(
    "paper.renameNote",
    async (item: vscode.TreeItem) => {
      const uri = (item as any).resourceUri ?? item;

      if (!uri || !uri.fsPath) {
        vscode.window.showErrorMessage("No note selected.");
        return;
      }

      const oldPath = uri.fsPath;
      const oldName = path.basename(oldPath);

      const newName = await vscode.window.showInputBox({
        prompt: `Rename ${oldName} to...`,
        value: oldName,
        validateInput: (input) => {
          if (!input.trim()) {
            return "File name cannot be empty";
          }
          if (input.includes("/") || input.includes("\\")) {
            return "File name cannot contain slashes";
          }
          return null;
        },
      });

      if (!newName || newName === oldName) {
        return;
      }

      const newPath = path.join(path.dirname(oldPath), newName);

      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          vscode.window.showErrorMessage(`Rename failed: ${err.message}`);
        } else {
          vscode.window.showInformationMessage(`Renamed to ${newName}`);
          notesProvider.refresh();
        }
      });
    }
  );

  const todoProvider = new TodoPanelProvider(context);

  const todoView = vscode.window.registerWebviewViewProvider(
    "todoPanel",
    todoProvider
  );

  context.subscriptions.push(
    disposable,
    openNoteCommand,
    newNoteCommand,
    todoView,
    deleteNoteCommand
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
