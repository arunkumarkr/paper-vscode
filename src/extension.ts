import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { NotesTreeDataProvider } from "./notesTreeData";
import { TodoPanelProvider } from "./todoPanel";
import { PaperStartupView } from "./paperStartupView";

export async function activate(context: vscode.ExtensionContext) {
  const folderPath = context.workspaceState.get<string>("notesDirectory");

  // Set VS Code context key
  vscode.commands.executeCommand(
    "setContext",
    "paper.folderSelected",
    !!folderPath
  );

  // No folder → Show startup view only
  if (!folderPath) {
    vscode.window.registerWebviewViewProvider(
      "paperStartupView",
      new PaperStartupView(context)
    );

    const selectNotesDir = vscode.commands.registerCommand(
      "paper.selectNotesDirectory",
      async () => {
        const result = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          openLabel: "Select Notes Folder",
        });

        if (!result || result.length === 0) return;

        await context.workspaceState.update("notesDirectory", result[0].fsPath);
        vscode.commands.executeCommand(
          "setContext",
          "paper.folderSelected",
          true
        );
        vscode.window.showInformationMessage("Notes folder set!");
        vscode.commands.executeCommand("workbench.action.reloadWindow");
      }
    );

    context.subscriptions.push(selectNotesDir);
    return;
  }

  // Folder is selected → Register Notes and Todo views
  const notesProvider = new NotesTreeDataProvider(context);
  vscode.window.createTreeView("notesView", {
    treeDataProvider: notesProvider,
  });

  const todoProvider = new TodoPanelProvider(context);
  vscode.window.registerWebviewViewProvider("todoPanel", todoProvider);

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

      const fileName = path.basename(uri.fsPath);
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
          if (!input.trim()) return "File name cannot be empty";
          if (input.includes("/") || input.includes("\\"))
            return "File name cannot contain slashes";
          return null;
        },
      });

      if (!newName || newName === oldName) return;

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

  const selectNotesDirectoryCommand = vscode.commands.registerCommand(
    "paper.selectNotesDirectory",
    async () => {
      const result = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        openLabel: "Select Notes Folder",
      });

      if (!result || result.length === 0) return;

      await context.workspaceState.update("notesDirectory", result[0].fsPath);
      vscode.commands.executeCommand(
        "setContext",
        "paper.folderSelected",
        true
      );
      vscode.window.showInformationMessage("Notes folder updated!");
      notesProvider.refresh();
    }
  );

  const resetNotesDirectoryCommand = vscode.commands.registerCommand(
    "paper.resetNotesDirectory",
    async () => {
      const confirmed = await vscode.window.showWarningMessage(
        "Are you sure you want to reset the notes folder?",
        { modal: true },
        "Reset"
      );

      if (confirmed === "Reset") {
        await context.workspaceState.update("notesDirectory", undefined);
        vscode.commands.executeCommand(
          "setContext",
          "paper.folderSelected",
          false
        );
        vscode.window.showInformationMessage("Notes folder has been reset.");
        vscode.commands.executeCommand("workbench.action.reloadWindow");
      }
    }
  );

  context.subscriptions.push(
    openNoteCommand,
    newNoteCommand,
    renameNoteCommand,
    deleteNoteCommand,
    selectNotesDirectoryCommand,
    resetNotesDirectoryCommand
  );
}

export function deactivate() {}
